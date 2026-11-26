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
 * Upgrade steps for ToyBox.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Upgrades the ToyBox database.
 *
 * @param int $oldversion
 * @return bool
 */
function xmldb_toybox_upgrade($oldversion) {
    global $DB;
    $dbman = $DB->get_manager();

    if ($oldversion < 2026112800) {
        // Add "display": show on its own page, or on the course page.
        $table = new xmldb_table('toybox');
        $field = new xmldb_field('display', XMLDB_TYPE_CHAR, '10', null, XMLDB_NOTNULL, null, 'page', 'aspect');
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        upgrade_mod_savepoint(true, 2026112800, 'toybox');
    }

    return true;
}
