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


namespace mod_toybox\event;

/**
 * The toys of a ToyBox activity were saved. "hash" fingerprints all of their code, so a log shows exactly when code changed.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class toys_saved extends \core\event\base {
    /**
     * Init.
     */
    protected function init() {
        $this->data['objecttable'] = 'toybox';
        $this->data['crud'] = 'u';
        $this->data['edulevel'] = self::LEVEL_TEACHING;
    }

    /**
     * Name of the event.
     *
     * @return string
     */
    public static function get_name() {
        return get_string('event_toys_saved', 'toybox');
    }

    /**
     * What happened, for the logs.
     *
     * @return string
     */
    public function get_description() {
        $o = $this->other;
        return "The user with id '$this->userid' saved the toys of the ToyBox with course module id '$this->contextinstanceid' "
            . "({$o['toys']} toys, {$o['changed']} with changed code, {$o['deleted']} deleted; code fingerprint {$o['hash']}).";
    }

    /**
     * Where to look.
     *
     * @return \moodle_url
     */
    public function get_url() {
        return new \moodle_url('/mod/toybox/view.php', ['id' => $this->contextinstanceid]);
    }

    /**
     * Mapping for restoring logs.
     *
     * @return array
     */
    public static function get_objectid_mapping() {
        return ['db' => 'toybox', 'restore' => 'toybox'];
    }

    /**
     * Mapping of "other" for restoring logs.
     *
     * @return array|false
     */
    public static function get_other_mapping() {
        return false;
    }
}
