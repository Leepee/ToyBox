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

namespace mod_toybox\local;

use context_module;
use moodle_url;
use stdClass;

/**
 * Reading and writing toys and learner results.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class toys {
    /** @var string[] Allowed toy-only box shapes. */
    public const ASPECTS = ['16:9', '4:3', '1:1', '3:4', 'auto'];

    /** @var int Largest toy we accept, in bytes. */
    public const MAX_TOY_BYTES = 1048576;

    /** @var int Largest result we store, in bytes. */
    public const MAX_RESULT_BYTES = 8192;

    /**
     * Options for the video file manager.
     *
     * @return array
     */
    public static function video_filemanager_options(): array {
        global $CFG;
        require_once($CFG->dirroot . '/repository/lib.php'); // For FILE_INTERNAL.
        return [
            'subdirs' => 0,
            'maxfiles' => 1,
            'accepted_types' => ['.mp4', '.webm', '.m4v', '.ogv', '.mov'],
            'return_types' => FILE_INTERNAL,
        ];
    }

    /**
     * Whether a URL is a YouTube/Vimeo page (not yet supported: they need their own players).
     *
     * @param string $url
     * @return bool
     */
    public static function is_streaming_site(string $url): bool {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        return (bool) preg_match('/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com|vimeo\.com)$/', $host);
    }

    /**
     * The URL of the activity's video, or null if there is none.
     *
     * @param stdClass $toybox
     * @param context_module $context
     * @return string|null
     */
    public static function video_url(stdClass $toybox, context_module $context): ?string {
        if ($toybox->mode !== 'video') {
            return null;
        }
        if ($toybox->videosource === 'url') {
            return $toybox->videourl ?: null;
        }
        $files = get_file_storage()->get_area_files($context->id, 'mod_toybox', 'video', 0, 'id', false);
        $file = reset($files);
        if (!$file) {
            return null;
        }
        return moodle_url::make_pluginfile_url(
            $context->id,
            'mod_toybox',
            'video',
            0,
            $file->get_filepath(),
            $file->get_filename()
        )->out(false);
    }

    /**
     * All toys of an activity, in order.
     *
     * @param int $toyboxid
     * @return stdClass[]
     */
    public static function get_toys(int $toyboxid): array {
        global $DB;
        return array_values($DB->get_records('toybox_toy', ['toyboxid' => $toyboxid], 'sortorder, id'));
    }

    /**
     * Toys as plain arrays for the JavaScript player/editor.
     *
     * @param stdClass[] $toys
     * @return array
     */
    public static function export_for_js(array $toys): array {
        $out = [];
        foreach ($toys as $t) {
            $params = json_decode((string) $t->params, true);
            $out[] = [
                'id' => (int) $t->id,
                'label' => $t->label,
                'html' => (string) $t->html,
                'params' => is_array($params) ? $params : new stdClass(),
                'start' => (float) $t->starttime,
                'end' => (float) $t->endtime,
                'rect' => ['x' => (float) $t->posx, 'y' => (float) $t->posy, 'w' => (float) $t->width, 'h' => (float) $t->height],
                'pause' => (bool) $t->pausevideo,
                'resumeOnComplete' => (bool) $t->resumeoncomplete,
                'required' => (bool) $t->required,
            ];
        }
        return $out;
    }

    /**
     * Replaces an activity's toys with the given list. Existing toys (matched by id) keep their
     * learner results; toys missing from the list are deleted along with their results.
     *
     * @param stdClass $toybox
     * @param array $toys Decoded toy arrays (see export_for_js for the shape)
     * @return stdClass[] The saved toys
     */
    public static function save_all(stdClass $toybox, array $toys): array {
        global $DB;
        $existing = $DB->get_records('toybox_toy', ['toyboxid' => $toybox->id], '', 'id');
        if ($toybox->mode === 'toy') {
            $toys = array_slice($toys, 0, 1); // Toy-only activities hold exactly one toy.
        }
        $now = time();
        $kept = [];
        $transaction = $DB->start_delegated_transaction();
        foreach (array_values($toys) as $i => $t) {
            $html = (string) ($t['html'] ?? '');
            if (strlen($html) > self::MAX_TOY_BYTES) {
                throw new \moodle_exception('error_toytoobig', 'toybox');
            }
            $params = $t['params'] ?? [];
            if (is_string($params)) {
                $params = json_decode($params, true);
                if ($params === null) {
                    throw new \moodle_exception('error_badparams', 'toybox', '', clean_param($t['label'] ?? '', PARAM_TEXT));
                }
            }
            $rect = $t['rect'] ?? [];
            $start = max(0, (float) ($t['start'] ?? 0));
            $record = (object) [
                'toyboxid' => $toybox->id,
                'sortorder' => $i,
                'label' => \core_text::substr(clean_param($t['label'] ?? '', PARAM_TEXT), 0, 255),
                'html' => $html,
                'params' => json_encode($params ?: new stdClass()),
                'starttime' => $start,
                'endtime' => max($start + 0.5, (float) ($t['end'] ?? $start + 2)),
                'posx' => self::pct($rect['x'] ?? 20),
                'posy' => self::pct($rect['y'] ?? 12),
                'width' => max(5, self::pct($rect['w'] ?? 60)),
                'height' => max(5, self::pct($rect['h'] ?? 62)),
                'pausevideo' => empty($t['pause']) ? 0 : 1,
                'resumeoncomplete' => empty($t['resumeOnComplete']) ? 0 : 1,
                'required' => empty($t['required']) ? 0 : 1,
                'timemodified' => $now,
            ];
            $id = (int) ($t['id'] ?? 0);
            if ($id && isset($existing[$id])) {
                $record->id = $id;
                $DB->update_record('toybox_toy', $record);
            } else {
                $record->timecreated = $now;
                $record->id = $DB->insert_record('toybox_toy', $record);
            }
            $kept[$record->id] = true;
        }
        foreach (array_keys($existing) as $id) {
            if (!isset($kept[$id])) {
                $DB->delete_records('toybox_result', ['toyid' => $id]);
                $DB->delete_records('toybox_toy', ['id' => $id]);
            }
        }
        $transaction->allow_commit();
        return self::get_toys($toybox->id);
    }

    /**
     * Clamps a percentage.
     *
     * @param mixed $v
     * @return float
     */
    private static function pct($v): float {
        return round(min(100, max(0, (float) $v)), 2);
    }

    /**
     * Stores (or updates) a learner's result for a toy.
     *
     * @param stdClass $toy
     * @param int $userid
     * @param string $resultjson
     */
    public static function record_result(stdClass $toy, int $userid, string $resultjson): void {
        global $DB;
        if (strlen($resultjson) > self::MAX_RESULT_BYTES || json_decode($resultjson) === null && $resultjson !== 'null') {
            $resultjson = json_encode(['note' => 'result was too large or not JSON']);
        }
        $now = time();
        $existing = $DB->get_record('toybox_result', ['toyid' => $toy->id, 'userid' => $userid]);
        if ($existing) {
            $existing->result = $resultjson;
            $existing->attempts++;
            $existing->timemodified = $now;
            $DB->update_record('toybox_result', $existing);
        } else {
            $DB->insert_record('toybox_result', (object) [
                'toyboxid' => $toy->toyboxid,
                'toyid' => $toy->id,
                'userid' => $userid,
                'result' => $resultjson,
                'attempts' => 1,
                'timecreated' => $now,
                'timemodified' => $now,
            ]);
        }
    }

    /**
     * Ids of the toys a learner has finished.
     *
     * @param int $toyboxid
     * @param int $userid
     * @return int[]
     */
    public static function finished_toy_ids(int $toyboxid, int $userid): array {
        global $DB;
        return array_map('intval', $DB->get_fieldset_select(
            'toybox_result',
            'toyid',
            'toyboxid = ? AND userid = ?',
            [$toyboxid, $userid]
        ));
    }

    /**
     * Whether a learner has finished every required toy (false if there are none).
     *
     * @param int $toyboxid
     * @param int $userid
     * @return bool
     */
    public static function finished_all_required(int $toyboxid, int $userid): bool {
        global $DB;
        $required = $DB->count_records('toybox_toy', ['toyboxid' => $toyboxid, 'required' => 1]);
        if (!$required) {
            return false;
        }
        $done = $DB->count_records_sql(
            'SELECT COUNT(1)
                                           FROM {toybox_result} r
                                           JOIN {toybox_toy} t ON t.id = r.toyid
                                          WHERE t.toyboxid = ? AND t.required = 1 AND r.userid = ?',
            [$toyboxid, $userid]
        );
        return $done >= $required;
    }
}
