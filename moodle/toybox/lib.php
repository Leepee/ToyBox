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
 * Library of interface functions for ToyBox.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Which Moodle features this activity supports.
 *
 * @param string $feature FEATURE_xx constant
 * @return mixed True/false/null, or a value for FEATURE_MOD_PURPOSE.
 */
function toybox_supports($feature) {
    switch ($feature) {
        case FEATURE_MOD_INTRO:
        case FEATURE_SHOW_DESCRIPTION:
        case FEATURE_COMPLETION_TRACKS_VIEWS:
        case FEATURE_COMPLETION_HAS_RULES:
        case FEATURE_BACKUP_MOODLE2:
            return true;
        case FEATURE_GRADE_HAS_GRADE:
        case FEATURE_GRADE_OUTCOMES:
        case FEATURE_GROUPS:
        case FEATURE_GROUPINGS:
            return false;
        case FEATURE_MOD_PURPOSE:
            return MOD_PURPOSE_INTERACTIVECONTENT;
        default:
            return null;
    }
}

/**
 * Saves a new ToyBox activity.
 *
 * @param stdClass $data Form data
 * @param mod_toybox_mod_form|null $mform The form
 * @return int The new instance id
 */
function toybox_add_instance(stdClass $data, $mform = null): int {
    global $DB;
    $data->timecreated = time();
    $data->timemodified = $data->timecreated;
    $data->completionrequired = empty($data->completionrequired) ? 0 : 1;
    $data->display = ($data->display ?? 'page') === 'inline' ? 'inline' : 'page';
    $data->id = $DB->insert_record('toybox', $data);
    toybox_save_video($data);
    return $data->id;
}

/**
 * Updates an existing ToyBox activity.
 *
 * @param stdClass $data Form data
 * @param mod_toybox_mod_form|null $mform The form
 * @return bool
 */
function toybox_update_instance(stdClass $data, $mform = null): bool {
    global $DB;
    $data->id = $data->instance;
    $data->timemodified = time();
    $data->completionrequired = empty($data->completionrequired) ? 0 : 1;
    $data->display = ($data->display ?? 'page') === 'inline' ? 'inline' : 'page';
    $DB->update_record('toybox', $data);
    toybox_save_video($data);

    $cm = get_coursemodule_from_instance('toybox', $data->id, 0, false, MUST_EXIST);
    \core_completion\api::update_completion_date_event($cm->id, 'toybox', $data->id, null);
    return true;
}

/**
 * Stores the uploaded video from the form's draft area.
 *
 * @param stdClass $data Form data (must include coursemodule)
 */
function toybox_save_video(stdClass $data): void {
    if (!isset($data->videofile)) {
        return;
    }
    $context = context_module::instance($data->coursemodule);
    file_save_draft_area_files(
        $data->videofile,
        $context->id,
        'mod_toybox',
        'video',
        0,
        \mod_toybox\local\toys::video_filemanager_options()
    );
}

/**
 * Deletes a ToyBox activity and everything in it.
 *
 * @param int $id Instance id
 * @return bool
 */
function toybox_delete_instance($id): bool {
    global $DB;
    if (!$DB->record_exists('toybox', ['id' => $id])) {
        return false;
    }
    $DB->delete_records('toybox_result', ['toyboxid' => $id]);
    $DB->delete_records('toybox_toy', ['toyboxid' => $id]);
    $DB->delete_records('toybox', ['id' => $id]);
    return true;
}

/**
 * Adds custom completion info to the course module, so completion can be calculated cheaply.
 *
 * @param stdClass $coursemodule
 * @return cached_cm_info|false
 */
function toybox_get_coursemodule_info($coursemodule) {
    global $DB;
    $toybox = $DB->get_record(
        'toybox',
        ['id' => $coursemodule->instance],
        'id, name, intro, introformat, completionrequired, display'
    );
    if (!$toybox) {
        return false;
    }
    $info = new cached_cm_info();
    $info->name = $toybox->name;
    if ($coursemodule->showdescription) {
        $info->content = format_module_intro('toybox', $toybox, $coursemodule->id, false);
    }
    if ($coursemodule->completion == COMPLETION_TRACKING_AUTOMATIC) {
        $info->customdata['customcompletionrules']['completionrequired'] = $toybox->completionrequired;
    }
    $info->customdata['display'] = $toybox->display;
    return $info;
}

/**
 * Toys shown on the course page have no link to a separate page.
 *
 * @param cm_info $cm
 */
function toybox_cm_info_dynamic(cm_info $cm): void {
    if (($cm->customdata['display'] ?? 'page') === 'inline') {
        $cm->set_no_view_link();
    }
}

/**
 * Puts the toy (or video with toys) straight onto the course page.
 *
 * @param cm_info $cm
 */
function toybox_cm_info_view(cm_info $cm): void {
    global $DB;
    if (($cm->customdata['display'] ?? 'page') !== 'inline' || !$cm->uservisible) {
        return;
    }
    $context = context_module::instance($cm->id);
    if (!has_capability('mod/toybox:view', $context)) {
        return;
    }
    $toybox = $DB->get_record('toybox', ['id' => $cm->instance]);
    if ($toybox) {
        // Already-formatted HTML: the player's JSON config must not be filtered or cleaned.
        $cm->set_content(\mod_toybox\local\toys::render($toybox, $cm, $context, 'inline'), true);
    }
}

/**
 * Describes the active custom completion rules (shown on the course page).
 *
 * @param cm_info|stdClass $cm
 * @return array
 */
function mod_toybox_get_completion_active_rule_descriptions($cm): array {
    if (empty($cm->customdata['customcompletionrules']) || $cm->completion != COMPLETION_TRACKING_AUTOMATIC) {
        return [];
    }
    $descriptions = [];
    foreach ($cm->customdata['customcompletionrules'] as $key => $val) {
        if ($key === 'completionrequired' && !empty($val)) {
            $descriptions[] = get_string('completionrequired_desc', 'toybox');
        }
    }
    return $descriptions;
}

/**
 * Serves the activity's files (the uploaded video).
 *
 * @param stdClass $course
 * @param stdClass $cm
 * @param context $context
 * @param string $filearea
 * @param array $args
 * @param bool $forcedownload
 * @param array $options
 * @return bool false if the file was not found
 */
function toybox_pluginfile($course, $cm, $context, $filearea, $args, $forcedownload, array $options = []) {
    if ($context->contextlevel != CONTEXT_MODULE || $filearea !== 'video') {
        return false;
    }
    require_course_login($course, true, $cm);
    require_capability('mod/toybox:view', $context);

    array_shift($args); // Item id (always 0).
    $filename = array_pop($args);
    $filepath = $args ? '/' . implode('/', $args) . '/' : '/';
    $file = get_file_storage()->get_file($context->id, 'mod_toybox', 'video', 0, $filepath, $filename);
    if (!$file || $file->is_directory()) {
        return false;
    }
    // Moodle answers HTTP range requests here, which browsers need to seek in a video.
    send_stored_file($file, DAYSECS, 0, $forcedownload, $options);
}

/**
 * File areas for the file browser.
 *
 * @param stdClass $course
 * @param stdClass $cm
 * @param context $context
 * @return array
 */
function toybox_get_file_areas($course, $cm, $context): array {
    return ['video' => get_string('videofile', 'toybox')];
}

/**
 * Adds "Edit toys" and "Results" to the activity's navigation.
 *
 * @param settings_navigation $settingsnav
 * @param navigation_node $toyboxnode
 */
function toybox_extend_settings_navigation(settings_navigation $settingsnav, navigation_node $toyboxnode): void {
    $cm = $settingsnav->get_page()->cm;
    if (!$cm) {
        return;
    }
    $context = context_module::instance($cm->id);
    if (has_capability('mod/toybox:edittoys', $context)) {
        $toyboxnode->add(
            get_string('edittoys', 'toybox'),
            new moodle_url('/mod/toybox/edit.php', ['id' => $cm->id]),
            navigation_node::TYPE_SETTING,
            null,
            'mod_toybox_edit',
            new pix_icon('i/edit', '')
        );
    }
    if (has_capability('mod/toybox:viewresults', $context)) {
        $toyboxnode->add(
            get_string('results', 'toybox'),
            new moodle_url('/mod/toybox/results.php', ['id' => $cm->id]),
            navigation_node::TYPE_SETTING,
            null,
            'mod_toybox_results',
            new pix_icon('i/report', '')
        );
    }
}

/**
 * Marks the activity viewed and logs it.
 *
 * @param stdClass $toybox
 * @param stdClass $course
 * @param stdClass|cm_info $cm
 * @param context_module $context
 */
function toybox_view(stdClass $toybox, stdClass $course, $cm, context_module $context): void {
    $event = \mod_toybox\event\course_module_viewed::create([
        'objectid' => $toybox->id,
        'context' => $context,
    ]);
    $event->add_record_snapshot('course', $course);
    $event->add_record_snapshot('toybox', $toybox);
    $event->trigger();

    $completion = new completion_info($course);
    $completion->set_module_viewed($cm);
}

/**
 * Adds a "delete all ToyBox results" option to the course reset form.
 *
 * @param MoodleQuickForm $mform
 */
function toybox_reset_course_form_definition(&$mform): void {
    $mform->addElement('header', 'toyboxheader', get_string('modulenameplural', 'toybox'));
    $mform->addElement('advcheckbox', 'reset_toybox_results', get_string('resetresults', 'toybox'));
}

/**
 * Default for the course reset option.
 *
 * @param stdClass $course
 * @return array
 */
function toybox_reset_course_form_defaults($course): array {
    return ['reset_toybox_results' => 1];
}

/**
 * Deletes learner results when a course is reset.
 *
 * @param stdClass $data The reset form data
 * @return array Status of each reset step
 */
function toybox_reset_userdata($data): array {
    global $DB;
    $status = [];
    if (!empty($data->reset_toybox_results)) {
        $DB->delete_records_select(
            'toybox_result',
            'toyboxid IN (SELECT id FROM {toybox} WHERE course = ?)',
            [$data->courseid]
        );
        $status[] = [
            'component' => get_string('modulenameplural', 'toybox'),
            'item' => get_string('resetresults', 'toybox'),
            'error' => false,
        ];
    }
    return $status;
}
