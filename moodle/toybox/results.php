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

/**
 * Who has finished which toys.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

use mod_toybox\local\results;
use mod_toybox\local\toys;

$id = required_param('id', PARAM_INT);
[$course, $cm] = get_course_and_cm_from_cmid($id, 'toybox');
$toybox = $DB->get_record('toybox', ['id' => $cm->instance], '*', MUST_EXIST);

require_login($course, false, $cm);
$context = context_module::instance($cm->id);
require_capability('mod/toybox:viewresults', $context);

$PAGE->set_url('/mod/toybox/results.php', ['id' => $cm->id]);
$PAGE->set_title(get_string('results', 'toybox') . ': ' . format_string($toybox->name));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_context($context);

$page = optional_param('page', 0, PARAM_INT);
$toylist = toys::get_toys($toybox->id, false);

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('results', 'toybox'));
groups_print_activity_menu($cm, $PAGE->url);

$groupid = results::visible_group($cm, $context);
[$users, $total] = $groupid === null ? [[], 0] : results::learners($context, $groupid, $page);

if (!$toylist || !$users) {
    $message = !$toylist ? 'noresults_toys' : ($groupid === null ? 'noresults_nogroup' : 'noresults_users');
    echo $OUTPUT->notification(get_string($message, 'toybox'), 'info');
} else {
    $byuser = results::for_learners($toybox->id, array_column($users, 'id'));
    $dateformat = get_string('strftimedatetimeshort', 'core_langconfig');
    $data = ['toys' => [], 'rows' => []];
    foreach ($toylist as $t) {
        $data['toys'][] = [
            'label' => format_string($t->label ?: get_string('untitled', 'toybox'), true, ['context' => $context]),
            'optional' => !$t->required,
        ];
    }
    foreach ($users as $u) {
        $cells = [];
        foreach ($toylist as $t) {
            $r = $byuser[$u->id][$t->id] ?? null;
            $cells[] = $r ? [
                'done' => true,
                'detail' => \core_text::substr((string) $r->result, 0, 300),
                'when' => userdate($r->timemodified, $dateformat),
                'attempts' => $r->attempts > 1 ? get_string('attempts', 'toybox', $r->attempts) : '',
            ] : ['done' => false];
        }
        $data['rows'][] = ['name' => fullname($u), 'cells' => $cells];
    }
    echo $OUTPUT->render_from_template('mod_toybox/results', $data);
    echo $OUTPUT->paging_bar($total, $page, results::PER_PAGE, $PAGE->url);
    echo html_writer::tag('p', get_string('resultshelp', 'toybox'), ['class' => 'text-muted small']);
}
echo $OUTPUT->footer();
