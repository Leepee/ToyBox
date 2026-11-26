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

namespace mod_toybox;

use mod_toybox\external\record_result;
use mod_toybox\external\save_toys;
use mod_toybox\local\toys;
use PHPUnit\Framework\Attributes\CoversClass;

#[CoversClass(toys::class)]
#[CoversClass(save_toys::class)]
#[CoversClass(record_result::class)]
#[CoversClass(\mod_toybox\completion\custom_completion::class)]
/**
 * Tests for saving toys, recording results and completion.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \mod_toybox\local\toys
 * @covers     \mod_toybox\external\save_toys
 * @covers     \mod_toybox\external\record_result
 * @covers     \mod_toybox\completion\custom_completion
 */
final class toybox_test extends \advanced_testcase {
    /**
     * Saving toys inserts, updates and deletes, and keeps results of kept toys.
     */
    public function test_save_toys(): void {
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $toybox = $this->getDataGenerator()->create_module('toybox', ['course' => $course->id, 'mode' => 'video']);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'editingteacher');
        $this->setUser($teacher);

        $result = save_toys::execute($toybox->cmid, '16:9', json_encode([
            ['id' => 0, 'label' => 'A', 'html' => '<p>a</p>', 'params' => ['n' => 1], 'start' => 5, 'end' => 7,
                'rect' => ['x' => 10, 'y' => 10, 'w' => 50, 'h' => 50], 'pause' => true, 'required' => true],
            ['id' => 0, 'label' => 'B', 'html' => '<p>b</p>', 'start' => 9, 'end' => 3, 'rect' => ['x' => 250]],
        ]));
        $saved = json_decode($result['toys'], true);
        $this->assertCount(2, $saved);
        $this->assertEquals(['n' => 1], $saved[0]['params']);
        $this->assertEquals(9.5, $saved[1]['end'], 'End is forced after start');
        $this->assertEquals(100, $saved[1]['rect']['x'], 'Positions are clamped');

        // A learner finishes toy A, then the teacher deletes B and renames A.
        $student = $this->getDataGenerator()->create_and_enrol($course, 'student');
        toys::record_result((object) ['id' => $saved[0]['id'], 'toyboxid' => $toybox->id], $student->id, '{"ok":true}');
        $saved[0]['label'] = 'A2';
        save_toys::execute($toybox->cmid, '16:9', json_encode([$saved[0]]));

        $this->assertEquals(['A2'], array_column(toys::get_toys($toybox->id), 'label'));
        $this->assertEquals([$saved[0]['id']], toys::finished_toy_ids($toybox->id, $student->id));
    }

    /**
     * Toy-only activities keep a single toy.
     */
    public function test_toy_mode_keeps_one_toy(): void {
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $toybox = $this->getDataGenerator()->create_module('toybox', ['course' => $course->id, 'mode' => 'toy']);
        $this->setAdminUser();
        save_toys::execute($toybox->cmid, 'auto', json_encode([['label' => 'one'], ['label' => 'two']]));
        $this->assertCount(1, toys::get_toys($toybox->id));
        global $DB;
        $this->assertEquals('auto', $DB->get_field('toybox', 'aspect', ['id' => $toybox->id]));
    }

    /**
     * Students can't edit toys.
     */
    public function test_students_cannot_save_toys(): void {
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $toybox = $this->getDataGenerator()->create_module('toybox', ['course' => $course->id]);
        $this->setUser($this->getDataGenerator()->create_and_enrol($course, 'student'));
        $this->expectException(\required_capability_exception::class);
        save_toys::execute($toybox->cmid, '16:9', '[]');
    }

    /**
     * Finishing every required toy completes the activity; optional toys don't count.
     */
    public function test_completion(): void {
        global $CFG;
        $this->resetAfterTest();
        $CFG->enablecompletion = 1;
        $course = $this->getDataGenerator()->create_course(['enablecompletion' => 1]);
        $toybox = $this->getDataGenerator()->create_module('toybox', [
            'course' => $course->id, 'mode' => 'video',
            'completion' => COMPLETION_TRACKING_AUTOMATIC, 'completionrequired' => 1,
        ]);
        $gen = $this->getDataGenerator()->get_plugin_generator('mod_toybox');
        $a = $gen->create_toy($toybox, ['label' => 'A']);
        $b = $gen->create_toy($toybox, ['label' => 'B']);
        $c = $gen->create_toy($toybox, ['label' => 'Optional', 'required' => 0]);
        $student = $this->getDataGenerator()->create_and_enrol($course, 'student');
        $this->setUser($student);

        $r = record_result::execute($toybox->cmid, $a->id, '{"correct":true}');
        $this->assertTrue($r['saved']);
        $this->assertFalse($r['activitycomplete']);
        $r = record_result::execute($toybox->cmid, $c->id, 'null');
        $this->assertFalse($r['activitycomplete'], 'Optional toys do not complete the activity');
        $r = record_result::execute($toybox->cmid, $b->id, '{"correct":false}');
        $this->assertTrue($r['activitycomplete']);

        // Finishing again counts attempts.
        record_result::execute($toybox->cmid, $a->id, '{"correct":true}');
        global $DB;
        $this->assertEquals(2, $DB->get_field('toybox_result', 'attempts', ['toyid' => $a->id, 'userid' => $student->id]));
    }

    /**
     * Results that are too large or not JSON are replaced with a note.
     */
    public function test_bad_results_are_replaced(): void {
        global $DB;
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $toybox = $this->getDataGenerator()->create_module('toybox', ['course' => $course->id]);
        $toy = $this->getDataGenerator()->get_plugin_generator('mod_toybox')->create_toy($toybox);
        toys::record_result($toy, 2, 'not json');
        $stored = json_decode($DB->get_field('toybox_result', 'result', ['toyid' => $toy->id]), true);
        $this->assertArrayHasKey('note', $stored);
    }

    /**
     * YouTube and Vimeo links are recognised, and their video ids found.
     */
    public function test_video_links(): void {
        $this->assertEquals('youtube', toys::video_provider('https://www.youtube.com/watch?v=jNQXAC9IVRw'));
        $this->assertEquals('jNQXAC9IVRw', toys::video_id('https://www.youtube.com/watch?v=jNQXAC9IVRw&t=4'));
        $this->assertEquals('jNQXAC9IVRw', toys::video_id('https://youtu.be/jNQXAC9IVRw'));
        $this->assertEquals('jNQXAC9IVRw', toys::video_id('https://www.youtube.com/shorts/jNQXAC9IVRw'));
        $this->assertEquals('jNQXAC9IVRw', toys::video_id('https://www.youtube-nocookie.com/embed/jNQXAC9IVRw'));
        $this->assertNull(toys::video_id('https://www.youtube.com/channel/abc'));
        $this->assertEquals('vimeo', toys::video_provider('https://vimeo.com/76979871'));
        $this->assertEquals('76979871', toys::video_id('https://player.vimeo.com/video/76979871?h=abc'));
        $this->assertNull(toys::video_provider('https://example.com/youtube.com.mp4'));
        $panopto = 'https://ox.cloud.panopto.eu/Panopto/Pages/Embed.aspx?id=973a4b1a-edab-4672-8b20-ac080169dc9b';
        $this->assertEquals('panopto', toys::video_provider($panopto));
        $this->assertEquals('973a4b1a-edab-4672-8b20-ac080169dc9b', toys::video_id($panopto));
        $this->assertNull(toys::video_id('https://ox.cloud.panopto.eu/Panopto/Pages/Viewer.aspx?id=nope'));
    }

    /**
     * A ToyBox set to show on the course page has no link and puts the player in the course page.
     */
    public function test_course_page_display(): void {
        global $PAGE;
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $inline = $this->getDataGenerator()->create_module('toybox', ['course' => $course->id, 'display' => 'inline']);
        $page = $this->getDataGenerator()->create_module('toybox', ['course' => $course->id]);
        $this->getDataGenerator()->get_plugin_generator('mod_toybox')->create_toy($inline);
        $this->setUser($this->getDataGenerator()->create_and_enrol($course, 'student'));
        $PAGE->set_url('/course/view.php', ['id' => $course->id]);

        $modinfo = get_fast_modinfo($course);
        $cm = $modinfo->get_cm($inline->cmid);
        $this->assertNull($cm->url, 'No link to a separate page');
        $content = $cm->get_formatted_content();
        $this->assertStringContainsString('data-region="mod-toybox"', $content);
        $this->assertStringContainsString('"inline":true', html_entity_decode($content));

        $other = $modinfo->get_cm($page->cmid);
        $this->assertNotNull($other->url);
        $this->assertStringNotContainsString('data-region="mod-toybox"', $other->get_formatted_content());
    }

    /**
     * Viewing a course-page ToyBox (via the web service) counts for view completion.
     */
    public function test_view_service_completes_view(): void {
        global $CFG;
        $this->resetAfterTest();
        $CFG->enablecompletion = 1;
        $course = $this->getDataGenerator()->create_course(['enablecompletion' => 1]);
        $toybox = $this->getDataGenerator()->create_module('toybox', [
            'course' => $course->id, 'display' => 'inline',
            'completion' => COMPLETION_TRACKING_AUTOMATIC, 'completionview' => 1,
        ]);
        $student = $this->getDataGenerator()->create_and_enrol($course, 'student');
        $this->setUser($student);
        $sink = $this->redirectEvents();
        $this->assertTrue(\mod_toybox\external\view_toybox::execute($toybox->cmid)['status']);
        $this->assertInstanceOf(\mod_toybox\event\course_module_viewed::class, $sink->get_events()[0]);
        $cm = get_fast_modinfo($course)->get_cm($toybox->cmid);
        $state = (new \completion_info($course))->get_data($cm, false, $student->id)->completionstate;
        $this->assertEquals(COMPLETION_COMPLETE, $state);
    }
}
