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
 * The toy editor: write (or paste AI-generated) toy code and preview it live.
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
require_capability('mod/toybox:edittoys', $context);

$PAGE->set_url('/mod/toybox/edit.php', ['id' => $cm->id]);
$PAGE->set_title(get_string('edittoys', 'toybox') . ': ' . format_string($toybox->name));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_context($context);
$PAGE->add_body_class('mod-toybox-editpage');
$PAGE->activityheader->disable();

$strings = [];
foreach (
    ['addtoy', 'allsaved', 'aspect169', 'aspect43', 'aspect11', 'aspect34', 'aspectauto', 'badjson', 'checker',
        'copyaiprompt', 'copyaiprompt_help', 'deletetoy', 'deletetoyconfirm', 'downloadguide', 'end', 'height',
        'makewithai', 'messages', 'messageshelp', 'novideo', 'noproblems', 'pausevideo', 'posx', 'posy', 'preview',
        'previewing', 'promptcopied', 'promptfailed', 'replacecode', 'requiredtoy', 'resumeoncomplete', 'saved',
        'savechanges', 'downloadguide_help', 'onlinevideo', 'history', 'historyempty', 'restoreversionconfirm', 'codelocked',
        'badtoyfile', 'exported', 'exporttoy', 'exporttoy_help', 'importconfirm', 'imported', 'importtoy', 'importtoy_help',
        'shape', 'start', 'startfrom', 'starthere', 'starthere_help', 'toy', 'toycode', 'toylabel',
        'toyparams', 'unsaved', 'untitled', 'width'] as $key
) {
    $strings[$key] = get_string('editor_' . $key, 'toybox');
}

$config = [
    'cmid' => (int) $cm->id,
    'mode' => $toybox->mode,
    'aspect' => $toybox->aspect,
    'codeLocked' => (bool) get_config('mod_toybox', 'bundledonly'),
    'theme' => get_config('mod_toybox', 'theme') ?: 'auto',
    'videoUrl' => toys::video_url($toybox, $context),
    'sdkUrl' => (new moodle_url('/mod/toybox/sdk/toybox-sdk.js'))->out(false),
    'pluginUrl' => (new moodle_url('/mod/toybox/'))->out(false),
    'guideUrl' => (new moodle_url('/mod/toybox/guide/toybox-toy-guide.md'))->out(false),
    'toys' => toys::export_for_js(toys::get_toys($toybox->id)),
    'strings' => $strings,
];

$rootid = 'mod-toybox-editor-' . $cm->id;
$PAGE->requires->js_call_amd('mod_toybox/editor', 'init', ['#' . $rootid]);

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('edittoys', 'toybox') . ': ' . format_string($toybox->name));
echo $OUTPUT->render_from_template('mod_toybox/editor', [
    'rootid' => $rootid,
    'intro' => get_string($toybox->mode === 'toy' ? 'editorintro_toy' : 'editorintro_video', 'toybox'),
    'viewurl' => (new moodle_url('/mod/toybox/view.php', ['id' => $cm->id]))->out(false),
    'configjson' => json_encode($config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT),
]);
echo $OUTPUT->footer();
