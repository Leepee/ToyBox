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

$toylist = toys::get_toys($toybox->id);
$videourl = toys::video_url($toybox, $context);
$canedit = has_capability('mod/toybox:edittoys', $context);
$cansubmit = has_capability('mod/toybox:submit', $context, null, false) && !isguestuser();

$completion = new completion_info($course);
$complete = $completion->is_enabled($cm)
    && $completion->get_data($cm, false, $USER->id)->completionstate == COMPLETION_COMPLETE;

$config = [
    'cmid' => (int) $cm->id,
    'mode' => $toybox->mode,
    'aspect' => $toybox->aspect,
    'videoUrl' => $videourl,
    'sdkUrl' => (new moodle_url('/mod/toybox/sdk/toybox-sdk.js'))->out(false),
    'toys' => toys::export_for_js($toylist),
    'finished' => toys::finished_toy_ids($toybox->id, $USER->id),
    'canSubmit' => $cansubmit,
    'activityComplete' => $complete,
    'strings' => [
        'activitycomplete' => get_string('activitycomplete', 'toybox'),
        'finished' => get_string('finished', 'toybox'),
        'jumpto' => get_string('jumpto', 'toybox'),
        'optional' => get_string('optional', 'toybox'),
        'untitled' => get_string('untitled', 'toybox'),
        'toysinthisvideo' => get_string('toysinthisvideo', 'toybox'),
    ],
];

$notice = null;
if ($toybox->mode === 'video' && !$videourl) {
    $notice = get_string('novideo', 'toybox');
} else if (!$toylist && $toybox->mode === 'toy') {
    $notice = get_string($canedit ? 'notoyyet_teacher' : 'notoyyet', 'toybox');
}

$rootid = 'mod-toybox-' . $cm->id;
if (!$notice) {
    $PAGE->requires->js_call_amd('mod_toybox/view', 'init', ['#' . $rootid]);
}

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('mod_toybox/view', [
    'rootid' => $rootid,
    'notice' => $notice,
    'canedit' => $canedit,
    'editurl' => (new moodle_url('/mod/toybox/edit.php', ['id' => $cm->id]))->out(false),
    'notoys' => !$toylist,
    'istoy' => $toybox->mode === 'toy',
    'configjson' => json_encode($config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT),
]);
echo $OUTPUT->footer();
