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

namespace mod_toybox\completion;

use core_completion\activity_custom_completion;
use mod_toybox\local\toys;

/**
 * Custom completion: "the learner finished all required toys".
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class custom_completion extends activity_custom_completion {
    /**
     * Completion state for a rule.
     *
     * @param string $rule
     * @return int
     */
    public function get_state(string $rule): int {
        $this->validate_rule($rule);
        return toys::finished_all_required((int) $this->cm->instance, (int) $this->userid)
            ? COMPLETION_COMPLETE : COMPLETION_INCOMPLETE;
    }

    /**
     * The rules this activity defines.
     *
     * @return array
     */
    public static function get_defined_custom_rules(): array {
        return ['completionrequired'];
    }

    /**
     * Descriptions of the rules.
     *
     * @return array
     */
    public function get_custom_rule_descriptions(): array {
        return ['completionrequired' => get_string('completiondetail:required', 'toybox')];
    }

    /**
     * Display order.
     *
     * @return array
     */
    public function get_sort_order(): array {
        return ['completionview', 'completionrequired'];
    }
}
