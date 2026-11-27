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

use completion_info;
use context_module;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use mod_toybox\local\toys;

/**
 * Records that the current user finished a toy.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class record_result extends external_api {
    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'cmid' => new external_value(PARAM_INT, 'Course module id'),
            'toyid' => new external_value(PARAM_INT, 'Toy id'),
            'result' => new external_value(PARAM_RAW, 'JSON result reported by the toy', VALUE_DEFAULT, 'null'),
        ]);
    }

    /**
     * Saves the result and updates completion.
     *
     * @param int $cmid
     * @param int $toyid
     * @param string $result
     * @return array
     */
    public static function execute(int $cmid, int $toyid, string $result = 'null'): array {
        global $DB, $USER;
        ['cmid' => $cmid, 'toyid' => $toyid, 'result' => $result] = self::validate_parameters(
            self::execute_parameters(),
            ['cmid' => $cmid, 'toyid' => $toyid, 'result' => $result]
        );

        [$course, $cm] = get_course_and_cm_from_cmid($cmid, 'toybox');
        $context = context_module::instance($cm->id);
        self::validate_context($context);
        require_capability('mod/toybox:submit', $context);

        $toy = $DB->get_record('toybox_toy', ['id' => $toyid, 'toyboxid' => $cm->instance], '*', MUST_EXIST);
        $stored = toys::record_result($toy, $USER->id, $result);
        if ($stored) {
            \mod_toybox\event\result_submitted::create([
                'context' => $context,
                'objectid' => $toy->id,
                'other' => ['toyboxid' => (int) $toy->toyboxid],
            ])->trigger();
        }

        $completion = new completion_info($course);
        $complete = false;
        if ($completion->is_enabled($cm)) {
            $complete = $completion->get_data($cm, false, $USER->id)->completionstate == COMPLETION_COMPLETE;
            if (!$complete && $stored) {
                $completion->update_state($cm, COMPLETION_UNKNOWN, $USER->id);
                $complete = $completion->get_data($cm, false, $USER->id)->completionstate == COMPLETION_COMPLETE;
            }
        }
        return ['saved' => true, 'activitycomplete' => $complete];
    }

    /**
     * Return value.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'saved' => new external_value(PARAM_BOOL, 'Whether the result was saved'),
            'activitycomplete' => new external_value(PARAM_BOOL, 'Whether the activity is now complete for this user'),
        ]);
    }
}
