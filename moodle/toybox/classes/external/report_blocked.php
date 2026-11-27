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
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use mod_toybox\local\toys;

/**
 * Logs that a toy tried to open another web page and was stopped.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class report_blocked extends external_api {
    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'cmid' => new external_value(PARAM_INT, 'Course module id'),
            'toyid' => new external_value(PARAM_INT, 'Toy id'),
        ]);
    }

    /**
     * Triggers the toy_blocked event.
     *
     * @param int $cmid
     * @param int $toyid
     * @return array
     */
    public static function execute(int $cmid, int $toyid): array {
        global $DB;
        ['cmid' => $cmid, 'toyid' => $toyid] = self::validate_parameters(
            self::execute_parameters(),
            ['cmid' => $cmid, 'toyid' => $toyid]
        );
        [, $cm] = get_course_and_cm_from_cmid($cmid, 'toybox');
        $context = context_module::instance($cm->id);
        self::validate_context($context);
        require_capability('mod/toybox:view', $context);
        $toy = $DB->get_record('toybox_toy', ['id' => $toyid, 'toyboxid' => $cm->instance], '*', MUST_EXIST);
        \mod_toybox\event\toy_blocked::create([
            'context' => $context,
            'objectid' => $toy->id,
            'other' => ['toyboxid' => (int) $toy->toyboxid],
        ])->trigger();
        return ['status' => true];
    }

    /**
     * Return value.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'status' => new external_value(PARAM_BOOL, 'Whether it was logged'),
        ]);
    }
}
