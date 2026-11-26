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
 * Test data generator for ToyBox.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Creates ToyBox activities and toys for tests.
 */
class mod_toybox_generator extends testing_module_generator {
    /**
     * Creates an activity (toy-only by default, so no video is needed).
     *
     * @param array|stdClass|null $record
     * @param array|null $options
     * @return stdClass
     */
    public function create_instance($record = null, ?array $options = null) {
        $record = (object) (array) $record;
        $defaults = ['mode' => 'toy', 'videosource' => 'url', 'videourl' => '', 'aspect' => '16:9', 'completionrequired' => 0];
        foreach ($defaults as $k => $v) {
            if (!isset($record->$k)) {
                $record->$k = $v;
            }
        }
        return parent::create_instance($record, (array) $options);
    }

    /**
     * Adds a toy to an activity.
     *
     * @param stdClass $toybox
     * @param array $data
     * @return stdClass
     */
    public function create_toy(stdClass $toybox, array $data = []): stdClass {
        global $DB;
        $now = time();
        $record = (object) array_merge([
            'toyboxid' => $toybox->id,
            'sortorder' => $DB->count_records('toybox_toy', ['toyboxid' => $toybox->id]),
            'label' => 'Toy',
            'html' => '<script>ToyBox.onInit(function () { ToyBox.complete({ok: true}); });</script>',
            'params' => '{}',
            'starttime' => 0,
            'endtime' => 2,
            'required' => 1,
            'timecreated' => $now,
            'timemodified' => $now,
        ], $data);
        $record->id = $DB->insert_record('toybox_toy', $record);
        return $record;
    }
}
