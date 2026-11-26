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
     * YouTube and Vimeo URLs are recognised (and rejected by the form for now).
     */
    public function test_streaming_sites(): void {
        $this->assertTrue(toys::is_streaming_site('https://www.youtube.com/watch?v=x'));
        $this->assertTrue(toys::is_streaming_site('https://youtu.be/x'));
        $this->assertTrue(toys::is_streaming_site('https://vimeo.com/123'));
        $this->assertFalse(toys::is_streaming_site('https://example.com/youtube.com.mp4'));
    }
}
