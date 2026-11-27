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
 * Serves one toy's code on its own, for the player's sandboxed iframe.
 *
 * Toys are served here rather than written into the page so that the content policy
 * is an HTTP header (which nothing in the toy can switch off or get in ahead of), and
 * so that pages with toys on them don't carry every toy's code. The URL holds a version
 * stamp that changes whenever the toy is saved, so browsers can cache it until then.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// phpcs:disable moodle.Files.RequireLogin.Missing -- require_login() is called below, once the course is known.
define('NO_DEBUG_DISPLAY', true);

require(__DIR__ . '/../../config.php');

use mod_toybox\local\toys;

$id = required_param('id', PARAM_INT);
$toyid = required_param('toy', PARAM_INT);
$rev = optional_param('rev', '', PARAM_ALPHANUM);

[$course, $cm] = get_course_and_cm_from_cmid($id, 'toybox');
// No redirect to the login page: this loads inside an iframe.
$context = context_module::instance($cm->id);
try {
    require_login($course, true, $cm, true, true);
    require_capability('mod/toybox:view', $context);
} catch (moodle_exception $e) {
    // Just a short refusal: there's no room for a Moodle error page inside a toy.
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo get_string('toynotavailable', 'toybox');
    die();
}
\core\session\manager::write_close();

$toybox = $DB->get_record('toybox', ['id' => $cm->instance], '*', MUST_EXIST);
$toy = $DB->get_record('toybox_toy', ['id' => $toyid, 'toyboxid' => $toybox->id], '*', MUST_EXIST);
if (toys::held_back($toybox, $context)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo get_string('review_heldback', 'toybox');
    die();
}
$sdkurl = (new moodle_url('/mod/toybox/sdk/toybox-sdk.js'))->out(false);

header('Content-Type: text/html; charset=utf-8');
header('Content-Security-Policy: ' . toys::toy_csp($sdkurl, true));
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
if ($rev !== '' && $rev === toys::toy_rev($toy)) {
    // The address changes whenever the toy does.
    header('Cache-Control: private, max-age=31536000, immutable');
} else {
    header('Cache-Control: private, no-cache');
}
echo toys::prepare_html((string) $toy->html, $sdkurl);
