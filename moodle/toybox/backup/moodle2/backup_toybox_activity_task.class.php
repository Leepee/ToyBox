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
 * Backup task for ToyBox.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/toybox/backup/moodle2/backup_toybox_stepslib.php');

/**
 * Backs up one ToyBox activity.
 */
class backup_toybox_activity_task extends backup_activity_task {
    /**
     * No special settings.
     */
    protected function define_my_settings() {
    }

    /**
     * The single structure step.
     */
    protected function define_my_steps() {
        $this->add_step(new backup_toybox_activity_structure_step('toybox_structure', 'toybox.xml'));
    }

    /**
     * Encodes links to the activity for restore.
     *
     * @param string $content
     * @return string
     */
    public static function encode_content_links($content) {
        global $CFG;
        $base = preg_quote($CFG->wwwroot, '/');
        $content = preg_replace('/(' . $base . '\/mod\/toybox\/index.php\?id\=)([0-9]+)/', '$@TOYBOXINDEX*$2@$', $content);
        $content = preg_replace('/(' . $base . '\/mod\/toybox\/view.php\?id\=)([0-9]+)/', '$@TOYBOXVIEWBYID*$2@$', $content);
        return $content;
    }
}
