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
 * Backup structure for ToyBox.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Defines the backed-up data: the activity, its toys and (with user data) learner results.
 */
class backup_toybox_activity_structure_step extends backup_activity_structure_step {
    /**
     * Structure.
     *
     * @return backup_nested_element
     */
    protected function define_structure() {
        $userinfo = $this->get_setting_value('userinfo');

        $toybox = new backup_nested_element('toybox', ['id'], [
            'name', 'intro', 'introformat', 'mode', 'videosource', 'videourl', 'aspect',
            'completionrequired', 'timecreated', 'timemodified']);
        $toys = new backup_nested_element('toys');
        $toy = new backup_nested_element('toy', ['id'], [
            'sortorder', 'label', 'html', 'params', 'starttime', 'endtime', 'posx', 'posy', 'width', 'height',
            'pausevideo', 'resumeoncomplete', 'required', 'timecreated', 'timemodified']);
        $results = new backup_nested_element('results');
        $result = new backup_nested_element('result', ['id'], [
            'userid', 'result', 'attempts', 'timecreated', 'timemodified']);

        $toybox->add_child($toys);
        $toys->add_child($toy);
        $toy->add_child($results);
        $results->add_child($result);

        $toybox->set_source_table('toybox', ['id' => backup::VAR_ACTIVITYID]);
        $toy->set_source_table('toybox_toy', ['toyboxid' => backup::VAR_PARENTID], 'sortorder ASC');
        if ($userinfo) {
            $result->set_source_table('toybox_result', ['toyid' => backup::VAR_PARENTID]);
        }
        $result->annotate_ids('user', 'userid');

        $toybox->annotate_files('mod_toybox', 'intro', null);
        $toybox->annotate_files('mod_toybox', 'video', null);

        return $this->prepare_activity_structure($toybox);
    }
}
