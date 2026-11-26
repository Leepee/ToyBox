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
use mod_toybox\local\toys;

/**
 * Saves all of an activity's toys from the toy editor.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class save_toys extends external_api {
    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'cmid' => new external_value(PARAM_INT, 'Course module id'),
            'aspect' => new external_value(PARAM_RAW, 'Toy-only box shape', VALUE_DEFAULT, '16:9'),
            'toys' => new external_value(PARAM_RAW, 'JSON array of toys'),
        ]);
    }

    /**
     * Saves the toys.
     *
     * @param int $cmid
     * @param string $aspect
     * @param string $toysjson
     * @return array
     */
    public static function execute(int $cmid, string $aspect, string $toysjson): array {
        global $DB;
        ['cmid' => $cmid, 'aspect' => $aspect, 'toys' => $toysjson] = self::validate_parameters(
            self::execute_parameters(),
            ['cmid' => $cmid, 'aspect' => $aspect, 'toys' => $toysjson]
        );

        [, $cm] = get_course_and_cm_from_cmid($cmid, 'toybox');
        $context = context_module::instance($cm->id);
        self::validate_context($context);
        require_capability('mod/toybox:edittoys', $context);

        $list = json_decode($toysjson, true);
        if (!is_array($list)) {
            throw new \invalid_parameter_exception('toys must be a JSON array');
        }
        $toybox = $DB->get_record('toybox', ['id' => $cm->instance], '*', MUST_EXIST);
        if (in_array($aspect, toys::ASPECTS, true) && $aspect !== $toybox->aspect) {
            $DB->set_field('toybox', 'aspect', $aspect, ['id' => $toybox->id]);
        }
        $saved = toys::save_all($toybox, $list);
        return ['toys' => json_encode(toys::export_for_js($saved))];
    }

    /**
     * Return value.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'toys' => new external_value(PARAM_RAW, 'JSON array of the saved toys, with their ids'),
        ]);
    }
}
