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

    /** @var int Largest toy we accept, in bytes, whatever the site setting says. */
    public const MAX_TOY_BYTES = 4194304;

    /** @var int Earlier versions kept for each toy. */
    public const HISTORY_KEEP = 20;

    /** @var int Seconds within which a repeat result for the same toy is ignored. */
    public const RESULT_REPEAT_SECONDS = 5;

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
            'accepted_types' => ['.mp4', '.webm', '.m4v'],
            'return_types' => FILE_INTERNAL,
            'maxbytes' => (int) get_config('mod_toybox', 'maxvideobytes'),
        ];
    }

    /**
     * Whether a video link is allowed: https only, and on the site's list of video hosts if it has one.
     *
     * @param string $url
     * @return bool
     */
    public static function video_url_allowed(string $url): bool {
        $parts = parse_url(trim($url));
        if (!$parts || strtolower($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])) {
            return false;
        }
        $hosts = preg_split('/[\s,]+/', strtolower((string) get_config('mod_toybox', 'videohosts')), -1, PREG_SPLIT_NO_EMPTY);
        if (!$hosts) {
            return true;
        }
        $host = strtolower($parts['host']);
        foreach ($hosts as $allowed) {
            $allowed = ltrim($allowed, '*.');
            if ($host === $allowed || str_ends_with($host, '.' . $allowed)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Largest toy allowed on this site, in bytes.
     *
     * @return int
     */
    public static function max_toy_bytes(): int {
        $kb = (int) get_config('mod_toybox', 'maxtoysize');
        return $kb > 0 ? min($kb * 1024, self::MAX_TOY_BYTES) : 1048576;
    }

    /**
     * Most toys allowed in one activity on this site.
     *
     * @return int
     */
    public static function max_toys(): int {
        $n = (int) get_config('mod_toybox', 'maxtoys');
        return $n > 0 ? $n : 50;
    }

    /**
     * SHA-1 hashes of the toys that come with the plugin (allowed when the site only allows those).
     *
     * @return string[]
     */
    public static function bundled_hashes(): array {
        global $CFG;
        $hashes = [];
        foreach (glob($CFG->dirroot . '/mod/toybox/toys/*.html') ?: [] as $file) {
            $hashes[] = sha1(str_replace("\r\n", "\n", (string) file_get_contents($file)));
        }
        return $hashes;
    }

    /** @var string[] Display options: a page of its own, or straight on the course page. */
    public const DISPLAYS = ['page', 'inline'];

    /**
     * Which video site a URL belongs to.
     *
     * @param string $url
     * @return string|null 'youtube', 'vimeo', 'panopto' or null for anything else (a video file)
     */
    public static function video_provider(string $url): ?string {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if (preg_match('#/Panopto/Pages/(Viewer|Embed)\.aspx$#i', (string) parse_url($url, PHP_URL_PATH))) {
            return 'panopto';
        }
        if (preg_match('/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/', $host)) {
            return 'youtube';
        }
        if (preg_match('/(^|\.)vimeo\.com$/', $host)) {
            return 'vimeo';
        }
        return null;
    }

    /**
     * The video id in a YouTube or Vimeo link (null if there isn't one).
     *
     * @param string $url
     * @return string|null
     */
    public static function video_id(string $url): ?string {
        $provider = self::video_provider($url);
        $parts = parse_url($url);
        $path = $parts['path'] ?? '';
        parse_str($parts['query'] ?? '', $query);
        if ($provider === 'youtube') {
            $id = $query['v'] ?? null;
            if (!$id && preg_match('#^/(?:embed/|shorts/|live/|v/)?([\w-]{11})(?:[/?]|$)#', $path, $m)) {
                $id = $m[1];
            }
            return ($id && preg_match('/^[\w-]{11}$/', $id)) ? $id : null;
        }
        if ($provider === 'vimeo' && preg_match('#^/(?:video/)?(\d+)#', $path, $m)) {
            return $m[1];
        }
        if ($provider === 'panopto') {
            $id = $query['id'] ?? '';
            return preg_match('/^[0-9a-f-]{36}$/i', $id) ? $id : null;
        }
        return null;
    }

    /**
     * Renders a ToyBox activity's player (or toy) and loads its JavaScript.
     * Used by view.php, embed.php and on the course page.
     *
     * @param stdClass $toybox
     * @param \cm_info|stdClass $cm
     * @param context_module $context
     * @param string $where 'page', 'embed' or 'inline' (course page)
     * @return string HTML
     */
    public static function render(stdClass $toybox, $cm, context_module $context, string $where = 'page'): string {
        global $OUTPUT, $PAGE, $USER;
        $toylist = self::get_toys($toybox->id, false);
        $videourl = self::video_url($toybox, $context);
        $canedit = has_capability('mod/toybox:edittoys', $context);
        $cansubmit = has_capability('mod/toybox:submit', $context, null, false) && !isguestuser();
        $course = get_course($cm->course);
        $completion = new \completion_info($course);
        $complete = $completion->is_enabled($cm)
            && $completion->get_data($cm, false, $USER->id)->completionstate == COMPLETION_COMPLETE;

        $config = [
            'cmid' => (int) $cm->id,
            'mode' => $toybox->mode,
            'aspect' => $toybox->aspect,
            'theme' => get_config('mod_toybox', 'theme') ?: 'auto',
            'inline' => $where === 'inline',
            'videoUrl' => $videourl,
            'sdkUrl' => (new moodle_url('/mod/toybox/sdk/toybox-sdk.js'))->out(false),
            'toys' => self::export_for_js($toylist, (int) $cm->id),
            'finished' => self::finished_toy_ids($toybox->id, $USER->id),
            'canSubmit' => $cansubmit,
            'activityComplete' => $complete,
            'strings' => [
                'activitycomplete' => get_string('activitycomplete', 'toybox'),
                'finished' => get_string('finished', 'toybox'),
                'jumpto' => get_string('jumpto', 'toybox'),
                'optional' => get_string('optional', 'toybox'),
                'untitled' => get_string('untitled', 'toybox'),
                'toysinthisvideo' => get_string('toysinthisvideo', 'toybox'),
                'loading' => get_string('loading', 'toybox'),
            ],
        ];

        $notice = null;
        $review = null;
        if (!empty($toybox->restorereview) && $canedit) {
            $review = [
                'message' => get_string($toybox->restorereview == 2 ? 'review_othersite' : 'review_restored', 'toybox'),
                'url' => (new moodle_url('/mod/toybox/review.php'))->out(false),
                'cmid' => (int) $cm->id,
                'sesskey' => sesskey(),
            ];
        }
        if (self::held_back($toybox, $context)) {
            $notice = get_string('review_heldback', 'toybox');
        } else if ($toybox->mode === 'video' && !$videourl) {
            $notice = get_string('novideo', 'toybox');
        } else if (!$toylist && $toybox->mode === 'toy') {
            $notice = get_string($canedit ? 'notoyyet_teacher' : 'notoyyet', 'toybox');
        }
        if (!$notice) {
            // One watcher per page starts every ToyBox on it (including ones the course page adds later).
            $PAGE->requires->js_call_amd('mod_toybox/view', 'initAll');
        }
        $editurl = new moodle_url('/mod/toybox/edit.php', ['id' => $cm->id]);
        return $OUTPUT->render_from_template('mod_toybox/view', [
            'rootid' => 'mod-toybox-' . $cm->id . '-' . $where,
            'inline' => $where === 'inline',
            'name' => format_string($toybox->name, true, ['context' => $context]),
            'notice' => $notice,
            'canedit' => $canedit,
            'editurl' => $editurl->out(false),
            'viewurl' => (new moodle_url('/mod/toybox/view.php', ['id' => $cm->id]))->out(false),
            'notoys' => !$toylist,
            'istoy' => $toybox->mode === 'toy',
            'review' => $review,
            'configjson' => json_encode($config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT),
        ]);
    }

    /**
     * Whether the toys are held back from this user: restored from another Moodle site
     * and not yet reviewed by a teacher.
     *
     * @param stdClass $toybox
     * @param context_module $context
     * @return bool
     */
    public static function held_back(stdClass $toybox, context_module $context): bool {
        return (int) ($toybox->restorereview ?? 0) === 2 && !has_capability('mod/toybox:edittoys', $context);
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
     * @param bool $withcode False to leave out the code (the player loads it from toy.php)
     * @return stdClass[]
     */
    public static function get_toys(int $toyboxid, bool $withcode = true): array {
        global $DB;
        $fields = $withcode ? '*' : 'id, toyboxid, sortorder, label, params, starttime, endtime, posx, posy, width, height, '
            . 'pausevideo, resumeoncomplete, required, timemodified';
        return array_values($DB->get_records('toybox_toy', ['toyboxid' => $toyboxid], 'sortorder, id', $fields));
    }

    /**
     * Toys as plain arrays for the JavaScript player/editor.
     *
     * @param stdClass[] $toys
     * @param int|null $cmid For the player: point each toy at toy.php instead of including its code
     * @return array
     */
    public static function export_for_js(array $toys, ?int $cmid = null): array {
        $out = [];
        foreach ($toys as $t) {
            $params = json_decode((string) $t->params, true);
            $code = $cmid === null
                ? ['html' => (string) $t->html]
                : ['toy' => self::frame_url($cmid, $t)->out(false)];
            $out[] = [
                'id' => (int) $t->id,
                'label' => $t->label,
            ] + $code + [
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
     * The address toy.php serves a toy from. It changes whenever the toy is saved.
     *
     * @param int $cmid
     * @param stdClass $toy
     * @return moodle_url
     */
    public static function frame_url(int $cmid, stdClass $toy): moodle_url {
        return new moodle_url('/mod/toybox/toy.php', ['id' => $cmid, 'toy' => $toy->id, 'rev' => self::toy_rev($toy)]);
    }

    /**
     * A version stamp for a toy's address: changes whenever the toy is saved (or the plugin updated,
     * which ships the SDK), so browsers can cache the toy until then.
     *
     * @param stdClass $toy
     * @return string
     */
    public static function toy_rev(stdClass $toy): string {
        return substr(sha1(get_config('mod_toybox', 'version') . '|' . $toy->id . '|' . $toy->timemodified), 0, 16);
    }

    /**
     * The content policy every toy runs under: its own inline code and the ToyBox SDK only,
     * and no network at all.
     *
     * @param string $sdkurl
     * @param bool $header True for the HTTP header (adds the sandbox, in case the page is opened directly)
     * @return string
     */
    public static function toy_csp(string $sdkurl, bool $header = false): string {
        $rules = [
            "default-src 'none'",
            "script-src 'unsafe-inline' " . $sdkurl,
            "style-src 'unsafe-inline'",
            'img-src data: blob:',
            'media-src data: blob:',
            'font-src data:',
            "connect-src 'none'",
            "form-action 'none'",
            "base-uri 'none'",
        ];
        if ($header) {
            $rules[] = 'sandbox allow-scripts';
        }
        return implode('; ', $rules);
    }

    /**
     * A toy's code, ready to serve: its SDK <script> pointed at the real SDK (or one added),
     * with the content policy repeated at the very start as a meta tag.
     *
     * @param string $html
     * @param string $sdkurl
     * @return string
     */
    public static function prepare_html(string $html, string $sdkurl): string {
        $usessdk = (bool) preg_match('/toybox-sdk\.js/', $html);
        if ($usessdk) {
            $html = preg_replace('/(["\'])[^"\']*toybox-sdk\.js\1/', '"' . s($sdkurl) . '"', $html);
        }
        $html = preg_replace('/^\s*<!doctype[^>]*>/i', '', $html);
        return '<!doctype html><meta charset="utf-8">'
            . '<meta http-equiv="Content-Security-Policy" content="' . s(self::toy_csp($sdkurl)) . '">'
            . ($usessdk ? '' : '<script src="' . s($sdkurl) . '"></script>')
            . $html;
    }

    /**
     * Replaces an activity's toys with the given list. Existing toys (matched by id) keep their
     * learner results; toys missing from the list are deleted along with their results.
     * Each change of a toy's code is kept in its history, and the save is logged.
     *
     * @param stdClass $toybox
     * @param array $toys Decoded toy arrays (see export_for_js for the shape)
     * @return stdClass[] The saved toys
     */
    public static function save_all(stdClass $toybox, array $toys): array {
        global $DB, $USER;
        $existing = $DB->get_records('toybox_toy', ['toyboxid' => $toybox->id]);
        if ($toybox->mode === 'toy') {
            $toys = array_slice($toys, 0, 1); // Toy-only activities hold exactly one toy.
        }
        if (count($toys) > self::max_toys()) {
            throw new \moodle_exception('error_toomanytoys', 'toybox', '', self::max_toys());
        }
        $maxbytes = self::max_toy_bytes();
        $bundledonly = (bool) get_config('mod_toybox', 'bundledonly');
        $bundled = $bundledonly ? self::bundled_hashes() : [];
        $now = time();
        $kept = [];
        $changed = 0;
        $transaction = $DB->start_delegated_transaction();
        foreach (array_values($toys) as $i => $t) {
            $html = str_replace("\r\n", "\n", (string) ($t['html'] ?? ''));
            $label = \core_text::substr(clean_param($t['label'] ?? '', PARAM_TEXT), 0, 255);
            if (strlen($html) > $maxbytes) {
                throw new \moodle_exception('error_toytoobig', 'toybox', '', display_size($maxbytes));
            }
            $id = (int) ($t['id'] ?? 0);
            $old = $id && isset($existing[$id]) ? $existing[$id] : null;
            $codechanged = !$old || (string) $old->html !== $html;
            if ($bundledonly && $codechanged && $html !== '' && !in_array(sha1($html), $bundled, true)) {
                throw new \moodle_exception('error_bundledonly', 'toybox', '', $label);
            }
            $params = $t['params'] ?? [];
            if (is_string($params)) {
                $params = json_decode($params, true);
                if ($params === null) {
                    throw new \moodle_exception('error_badparams', 'toybox', '', $label);
                }
            }
            $rect = $t['rect'] ?? [];
            $start = max(0, (float) ($t['start'] ?? 0));
            $record = (object) [
                'toyboxid' => $toybox->id,
                'sortorder' => $i,
                'label' => $label,
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
            if ($old) {
                $record->id = $old->id;
                $record->usermodified = $codechanged ? $USER->id : $old->usermodified;
                $DB->update_record('toybox_toy', $record);
            } else {
                $record->usermodified = $USER->id;
                $record->timecreated = $now;
                $record->id = $DB->insert_record('toybox_toy', $record);
            }
            if ($codechanged) {
                $changed++;
                self::add_history($record);
            }
            $kept[$record->id] = true;
        }
        $deleted = 0;
        foreach (array_keys($existing) as $id) {
            if (!isset($kept[$id])) {
                $DB->delete_records('toybox_result', ['toyid' => $id]);
                $DB->delete_records('toybox_toy_history', ['toyid' => $id]);
                $DB->delete_records('toybox_toy', ['id' => $id]);
                $deleted++;
            }
        }
        if (!empty($toybox->restorereview)) {
            // Saving the toys counts as reviewing them.
            $DB->set_field('toybox', 'restorereview', 0, ['id' => $toybox->id]);
            $toybox->restorereview = 0;
        }
        $transaction->allow_commit();

        $saved = self::get_toys($toybox->id);
        $cm = get_coursemodule_from_instance('toybox', $toybox->id, $toybox->course, false, MUST_EXIST);
        \mod_toybox\event\toys_saved::create([
            'context' => context_module::instance($cm->id),
            'objectid' => $toybox->id,
            'other' => [
                'toys' => count($saved),
                'changed' => $changed,
                'deleted' => $deleted,
                'hash' => sha1(implode('|', array_map(fn($t) => sha1((string) $t->html), $saved))),
            ],
        ])->trigger();
        return $saved;
    }

    /**
     * Keeps a copy of a toy's code in its history (the newest few only).
     *
     * @param stdClass $toy A saved toy record
     */
    public static function add_history(stdClass $toy): void {
        global $DB;
        $DB->insert_record('toybox_toy_history', (object) [
            'toyboxid' => $toy->toyboxid,
            'toyid' => $toy->id,
            'label' => $toy->label,
            'html' => $toy->html,
            'hash' => sha1((string) $toy->html),
            'usermodified' => $toy->usermodified,
            'timecreated' => $toy->timemodified,
        ]);
        $ids = $DB->get_fieldset_select('toybox_toy_history', 'id', 'toyid = ? ORDER BY timecreated DESC, id DESC', [$toy->id]);
        $old = array_slice($ids, self::HISTORY_KEEP);
        if ($old) {
            $DB->delete_records_list('toybox_toy_history', 'id', $old);
        }
    }

    /**
     * Earlier versions of a toy, newest first (without their code).
     *
     * @param int $toyid
     * @return array[] id, time, who, hash
     */
    public static function history(int $toyid): array {
        global $DB;
        $userfields = \core_user\fields::for_name()->get_sql('u', false, '', '', false)->selects;
        $rows = $DB->get_records_sql(
            "SELECT h.id, h.hash, h.timecreated, h.usermodified, $userfields
               FROM {toybox_toy_history} h
          LEFT JOIN {user} u ON u.id = h.usermodified
              WHERE h.toyid = ?
           ORDER BY h.timecreated DESC, h.id DESC",
            [$toyid]
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id' => (int) $r->id,
                'time' => (int) $r->timecreated,
                'timestr' => userdate($r->timecreated, get_string('strftimedatetimeshort', 'langconfig')),
                'who' => $r->usermodified ? fullname($r) : '',
                'hash' => substr($r->hash, 0, 8),
            ];
        }
        return $out;
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
     * @return bool False if it was ignored as a repeat
     */
    public static function record_result(stdClass $toy, int $userid, string $resultjson): bool {
        global $DB;
        if (strlen($resultjson) > self::MAX_RESULT_BYTES || json_decode($resultjson) === null && $resultjson !== 'null') {
            $resultjson = json_encode(['note' => 'result was too large or not JSON']);
        }
        $now = time();
        $existing = $DB->get_record('toybox_result', ['toyid' => $toy->id, 'userid' => $userid]);
        if ($existing) {
            if ($existing->timemodified > $now - self::RESULT_REPEAT_SECONDS) {
                return false; // A repeat (a toy reporting over and over): keep the first.
            }
            $existing->result = $resultjson;
            $existing->attempts = min(9999, $existing->attempts + 1);
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
        return true;
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
