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

namespace mod_toybox\external;

use context_module;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Logs a view of a ToyBox shown on the course page (where there is no page to visit).
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class view_toybox extends external_api {
    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'cmid' => new external_value(PARAM_INT, 'Course module id'),
        ]);
    }

    /**
     * Triggers the viewed event and view completion.
     *
     * @param int $cmid
     * @return array
     */
    public static function execute(int $cmid): array {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/mod/toybox/lib.php');
        ['cmid' => $cmid] = self::validate_parameters(self::execute_parameters(), ['cmid' => $cmid]);
        [$course, $cm] = get_course_and_cm_from_cmid($cmid, 'toybox');
        $context = context_module::instance($cm->id);
        self::validate_context($context);
        require_capability('mod/toybox:view', $context);
        $toybox = $DB->get_record('toybox', ['id' => $cm->instance], '*', MUST_EXIST);
        toybox_view($toybox, $course, $cm, $context);
        return ['status' => true];
    }

    /**
     * Return value.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'status' => new external_value(PARAM_BOOL, 'Whether the view was logged'),
        ]);
    }
}
