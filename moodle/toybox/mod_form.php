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
 * The ToyBox settings form.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/course/moodleform_mod.php');

/**
 * Settings form: name, mode (video or toy only) and the video. Toys are edited on their own page.
 */
class mod_toybox_mod_form extends moodleform_mod {
    /**
     * Defines the form.
     */
    public function definition() {
        $mform = $this->_form;

        $mform->addElement('header', 'general', get_string('general', 'form'));
        $mform->addElement('text', 'name', get_string('name'), ['size' => 64]);
        $mform->setType('name', PARAM_TEXT);
        $mform->addRule('name', null, 'required', null, 'client');
        $mform->addRule('name', get_string('maximumchars', '', 255), 'maxlength', 255, 'client');
        $this->standard_intro_elements();

        $mform->addElement('header', 'toyboxsettings', get_string('toyboxsettings', 'toybox'));
        $mform->setExpanded('toyboxsettings');
        $mform->addElement('select', 'mode', get_string('mode', 'toybox'), [
            'video' => get_string('mode_video', 'toybox'),
            'toy' => get_string('mode_toy', 'toybox'),
        ]);
        $mform->addHelpButton('mode', 'mode', 'toybox');
        $mform->setDefault('mode', 'video');

        $mform->addElement('select', 'videosource', get_string('videosource', 'toybox'), [
            'upload' => get_string('videosource_upload', 'toybox'),
            'url' => get_string('videosource_url', 'toybox'),
        ]);
        $mform->hideIf('videosource', 'mode', 'eq', 'toy');

        $mform->addElement(
            'filemanager',
            'videofile',
            get_string('videofile', 'toybox'),
            null,
            \mod_toybox\local\toys::video_filemanager_options()
        );
        $mform->hideIf('videofile', 'mode', 'eq', 'toy');
        $mform->hideIf('videofile', 'videosource', 'eq', 'url');

        $mform->addElement('url', 'videourl', get_string('videourl', 'toybox'), ['size' => 64], ['usefilepicker' => false]);
        $mform->setType('videourl', PARAM_URL);
        $mform->addHelpButton('videourl', 'videourl', 'toybox');
        $mform->hideIf('videourl', 'mode', 'eq', 'toy');
        $mform->hideIf('videourl', 'videosource', 'eq', 'upload');

        $mform->addElement('select', 'display', get_string('display', 'toybox'), [
            'page' => get_string('display_page', 'toybox'),
            'inline' => get_string('display_inline', 'toybox'),
        ]);
        $mform->addHelpButton('display', 'display', 'toybox');
        $mform->setDefault('display', 'page');

        $this->standard_coursemodule_elements();
        $this->add_action_buttons();
    }

    /**
     * Prepares the video draft area when editing.
     *
     * @param array $defaultvalues
     */
    public function data_preprocessing(&$defaultvalues) {
        $draftitemid = file_get_submitted_draft_itemid('videofile');
        $contextid = $this->context ? $this->context->id : null;
        file_prepare_draft_area(
            $draftitemid,
            $contextid,
            'mod_toybox',
            'video',
            0,
            \mod_toybox\local\toys::video_filemanager_options()
        );
        $defaultvalues['videofile'] = $draftitemid;
    }

    /**
     * Validates the video settings.
     *
     * @param array $data
     * @param array $files
     * @return array Errors
     */
    public function validation($data, $files) {
        global $USER;
        $errors = parent::validation($data, $files);
        if (($data['mode'] ?? 'video') !== 'video') {
            return $errors;
        }
        if (($data['videosource'] ?? 'upload') === 'url') {
            $url = trim($data['videourl'] ?? '');
            if ($url === '') {
                $errors['videourl'] = get_string('required');
            } else if (!preg_match('#^https?://#i', $url)) {
                $errors['videourl'] = get_string('error_badurl', 'toybox');
            } else if (\mod_toybox\local\toys::video_provider($url) && !\mod_toybox\local\toys::video_id($url)) {
                $errors['videourl'] = get_string('error_videoid', 'toybox');
            }
        } else {
            $draft = file_get_drafarea_files($data['videofile'] ?? 0);
            if (empty($draft->list)) {
                $errors['videofile'] = get_string('required');
            }
        }
        return $errors;
    }

    /**
     * Adds the "finish all required toys" completion rule.
     *
     * @return array Names of the added elements
     */
    public function add_completion_rules() {
        $mform = $this->_form;
        $el = 'completionrequired' . $this->get_suffix();
        $mform->addElement('checkbox', $el, '', get_string('completionrequired', 'toybox'));
        $mform->addHelpButton($el, 'completionrequired', 'toybox');
        return [$el];
    }

    /**
     * Whether the custom completion rule is enabled.
     *
     * @param array $data
     * @return bool
     */
    public function completion_rule_enabled($data) {
        return !empty($data['completionrequired' . $this->get_suffix()]);
    }

    /**
     * Makes sure the completion rule is saved as 0 when unticked.
     *
     * @param stdClass $data
     */
    public function data_postprocessing($data) {
        parent::data_postprocessing($data);
        if (!empty($data->completionunlocked)) {
            $el = 'completionrequired' . $this->get_suffix();
            if (empty($data->$el)) {
                $data->$el = 0;
            }
        }
    }
}
