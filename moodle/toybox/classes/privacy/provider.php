<?php
// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

namespace mod_toybox\privacy;

use core_privacy\local\metadata\collection;
use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\approved_userlist;
use core_privacy\local\request\contextlist;
use core_privacy\local\request\helper;
use core_privacy\local\request\transform;
use core_privacy\local\request\userlist;
use core_privacy\local\request\writer;

/**
 * Privacy (GDPR) provider: ToyBox stores each learner's toy results.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider implements
    \core_privacy\local\metadata\provider,
    \core_privacy\local\request\core_userlist_provider,
    \core_privacy\local\request\plugin\provider {
    /**
     * Describes the stored personal data.
     *
     * @param collection $collection
     * @return collection
     */
    public static function get_metadata(collection $collection): collection {
        $collection->add_database_table('toybox_result', [
            'userid' => 'privacy:metadata:toybox_result:userid',
            'toyid' => 'privacy:metadata:toybox_result:toyid',
            'result' => 'privacy:metadata:toybox_result:result',
            'attempts' => 'privacy:metadata:toybox_result:attempts',
            'timecreated' => 'privacy:metadata:toybox_result:timecreated',
            'timemodified' => 'privacy:metadata:toybox_result:timemodified',
        ], 'privacy:metadata:toybox_result');
        $collection->add_database_table('toybox_toy', [
            'usermodified' => 'privacy:metadata:toybox_toy:usermodified',
            'timemodified' => 'privacy:metadata:toybox_toy:timemodified',
        ], 'privacy:metadata:toybox_toy');
        $collection->add_database_table('toybox_toy_history', [
            'usermodified' => 'privacy:metadata:toybox_toy_history:usermodified',
            'html' => 'privacy:metadata:toybox_toy_history:html',
            'timecreated' => 'privacy:metadata:toybox_toy_history:timecreated',
        ], 'privacy:metadata:toybox_toy_history');
        // Videos from these sites play in the learner's browser, straight from the site.
        foreach (['youtube', 'vimeo', 'panopto'] as $site) {
            $collection->add_external_location_link($site, [
                'ipaddress' => 'privacy:metadata:external:ipaddress',
                'video' => 'privacy:metadata:external:video',
            ], 'privacy:metadata:external:' . $site);
        }
        return $collection;
    }

    /**
     * Contexts where a user has data.
     *
     * @param int $userid
     * @return contextlist
     */
    public static function get_contexts_for_userid(int $userid): contextlist {
        $sql = "SELECT c.id
                  FROM {context} c
                  JOIN {course_modules} cm ON cm.id = c.instanceid AND c.contextlevel = :contextlevel
                  JOIN {modules} m ON m.id = cm.module AND m.name = 'toybox'
                 WHERE EXISTS (SELECT 1 FROM {toybox_result} r WHERE r.toyboxid = cm.instance AND r.userid = :u1)
                    OR EXISTS (SELECT 1 FROM {toybox_toy} t WHERE t.toyboxid = cm.instance AND t.usermodified = :u2)
                    OR EXISTS (SELECT 1 FROM {toybox_toy_history} h WHERE h.toyboxid = cm.instance AND h.usermodified = :u3)";
        $list = new contextlist();
        $list->add_from_sql($sql, ['contextlevel' => CONTEXT_MODULE, 'u1' => $userid, 'u2' => $userid, 'u3' => $userid]);
        return $list;
    }

    /**
     * Users with data in a context.
     *
     * @param userlist $userlist
     */
    public static function get_users_in_context(userlist $userlist) {
        $context = $userlist->get_context();
        if (!$context instanceof \context_module) {
            return;
        }
        foreach (['toybox_result' => 'userid', 'toybox_toy' => 'usermodified', 'toybox_toy_history' => 'usermodified'] as $table => $field) {
            $sql = "SELECT x.$field AS userid
                      FROM {course_modules} cm
                      JOIN {modules} m ON m.id = cm.module AND m.name = 'toybox'
                      JOIN {{$table}} x ON x.toyboxid = cm.instance
                     WHERE cm.id = :cmid AND x.$field <> 0";
            $userlist->add_from_sql('userid', $sql, ['cmid' => $context->instanceid]);
        }
    }

    /**
     * Exports a user's results.
     *
     * @param approved_contextlist $contextlist
     */
    public static function export_user_data(approved_contextlist $contextlist) {
        global $DB;
        $userid = $contextlist->get_user()->id;
        foreach ($contextlist->get_contexts() as $context) {
            if (!$context instanceof \context_module) {
                continue;
            }
            $cm = get_coursemodule_from_id('toybox', $context->instanceid);
            if (!$cm) {
                continue;
            }
            $rows = $DB->get_records_sql("SELECT r.*, t.label
                                            FROM {toybox_result} r
                                            JOIN {toybox_toy} t ON t.id = r.toyid
                                           WHERE r.toyboxid = ? AND r.userid = ?
                                        ORDER BY t.sortorder", [$cm->instance, $userid]);
            $edits = $DB->get_records_sql("SELECT h.id, h.label, h.timecreated
                                             FROM {toybox_toy_history} h
                                            WHERE h.toyboxid = ? AND h.usermodified = ?
                                         ORDER BY h.timecreated", [$cm->instance, $userid]);
            if (!$rows && !$edits) {
                continue;
            }
            $results = [];
            foreach ($rows as $r) {
                $results[] = [
                    'toy' => $r->label,
                    'result' => json_decode((string) $r->result),
                    'attempts' => $r->attempts,
                    'timecreated' => transform::datetime($r->timecreated),
                    'timemodified' => transform::datetime($r->timemodified),
                ];
            }
            $data = helper::get_context_data($context, $contextlist->get_user());
            if ($results) {
                $data->results = $results;
            }
            if ($edits) {
                $data->toyedits = array_values(array_map(fn($h) => [
                    'toy' => $h->label,
                    'time' => transform::datetime($h->timecreated),
                ], $edits));
            }
            writer::with_context($context)->export_data([], $data);
            helper::export_context_files($context, $contextlist->get_user());
        }
    }

    /**
     * Deletes everyone's results in a context.
     *
     * @param \context $context
     */
    public static function delete_data_for_all_users_in_context(\context $context) {
        global $DB;
        if (!$context instanceof \context_module) {
            return;
        }
        if ($cm = get_coursemodule_from_id('toybox', $context->instanceid)) {
            $DB->delete_records('toybox_result', ['toyboxid' => $cm->instance]);
            // The toys are course content, so they stay; only who changed them is forgotten.
            $DB->set_field('toybox_toy', 'usermodified', 0, ['toyboxid' => $cm->instance]);
            $DB->set_field('toybox_toy_history', 'usermodified', 0, ['toyboxid' => $cm->instance]);
        }
    }

    /**
     * Deletes one user's results in the given contexts.
     *
     * @param approved_contextlist $contextlist
     */
    public static function delete_data_for_user(approved_contextlist $contextlist) {
        global $DB;
        $userid = $contextlist->get_user()->id;
        foreach ($contextlist->get_contexts() as $context) {
            if ($context instanceof \context_module && ($cm = get_coursemodule_from_id('toybox', $context->instanceid))) {
                $DB->delete_records('toybox_result', ['toyboxid' => $cm->instance, 'userid' => $userid]);
                $where = ['toyboxid' => $cm->instance, 'usermodified' => $userid];
                $DB->set_field('toybox_toy', 'usermodified', 0, $where);
                $DB->set_field('toybox_toy_history', 'usermodified', 0, $where);
            }
        }
    }

    /**
     * Deletes several users' results in one context.
     *
     * @param approved_userlist $userlist
     */
    public static function delete_data_for_users(approved_userlist $userlist) {
        global $DB;
        $context = $userlist->get_context();
        if (!$context instanceof \context_module || !($cm = get_coursemodule_from_id('toybox', $context->instanceid))) {
            return;
        }
        [$insql, $params] = $DB->get_in_or_equal($userlist->get_userids(), SQL_PARAMS_NAMED);
        $params['toyboxid'] = $cm->instance;
        $DB->delete_records_select('toybox_result', "toyboxid = :toyboxid AND userid $insql", $params);
        foreach (['toybox_toy', 'toybox_toy_history'] as $table) {
            $DB->set_field_select($table, 'usermodified', 0, "toyboxid = :toyboxid AND usermodified $insql", $params);
        }
    }
}
