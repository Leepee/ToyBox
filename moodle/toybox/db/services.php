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
 * Web service functions for ToyBox (used over AJAX by the player and the toy editor).
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    'mod_toybox_record_result' => [
        'classname' => 'mod_toybox\external\record_result',
        'description' => 'Records that the current user finished a toy, and updates activity completion.',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'mod/toybox:submit',
    ],
    'mod_toybox_save_toys' => [
        'classname' => 'mod_toybox\external\save_toys',
        'description' => 'Saves all toys (code, timing, position) of a ToyBox activity.',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'mod/toybox:edittoys',
    ],
];
