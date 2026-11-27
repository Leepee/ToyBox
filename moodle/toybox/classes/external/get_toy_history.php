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
 * Earlier versions of a toy's code: the list, or one version's code.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_toy_history extends external_api {
    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'cmid' => new external_value(PARAM_INT, 'Course module id'),
            'toyid' => new external_value(PARAM_INT, 'Toy id'),
            'versionid' => new external_value(PARAM_INT, 'A version to fetch the code of (0 = just the list)', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * The versions, and the code of the one asked for.
     *
     * @param int $cmid
     * @param int $toyid
     * @param int $versionid
     * @return array
     */
    public static function execute(int $cmid, int $toyid, int $versionid = 0): array {
        global $DB;
        ['cmid' => $cmid, 'toyid' => $toyid, 'versionid' => $versionid] = self::validate_parameters(
            self::execute_parameters(),
            ['cmid' => $cmid, 'toyid' => $toyid, 'versionid' => $versionid]
        );
        [, $cm] = get_course_and_cm_from_cmid($cmid, 'toybox');
        $context = context_module::instance($cm->id);
        self::validate_context($context);
        require_capability('mod/toybox:edittoys', $context);
        $toy = $DB->get_record('toybox_toy', ['id' => $toyid, 'toyboxid' => $cm->instance], 'id', MUST_EXIST);
        $html = '';
        if ($versionid) {
            $html = (string) $DB->get_field('toybox_toy_history', 'html', ['id' => $versionid, 'toyid' => $toy->id], MUST_EXIST);
        }
        return ['versions' => toys::history($toy->id), 'html' => $html];
    }

    /**
     * Return value.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'versions' => new external_multiple_structure(new external_single_structure([
                'id' => new external_value(PARAM_INT, 'Version id'),
                'time' => new external_value(PARAM_INT, 'When it was saved'),
                'timestr' => new external_value(PARAM_TEXT, 'When it was saved, for people'),
                'who' => new external_value(PARAM_TEXT, 'Who saved it'),
                'hash' => new external_value(PARAM_ALPHANUM, 'Start of the SHA-1 of the code'),
            ])),
            'html' => new external_value(PARAM_RAW, 'The code of the version asked for'),
        ]);
    }
}
