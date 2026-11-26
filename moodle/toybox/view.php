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
 * Shows a ToyBox activity: the video with its toys, or the toy on its own.
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

require_login($course, true, $cm);
$context = context_module::instance($cm->id);
require_capability('mod/toybox:view', $context);
toybox_view($toybox, $course, $cm, $context);

$PAGE->set_url('/mod/toybox/view.php', ['id' => $cm->id]);
$PAGE->set_title(format_string($toybox->name));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_context($context);

echo $OUTPUT->header();
echo toys::render($toybox, $cm, $context, 'page');

if (has_capability('mod/toybox:edittoys', $context)) {
    $embedurl = new moodle_url('/mod/toybox/embed.php', ['id' => $cm->id]);
    $ratio = $toybox->mode === 'toy' && $toybox->aspect !== 'auto' ? str_replace(':', ' / ', $toybox->aspect) : '16 / 10';
    $iframe = '<iframe src="' . $embedurl->out(false) . '" title="' . s(format_string($toybox->name)) .
        '" style="width:100%;aspect-ratio:' . $ratio . ';border:0" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    echo $OUTPUT->render_from_template('mod_toybox/embedcode', ['code' => $iframe]);
}
echo $OUTPUT->footer();
