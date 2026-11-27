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
 * Restore structure for ToyBox.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Restores the activity, its toys and learner results.
 */
class restore_toybox_activity_structure_step extends restore_activity_structure_step {
    /**
     * Paths in the backup XML.
     *
     * @return array
     */
    protected function define_structure() {
        $paths = [
            new restore_path_element('toybox', '/activity/toybox'),
            new restore_path_element('toybox_toy', '/activity/toybox/toys/toy'),
        ];
        if ($this->get_setting_value('userinfo')) {
            $paths[] = new restore_path_element('toybox_result', '/activity/toybox/toys/toy/results/result');
        }
        return $this->prepare_activity_structure($paths);
    }

    /**
     * The activity.
     *
     * @param array $data
     */
    protected function process_toybox($data) {
        global $DB;
        $data = (object) $data;
        $data->course = $this->get_courseid();
        // Restored toys stay visible, but teachers are asked to look them over. Toys from another
        // Moodle site are held back from learners until a teacher has (duplicating and importing
        // within this site need neither).
        $task = $this->get_task();
        if (!$task->is_samesite()) {
            $data->restorereview = 2;
        } else if (($task->get_info()->mode ?? null) != backup::MODE_IMPORT) {
            $data->restorereview = 1;
        } else {
            $data->restorereview = 0;
        }
        $newid = $DB->insert_record('toybox', $data);
        $this->apply_activity_instance($newid);
    }

    /**
     * A toy.
     *
     * @param array $data
     */
    protected function process_toybox_toy($data) {
        global $DB;
        $data = (object) $data;
        $oldid = $data->id;
        $data->toyboxid = $this->get_new_parentid('toybox');
        $data->usermodified = $this->task->get_userid();
        $data->id = $DB->insert_record('toybox_toy', $data);
        $this->set_mapping('toybox_toy', $oldid, $data->id);
        \mod_toybox\local\toys::add_history($data);
    }

    /**
     * A learner result.
     *
     * @param array $data
     */
    protected function process_toybox_result($data) {
        global $DB;
        $data = (object) $data;
        $data->toyboxid = $this->get_new_parentid('toybox');
        $data->toyid = $this->get_new_parentid('toybox_toy');
        $data->userid = $this->get_mappingid('user', $data->userid);
        if ($data->userid) {
            $DB->insert_record('toybox_result', $data);
        }
    }

    /**
     * Restores files after the structure.
     */
    protected function after_execute() {
        $this->add_related_files('mod_toybox', 'intro', null);
        $this->add_related_files('mod_toybox', 'video', null);
    }
}
