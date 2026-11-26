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

$toylist = toys::get_toys($toybox->id);
$users = get_enrolled_users($context, 'mod/toybox:submit', 0, 'u.*', 'u.lastname, u.firstname');
$results = [];
foreach ($DB->get_records('toybox_result', ['toyboxid' => $toybox->id]) as $r) {
    $results[$r->userid][$r->toyid] = $r;
}

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('results', 'toybox'));

if (!$toylist || !$users) {
    echo $OUTPUT->notification(get_string($toylist ? 'noresults_users' : 'noresults_toys', 'toybox'), 'info');
} else {
    $table = new html_table();
    $table->attributes['class'] = 'generaltable mod-toybox-results';
    $table->head = [get_string('fullname')];
    foreach ($toylist as $t) {
        $table->head[] = format_string($t->label ?: get_string('untitled', 'toybox'))
            . ($t->required ? '' : ' <small class="text-muted">(' . get_string('optional', 'toybox') . ')</small>');
    }
    foreach ($users as $u) {
        $row = [fullname($u)];
        foreach ($toylist as $t) {
            $r = $results[$u->id][$t->id] ?? null;
            if (!$r) {
                $row[] = '<span class="text-muted">–</span>';
                continue;
            }
            $detail = s(\core_text::substr((string) $r->result, 0, 300));
            $attempts = $r->attempts > 1
                ? ' <small class="text-muted">(' . get_string('attempts', 'toybox', $r->attempts) . ')</small>'
                : '';
            $row[] = '<span class="text-success" title="' . $detail . '">✓</span> '
                . userdate($r->timemodified, get_string('strftimedatetimeshort', 'core_langconfig')) . $attempts;
        }
        $table->data[] = $row;
    }
    echo html_writer::table($table);
    echo html_writer::tag('p', get_string('resultshelp', 'toybox'), ['class' => 'text-muted small']);
}
echo $OUTPUT->footer();
