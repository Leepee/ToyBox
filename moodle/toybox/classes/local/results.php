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


namespace mod_toybox\local;

use context_module;
use stdClass;

/**
 * Who can see which learners' results, and fetching them a page at a time.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class results {
    /** @var int Learners per page. */
    public const PER_PAGE = 50;

    /**
     * The group whose results the current user may see.
     *
     * @param \cm_info|stdClass $cm
     * @param context_module $context
     * @return int|null A group id, 0 for everyone, or null if they may see no one
     *                  (separate groups, and they're in none).
     */
    public static function visible_group($cm, context_module $context): ?int {
        $groupid = (int) groups_get_activity_group($cm, true);
        if (
            !$groupid
            && groups_get_activity_groupmode($cm) == SEPARATEGROUPS
            && !has_capability('moodle/site:accessallgroups', $context)
        ) {
            return null;
        }
        return $groupid;
    }

    /**
     * One page of the learners (people who can finish toys) in a group, by name.
     *
     * @param context_module $context
     * @param int $groupid 0 for everyone
     * @param int $page From 0
     * @param int $perpage
     * @return array{0: stdClass[], 1: int} The learners (id and name fields only) and how many there are in all
     */
    public static function learners(context_module $context, int $groupid, int $page = 0, int $perpage = self::PER_PAGE): array {
        global $DB;
        [$esql, $params] = get_enrolled_sql($context, 'mod/toybox:submit', $groupid, true);
        $total = $DB->count_records_sql("SELECT COUNT(1) FROM ($esql) e", $params);
        $names = \core_user\fields::for_name()->get_sql('u', false, '', '', false)->selects;
        $users = $DB->get_records_sql(
            "SELECT u.id, $names
               FROM {user} u
               JOIN ($esql) e ON e.id = u.id
           ORDER BY u.lastname, u.firstname, u.id",
            $params,
            $page * $perpage,
            $perpage
        );
        return [array_values($users), $total];
    }

    /**
     * The results of the given learners, by learner then toy.
     *
     * @param int $toyboxid
     * @param int[] $userids
     * @return array<int, array<int, stdClass>>
     */
    public static function for_learners(int $toyboxid, array $userids): array {
        global $DB;
        if (!$userids) {
            return [];
        }
        [$insql, $params] = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED);
        $params['toyboxid'] = $toyboxid;
        $out = [];
        $rows = $DB->get_records_select(
            'toybox_result',
            "toyboxid = :toyboxid AND userid $insql",
            $params,
            '',
            'id, userid, toyid, result, attempts, timemodified'
        );
        foreach ($rows as $r) {
            $out[$r->userid][$r->toyid] = $r;
        }
        return $out;
    }
}
