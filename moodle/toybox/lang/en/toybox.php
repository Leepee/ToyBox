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
$string['editor_copyaiprompt'] = 'Copy AI prompt';
$string['editor_copyaiprompt_help'] = 'Copies the toy guide plus this toy\'s details. Paste it into ChatGPT, Claude, Gemini or Copilot.';
$string['editor_deletetoy'] = 'Delete toy';
$string['editor_deletetoyconfirm'] = 'Delete this toy? When you save, learners\' results for it will be deleted too.';
$string['editor_downloadguide'] = 'Download toy guide';
$string['editor_downloadguide_help'] = 'The toy guide plus this site\'s style notes. Attach it to an AI chat.';
$string['editor_end'] = 'Ends at (seconds)';
$string['editor_height'] = 'Height %';
$string['editor_makewithai'] = 'Make it with AI:';
$string['editor_messages'] = 'Messages from the toy';
$string['editor_messageshelp'] = 'Press Preview to try the toy. Anything it reports appears here.';
$string['editor_noproblems'] = 'No problems found';
$string['editor_novideo'] = 'This activity has no video yet. Add one in the activity settings.';
$string['editor_onlinevideo'] = 'This activity uses an online video (lower quality). YouTube and Vimeo add their own titles and buttons over the player. For the cleanest result, upload the video file in the activity settings.';
$string['editor_pausevideo'] = 'Pause the video';
$string['editor_posx'] = 'Left %';
$string['editor_posy'] = 'Top %';
$string['editor_preview'] = 'Preview';
$string['editor_previewing'] = 'previewing';
$string['editor_promptcopied'] = 'AI prompt copied. Paste it into your AI chat, fill in the [brackets], then paste the HTML it gives you into "Toy code".';
$string['editor_promptfailed'] = 'Couldn\'t copy to the clipboard. Use "Download toy guide" and attach the file to your AI chat instead.';
$string['editor_replacecode'] = 'Replace this toy\'s code with the example?';
$string['editor_requiredtoy'] = 'Required for completion';
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
$string['error_badurl'] = 'Enter a full web address starting with http:// or https://';
$string['error_toytoobig'] = 'A toy can be at most 1 MB.';
$string['error_videoid'] = 'Couldn\'t find a video in this YouTube or Vimeo link. Copy the address of the video\'s own page.';
$string['finished'] = 'Finished';
$string['jumpto'] = 'Jump to this toy';
$string['loading'] = 'Loading…';
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
$string['noresults_toys'] = 'This activity has no toys yet.';
$string['noresults_users'] = 'No learners are enrolled yet.';
$string['notoysyet_editprompt'] = 'There are no toys yet.';
$string['notoyyet'] = 'This activity isn\'t ready yet.';
$string['notoyyet_teacher'] = 'This activity has no toy yet. Use "Edit toys" to make one.';
$string['novideo'] = 'This activity has no video yet.';
$string['optional'] = 'optional';
$string['pluginadministration'] = 'ToyBox administration';
$string['pluginname'] = 'ToyBox';
$string['privacy:metadata:toybox_result'] = 'The result each learner reports when they finish a toy.';
$string['privacy:metadata:toybox_result:attempts'] = 'How many times the learner finished the toy.';
$string['privacy:metadata:toybox_result:result'] = 'The result the toy reported (for example whether the answer was correct).';
$string['privacy:metadata:toybox_result:timecreated'] = 'When the learner first finished the toy.';
$string['privacy:metadata:toybox_result:timemodified'] = 'When the learner last finished the toy.';
$string['privacy:metadata:toybox_result:toyid'] = 'The toy.';
$string['privacy:metadata:toybox_result:userid'] = 'The learner.';
$string['resetresults'] = 'Delete all toy results';
$string['results'] = 'Results';
$string['resultshelp'] = 'Hover over a tick to see what the toy reported.';
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
$string['toysinthisvideo'] = 'Toys in this video';
$string['untitled'] = 'Untitled toy';
$string['videofile'] = 'Video file';
$string['videosource'] = 'Video';
$string['videosource_help'] = 'Using online video clutters the player. Best results are gained from uploading a video.

YouTube and Vimeo show their own titles, buttons, logos and suggested videos over the player, and ToyBox can\'t remove them. An uploaded video shows only ToyBox\'s controls and the toys, and toys appear on exactly the right frame.';
$string['videosource_upload'] = 'Upload a video file (recommended)';
$string['videosource_url'] = 'Link: YouTube, Vimeo or a video file (lower quality)';
$string['videourl'] = 'Video address';
$string['videourl_help'] = 'A YouTube or Vimeo link (for example https://www.youtube.com/watch?v=… or https://vimeo.com/…), or a direct link to a video file such as https://example.com/lesson.mp4.

YouTube videos play from youtube-nocookie.com (privacy-enhanced mode). Vimeo videos play with "do not track" on. ToyBox shows its own controls; some Vimeo plans still show Vimeo\'s.';
