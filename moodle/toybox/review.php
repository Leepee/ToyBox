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
 * Marks restored toys as reviewed, so the notice goes (and learners see toys from another site).
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

$id = required_param('id', PARAM_INT);
[$course, $cm] = get_course_and_cm_from_cmid($id, 'toybox');
require_login($course, false, $cm);
$context = context_module::instance($cm->id);
require_capability('mod/toybox:edittoys', $context);
require_sesskey();

$DB->set_field('toybox', 'restorereview', 0, ['id' => $cm->instance]);
redirect(
    new moodle_url('/mod/toybox/view.php', ['id' => $cm->id]),
    get_string('reviewed', 'toybox'),
    null,
    \core\output\notification::NOTIFY_SUCCESS
);
