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
 * English strings for ToyBox.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['activitycomplete'] = 'Activity complete. Well done!';
$string['attempts'] = '{$a} times';
$string['backtoactivity'] = 'Back to the activity';
$string['bundledonly'] = 'Only allow the toys that come with ToyBox';
$string['bundledonly_desc'] = 'When ticked, teachers can only choose from the example toys that come with ToyBox (they can still place, time and set them up). Toy code can\'t be typed, pasted or made with AI. Toys already in courses keep working.';
$string['completiondetail:required'] = 'Finish all required toys';
$string['completionrequired'] = 'Learners must finish all required toys';
$string['completionrequired_desc'] = 'Learners must finish all required toys';
$string['completionrequired_help'] = 'A toy counts as finished when it reports completion (for example, the learner solves its challenge or presses Done). Each toy can be marked as required or optional in the toy editor.';
$string['display'] = 'Display';
$string['display_help'] = 'Open as a page: learners click the activity to open it.

Show on the course page: the toy (or video with its toys) appears right on the course page, like a label, so learners don\'t have to click into it. Players only load when they scroll into view, and starting one video pauses any other.';
$string['display_inline'] = 'Show on the course page';
$string['display_page'] = 'Open as a page';
$string['editor_addtoy'] = 'Add toy';
$string['editor_allsaved'] = 'All changes saved';
$string['editor_aspect11'] = 'Square';
$string['editor_aspect169'] = '16:9 (wide)';
$string['editor_aspect34'] = '3:4 (tall)';
$string['editor_aspect43'] = '4:3';
$string['editor_aspectauto'] = 'Fit content';
$string['editor_badjson'] = 'These settings are not valid JSON';
$string['editor_checker'] = 'Checker';
$string['editor_codelocked'] = 'This site only allows the toys that come with ToyBox. Choose one from the list.';
$string['editor_copyaiprompt'] = 'Copy AI prompt';
$string['editor_copyaiprompt_help'] = 'Copies the toy guide plus this toy\'s details. Paste it into ChatGPT, Claude, Gemini or Copilot.';
$string['editor_deletetoy'] = 'Delete toy';
$string['editor_deletetoyconfirm'] = 'Delete this toy? When you save, learners\' results for it will be deleted too.';
$string['editor_downloadguide'] = 'Download toy guide';
$string['editor_downloadguide_help'] = 'The toy guide plus this site\'s style notes. Attach it to an AI chat.';
$string['editor_end'] = 'Ends at (seconds)';
$string['editor_height'] = 'Height %';
$string['editor_history'] = 'Earlier versions';
$string['editor_historyempty'] = 'No earlier versions yet';
$string['editor_makewithai'] = 'Make it with AI:';
$string['editor_messages'] = 'Messages from the toy';
$string['editor_messageshelp'] = 'Press Preview to try the toy. Anything it reports appears here.';
$string['editor_noproblems'] = 'No problems found';
$string['editor_novideo'] = 'This activity has no video yet. Add one in the activity settings.';
$string['editor_onlinevideo'] = 'This activity uses an online video (lower quality). Video sites add their own titles and buttons over the player. For the cleanest result, upload the video file in the activity settings.';
$string['editor_pausevideo'] = 'Pause the video';
$string['editor_posx'] = 'Left %';
$string['editor_posy'] = 'Top %';
$string['editor_preview'] = 'Preview';
$string['editor_previewing'] = 'previewing';
$string['editor_promptcopied'] = 'AI prompt copied. Paste it into your AI chat, fill in the [brackets], then paste the HTML it gives you into "Toy code".';
$string['editor_promptfailed'] = 'Couldn\'t copy to the clipboard. Use "Download toy guide" and attach the file to your AI chat instead.';
$string['editor_replacecode'] = 'Replace this toy\'s code with the example?';
$string['editor_requiredtoy'] = 'Required for completion';
$string['editor_restoreversionconfirm'] = 'Put this earlier version\'s code into the editor? Nothing changes for learners until you save.';
$string['editor_resumeoncomplete'] = 'Resume when finished';
$string['editor_savechanges'] = 'Save changes';
$string['editor_saved'] = 'Toys saved';
$string['editor_shape'] = 'Shape';
$string['editor_start'] = 'Starts at (seconds)';
$string['editor_startfrom'] = 'Start from an example';
$string['editor_starthere'] = 'Start here';
$string['editor_starthere_help'] = 'Set the start time to where the preview video is now';
$string['editor_toy'] = 'Toy';
$string['editor_toycode'] = 'Toy code (HTML)';
$string['editor_toylabel'] = 'Name';
$string['editor_toyparams'] = 'Settings (JSON)';
$string['editor_unsaved'] = 'Unsaved changes';
$string['editor_untitled'] = 'Untitled toy';
$string['editor_width'] = 'Width %';
$string['editorintro_toy'] = 'Write the toy\'s code, or use "Copy AI prompt" to have an AI write it, then press Preview.';
$string['editorintro_video'] = 'Each toy appears over the video at its start time. Pause the preview where you want a toy, add one, and press "Start here".';
$string['edittoys'] = 'Edit toys';
$string['embedcode'] = 'Embed code';
$string['embedcode_help'] = 'Paste this into a Page, Book or other Moodle text (in HTML mode) to show this activity there. To embed it on other websites, "Allow frame embedding" must be enabled in Site administration > Security > HTTP security.';
$string['error_badparams'] = 'The settings of toy "{$a}" are not valid JSON.';
$string['error_badurl'] = 'Enter a full web address starting with https://';
$string['error_bundledonly'] = 'This site only allows the toys that come with ToyBox, so "{$a}" can\'t be saved with this code.';
$string['error_toomanytoys'] = 'An activity can have at most {$a} toys.';
$string['error_toytoobig'] = 'A toy can be at most {$a}.';
$string['error_videohost'] = 'This site only allows videos from certain websites, and this isn\'t one of them. Upload the video instead, or ask your Moodle administrator.';
$string['error_videoid'] = 'Couldn\'t find a video in this YouTube, Vimeo or Panopto link. Copy the address of the video\'s own page.';
$string['event_result_submitted'] = 'Toy finished';
$string['event_toy_blocked'] = 'Toy stopped for opening another web page';
$string['event_toys_saved'] = 'Toys saved';
$string['finished'] = 'Finished';
$string['jumpto'] = 'Jump to this toy';
$string['loading'] = 'Loading…';
$string['markreviewed'] = 'Mark as reviewed';
$string['maxtoys'] = 'Most toys in one activity';
$string['maxtoys_desc'] = 'Saving more toys than this in one activity is refused.';
$string['maxtoysize'] = 'Largest toy (KB)';
$string['maxtoysize_desc'] = 'The most code one toy can have, in kilobytes (at most 4096). Toys made by AI are usually under 50 KB.';
$string['maxvideobytes'] = 'Largest video upload';
$string['maxvideobytes_desc'] = 'The largest video file teachers can upload to a ToyBox activity. The course and site upload limits also apply.';
$string['mode'] = 'Type';
$string['mode_help'] = 'Video with toys: interactive toys appear on top of a video at chosen moments.

Toy only: a single toy on its own, with no video. Add several ToyBox activities to a course page to build your own sequence.';
$string['mode_toy'] = 'Toy only';
$string['mode_video'] = 'Video with toys';
$string['modulename'] = 'ToyBox';
$string['modulename_help'] = 'ToyBox adds hands-on interactive "toys" to learning: small HTML widgets where learners drag, slide, build or predict to explore one idea.

Toys can appear on top of a video at the right moment (pausing it until the learner has played), or stand on their own. Educators write toys in HTML, or have an AI write them using the built-in toy guide. Every toy runs in a locked sandbox.';
$string['modulenameplural'] = 'ToyBoxes';
$string['noinstances'] = 'There are no ToyBox activities in this course.';
$string['noresults_nogroup'] = 'You aren\'t in a group, so there are no learners\' results to show.';
$string['noresults_toys'] = 'This activity has no toys yet.';
$string['noresults_users'] = 'No learners are enrolled yet.';
$string['notoysyet_editprompt'] = 'There are no toys yet.';
$string['notoyyet'] = 'This activity isn\'t ready yet.';
$string['notoyyet_teacher'] = 'This activity has no toy yet. Use "Edit toys" to make one.';
$string['novideo'] = 'This activity has no video yet.';
$string['openfullpage'] = 'Open full page';
$string['optional'] = 'optional';
$string['pluginadministration'] = 'ToyBox administration';
$string['pluginname'] = 'ToyBox';
$string['privacy:metadata:external:ipaddress'] = 'The viewer\'s IP address, as with any web page.';
$string['privacy:metadata:external:panopto'] = 'Panopto videos play in the viewer\'s browser, straight from your Panopto site, which can see who is watching (it uses the viewer\'s Panopto sign-in).';
$string['privacy:metadata:external:video'] = 'Which video is being watched, and how it is played.';
$string['privacy:metadata:external:vimeo'] = 'Vimeo videos play in the viewer\'s browser, straight from Vimeo (with "do not track" on).';
$string['privacy:metadata:external:youtube'] = 'YouTube videos play in the viewer\'s browser, straight from YouTube (in privacy-enhanced mode, youtube-nocookie.com).';
$string['privacy:metadata:toybox_result'] = 'The result each learner reports when they finish a toy.';
$string['privacy:metadata:toybox_result:attempts'] = 'How many times the learner finished the toy.';
$string['privacy:metadata:toybox_result:result'] = 'The result the toy reported (for example whether the answer was correct).';
$string['privacy:metadata:toybox_result:timecreated'] = 'When the learner first finished the toy.';
$string['privacy:metadata:toybox_result:timemodified'] = 'When the learner last finished the toy.';
$string['privacy:metadata:toybox_result:toyid'] = 'The toy.';
$string['privacy:metadata:toybox_result:userid'] = 'The learner.';
$string['privacy:metadata:toybox_toy'] = 'The toys in each activity.';
$string['privacy:metadata:toybox_toy:timemodified'] = 'When the toy was last changed.';
$string['privacy:metadata:toybox_toy:usermodified'] = 'Who last changed the toy\'s code.';
$string['privacy:metadata:toybox_toy_history'] = 'Earlier versions of each toy\'s code, so changes can be checked and undone.';
$string['privacy:metadata:toybox_toy_history:html'] = 'The toy\'s code at the time.';
$string['privacy:metadata:toybox_toy_history:timecreated'] = 'When this version was saved.';
$string['privacy:metadata:toybox_toy_history:usermodified'] = 'Who saved this version.';
$string['resetresults'] = 'Delete all toy results';
$string['results'] = 'Results';
$string['resultshelp'] = 'Hover over a tick to see what the toy reported.';
$string['review_heldback'] = 'This activity is being set up. Please come back later.';
$string['review_othersite'] = 'These toys were restored from another Moodle site, so learners can\'t see them yet. Check each toy, then mark them as reviewed (saving the toys does this too).';
$string['review_restored'] = 'These toys were restored from a backup. Learners can see them: check they still work as you expect, then mark them as reviewed.';
$string['reviewed'] = 'Toys marked as reviewed.';
$string['settings_limits'] = 'Safety and limits';
$string['theme'] = 'Look and feel';
$string['theme_auto'] = 'Match this Moodle site';
$string['theme_desc'] = 'Colours and font for ToyBox players, editors and toys. "Match this Moodle site" picks up the site theme\'s colours and font automatically. The same look is described to AI assistants when teachers use "Copy AI prompt", so AI-made toys match it too.';
$string['theme_solent'] = 'Solent University';
$string['theme_toybox'] = 'ToyBox (dark)';
$string['toybox:addinstance'] = 'Add a new ToyBox activity';
$string['toybox:edittoys'] = 'Create and edit toys (toy code runs in a sandbox)';
$string['toybox:submit'] = 'Save toy results and count towards completion';
$string['toybox:view'] = 'View ToyBox activities';
$string['toybox:viewresults'] = 'View learners\' toy results';
$string['toyboxsettings'] = 'ToyBox';
$string['toynotavailable'] = 'This toy isn\'t available. Try reloading the page.';
$string['toysinthisvideo'] = 'Toys in this video';
$string['untitled'] = 'Untitled toy';
$string['videofile'] = 'Video file';
$string['videohosts'] = 'Allowed video websites';
$string['videohosts_desc'] = 'Leave empty to allow video links from any https:// website. Or list the websites teachers may link to, one per line (for example youtube.com, vimeo.com, yourschool.cloud.panopto.eu). Subdomains are included. Uploaded videos are always allowed.';
$string['videosource'] = 'Video';
$string['videosource_help'] = 'Using online video clutters the player. Best results are gained from uploading a video.

YouTube, Vimeo and Panopto show their own titles, buttons, logos or suggested videos over the player, and ToyBox can\'t remove them all. An uploaded video shows only ToyBox\'s controls and the toys, and toys appear on exactly the right frame.';
$string['videosource_upload'] = 'Upload a video file (recommended)';
$string['videosource_url'] = 'Link: YouTube, Vimeo, Panopto or a video file (lower quality)';
$string['videourl'] = 'Video address';
$string['videourl_help'] = 'A YouTube, Vimeo or Panopto link (for example https://www.youtube.com/watch?v=…, https://vimeo.com/… or https://yourschool.cloud.panopto.eu/Panopto/Pages/Viewer.aspx?id=…), or a direct link to a video file such as https://example.com/lesson.mp4.

YouTube plays from youtube-nocookie.com (privacy-enhanced mode) and Vimeo with "do not track" on. Panopto videos need viewers to have access to the session in Panopto (for example through your Moodle sign-in). ToyBox shows its own controls; the video sites may still show some of theirs.';
