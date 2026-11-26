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
 * Just the toy (or video with toys), with no Moodle page around it, for use in an iframe.
 *
 * Embedding Moodle pages on other sites needs "Allow frame embedding" switched on
 * (Site administration > Security > HTTP security). Within Moodle itself it works as is.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

$id = required_param('id', PARAM_INT);
[$course, $cm] = get_course_and_cm_from_cmid($id, 'toybox');
$toybox = $DB->get_record('toybox', ['id' => $cm->instance], '*', MUST_EXIST);

require_login($course, true, $cm);
$context = context_module::instance($cm->id);
require_capability('mod/toybox:view', $context);
toybox_view($toybox, $course, $cm, $context);

$PAGE->set_url('/mod/toybox/embed.php', ['id' => $cm->id]);
$PAGE->set_title(format_string($toybox->name));
$PAGE->set_context($context);
$PAGE->set_pagelayout('embedded');
$PAGE->add_body_class('mod-toybox-embedpage');

echo $OUTPUT->header();
echo \mod_toybox\local\toys::render($toybox, $cm, $context, 'embed');
echo $OUTPUT->footer();
