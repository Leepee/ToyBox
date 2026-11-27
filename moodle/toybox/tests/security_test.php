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

use mod_toybox\external\get_toy_history;
use mod_toybox\external\record_result;
use mod_toybox\external\report_blocked;
use mod_toybox\external\save_toys;
use mod_toybox\local\results;
use mod_toybox\local\toys;
use PHPUnit\Framework\Attributes\CoversClass;

#[CoversClass(toys::class)]
#[CoversClass(results::class)]
#[CoversClass(get_toy_history::class)]
#[CoversClass(report_blocked::class)]
#[CoversClass(\mod_toybox\privacy\provider::class)]
/**
 * Tests for the safety features: toy history, audit events, limits, groups, restore review.
 *
 * @package    mod_toybox
 * @copyright  2026 ToyBox contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \mod_toybox\local\toys
 * @covers     \mod_toybox\local\results
 * @covers     \mod_toybox\external\get_toy_history
 * @covers     \mod_toybox\external\report_blocked
 * @covers     \mod_toybox\privacy\provider
 */
final class security_test extends \advanced_testcase {
    /**
     * A course with a video ToyBox, an editing teacher and a student.
     *
     * @return array [course, toybox, teacher, student]
     */
    private function setup_course(): array {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $course = $gen->create_course();
        $toybox = $gen->create_module('toybox', ['course' => $course->id, 'mode' => 'video']);
        return [$course, $toybox, $gen->create_and_enrol($course, 'editingteacher'), $gen->create_and_enrol($course, 'student')];
    }

    /**
     * Saves toys as the current user and returns them as stored.
     *
     * @param \stdClass $toybox
     * @param array $toys
     * @return array
     */
    private function save(\stdClass $toybox, array $toys): array {
        return json_decode(save_toys::execute($toybox->cmid, '16:9', json_encode($toys))['toys'], true);
    }

    /**
     * Each change of code is kept with who made it; teachers can fetch earlier versions, learners can't.
     */
    public function test_history(): void {
        [, $toybox, $teacher, $student] = $this->setup_course();
        $this->setUser($teacher);
        $toy = $this->save($toybox, [['id' => 0, 'label' => 'A', 'html' => '<p>one</p>']])[0];
        $toy['label'] = 'A renamed';
        $toy = $this->save($toybox, [$toy])[0]; // Same code: no new version.
        $toy['html'] = '<p>two</p>';
        $this->save($toybox, [$toy]);

        global $DB;
        $this->assertEquals($teacher->id, $DB->get_field('toybox_toy', 'usermodified', ['id' => $toy['id']]));
        $list = get_toy_history::execute($toybox->cmid, $toy['id']);
        $this->assertCount(2, $list['versions']);
        $this->assertEquals(fullname($teacher), $list['versions'][0]['who']);
        $older = get_toy_history::execute($toybox->cmid, $toy['id'], $list['versions'][1]['id']);
        $this->assertEquals('<p>one</p>', $older['html']);

        $this->setUser($student);
        $this->expectException(\required_capability_exception::class);
        get_toy_history::execute($toybox->cmid, $toy['id']);
    }

    /**
     * Only the newest versions are kept.
     */
    public function test_history_is_trimmed(): void {
        [, $toybox, $teacher] = $this->setup_course();
        $this->setUser($teacher);
        $toy = $this->save($toybox, [['id' => 0, 'label' => 'A', 'html' => '<p>0</p>']])[0];
        for ($i = 1; $i <= toys::HISTORY_KEEP + 3; $i++) {
            $toy['html'] = "<p>$i</p>";
            $toy = $this->save($toybox, [$toy])[0];
        }
        global $DB;
        $this->assertEquals(toys::HISTORY_KEEP, $DB->count_records('toybox_toy_history', ['toyid' => $toy['id']]));
    }

    /**
     * Saving toys, finishing a toy and a toy being stopped are all logged.
     */
    public function test_events(): void {
        [, $toybox, $teacher, $student] = $this->setup_course();
        $this->setUser($teacher);
        $sink = $this->redirectEvents();
        $toy = $this->save($toybox, [['id' => 0, 'label' => 'A', 'html' => '<p>a</p>']])[0];
        $saved = array_values(array_filter($sink->get_events(), fn($e) => $e instanceof event\toys_saved));
        $this->assertCount(1, $saved);
        $this->assertEquals(1, $saved[0]->other['changed']);
        $this->assertEquals(40, strlen($saved[0]->other['hash']));

        $this->setUser($student);
        $sink->clear();
        record_result::execute($toybox->cmid, $toy['id'], 'null');
        report_blocked::execute($toybox->cmid, $toy['id']);
        $names = array_map(fn($e) => get_class($e), $sink->get_events());
        $this->assertContains(event\result_submitted::class, $names);
        $this->assertContains(event\toy_blocked::class, $names);
    }

    /**
     * The site's limits on how many toys and how big are applied.
     */
    public function test_limits(): void {
        [, $toybox, $teacher] = $this->setup_course();
        $this->setUser($teacher);
        set_config('maxtoys', 2, 'mod_toybox');
        set_config('maxtoysize', 1, 'mod_toybox');
        try {
            $this->save($toybox, [['label' => 'A'], ['label' => 'B'], ['label' => 'C']]);
            $this->fail('Too many toys were saved');
        } catch (\moodle_exception $e) {
            $this->assertEquals('error_toomanytoys', $e->errorcode);
        }
        $this->expectExceptionMessage(get_string('error_toytoobig', 'toybox', display_size(1024)));
        $this->save($toybox, [['label' => 'A', 'html' => str_repeat('x', 2000)]]);
    }

    /**
     * With "bundled toys only", only the toys that come with ToyBox can be saved (existing code may stay).
     */
    public function test_bundled_only(): void {
        global $CFG;
        [, $toybox, $teacher] = $this->setup_course();
        $this->setUser($teacher);
        $custom = $this->save($toybox, [['id' => 0, 'label' => 'Custom', 'html' => '<p>custom</p>']])[0];
        set_config('bundledonly', 1, 'mod_toybox');

        $custom['label'] = 'Still custom';
        $this->save($toybox, [$custom]); // Unchanged code is fine.
        $wave = file_get_contents($CFG->dirroot . '/mod/toybox/toys/wave-lab.html');
        $this->assertCount(2, $this->save($toybox, [$custom, ['id' => 0, 'label' => 'Wave', 'html' => $wave]]));

        $this->expectExceptionMessage(get_string('error_bundledonly', 'toybox', 'Changed'));
        $custom['label'] = 'Changed';
        $custom['html'] = '<p>changed</p>';
        $this->save($toybox, [$custom]);
    }

    /**
     * Video links must be https, and on the site's list of video websites if it has one.
     */
    public function test_video_url_allowed(): void {
        $this->resetAfterTest();
        $this->assertTrue(toys::video_url_allowed('https://example.com/a.mp4'));
        $this->assertFalse(toys::video_url_allowed('http://example.com/a.mp4'));
        $this->assertFalse(toys::video_url_allowed('javascript:alert(1)'));
        set_config('videohosts', "youtube.com\nsolent.cloud.panopto.eu", 'mod_toybox');
        $this->assertTrue(toys::video_url_allowed('https://www.youtube.com/watch?v=jNQXAC9IVRw'));
        $this->assertTrue(toys::video_url_allowed('https://solent.cloud.panopto.eu/Panopto/Pages/Embed.aspx?id=x'));
        $this->assertFalse(toys::video_url_allowed('https://example.com/a.mp4'));
        $this->assertFalse(toys::video_url_allowed('https://notyoutube.com/a.mp4'));
    }

    /**
     * Players load toys from toy.php (no code in the page), and the content policy comes first.
     */
    public function test_toy_frames(): void {
        [, $toybox, $teacher] = $this->setup_course();
        $this->setUser($teacher);
        $toy = $this->save($toybox, [['id' => 0, 'label' => 'A', 'html' => '<!DOCTYPE html><p>a</p>']])[0];
        $record = toys::get_toys($toybox->id)[0];
        $forplayer = toys::export_for_js(toys::get_toys($toybox->id, false), $toybox->cmid)[0];
        $this->assertArrayNotHasKey('html', $forplayer);
        $this->assertStringContainsString('/mod/toybox/toy.php?id=' . $toybox->cmid, $forplayer['toy']);
        $this->assertStringContainsString('rev=' . toys::toy_rev($record), $forplayer['toy']);

        $html = toys::prepare_html($record->html, 'https://example.com/sdk.js');
        $this->assertStringStartsWith('<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy"', $html);
        $this->assertStringContainsString('<script src="https://example.com/sdk.js"></script><p>a</p>', $html);
        $this->assertStringContainsString('sandbox allow-scripts', toys::toy_csp('https://example.com/sdk.js', true));

        // Saving changes the address, so browsers fetch the new code.
        $this->waitForSecond();
        $toy['html'] = '<p>b</p>';
        $this->save($toybox, [$toy]);
        $this->assertNotEquals(toys::toy_rev($record), toys::toy_rev(toys::get_toys($toybox->id)[0]));
    }

    /**
     * With separate groups, teachers without "access all groups" see only their groups' learners.
     */
    public function test_results_groups(): void {
        $this->resetAfterTest();
        $gen = $this->getDataGenerator();
        $course = $gen->create_course(['groupmode' => SEPARATEGROUPS, 'groupmodeforce' => 1]);
        $toybox = $gen->create_module('toybox', ['course' => $course->id]);
        $cm = get_fast_modinfo($course)->get_cm($toybox->cmid);
        $context = \context_module::instance($cm->id);
        $ga = $gen->create_group(['courseid' => $course->id]);
        $gb = $gen->create_group(['courseid' => $course->id]);
        $s1 = $gen->create_and_enrol($course, 'student');
        $s2 = $gen->create_and_enrol($course, 'student');
        $gen->create_group_member(['groupid' => $ga->id, 'userid' => $s1->id]);
        $gen->create_group_member(['groupid' => $gb->id, 'userid' => $s2->id]);
        $tutor = $gen->create_and_enrol($course, 'teacher');
        $gen->create_group_member(['groupid' => $ga->id, 'userid' => $tutor->id]);
        $loner = $gen->create_and_enrol($course, 'teacher');

        $this->setUser($tutor);
        $group = results::visible_group($cm, $context);
        $this->assertEquals($ga->id, $group);
        [$users, $total] = results::learners($context, $group);
        $this->assertEquals([$s1->id], array_column($users, 'id'));
        $this->assertEquals(1, $total);
        $this->assertObjectNotHasProperty('email', $users[0]);

        $this->setUser($loner);
        $this->assertNull(results::visible_group($cm, $context));

        $this->setAdminUser();
        $this->assertEquals(0, results::visible_group($cm, $context));
        $this->assertEquals(2, results::learners($context, 0)[1]);
        $this->assertCount(1, results::learners($context, 0, 1, 1)[0], 'Paged');
    }

    /**
     * Restored toys stay visible with a review notice; from another site they're held back until reviewed.
     */
    public function test_restore_review(): void {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/backup/util/includes/backup_includes.php');
        require_once($CFG->dirroot . '/backup/util/includes/restore_includes.php');
        [$course, $toybox, $teacher, $student] = $this->setup_course();
        $this->getDataGenerator()->get_plugin_generator('mod_toybox')->create_toy($toybox);
        $this->setAdminUser();

        // Duplicating (an import within the site) needs no review.
        $copy = duplicate_module($course, get_fast_modinfo($course)->get_cm($toybox->cmid));
        $this->assertEquals(0, $DB->get_field('toybox', 'restorereview', ['id' => $copy->instance]));

        // A backup restored on the same site: teachers are asked to review, learners still see the toys.
        $bc = new \backup_controller(
            \backup::TYPE_1ACTIVITY,
            $toybox->cmid,
            \backup::FORMAT_MOODLE,
            \backup::INTERACTIVE_NO,
            \backup::MODE_GENERAL,
            get_admin()->id
        );
        $bc->execute_plan();
        $file = $bc->get_results()['backup_destination'];
        $bc->destroy();
        $dir = 'toybox_test_' . time();
        $file->extract_to_pathname(get_file_packer('application/vnd.moodle.backup'), $CFG->backuptempdir . '/' . $dir);
        $rc = new \restore_controller(
            $dir,
            $course->id,
            \backup::INTERACTIVE_NO,
            \backup::MODE_GENERAL,
            get_admin()->id,
            \backup::TARGET_EXISTING_ADDING
        );
        $rc->execute_precheck();
        $rc->execute_plan();
        $rc->destroy();
        $restored = $DB->get_record_sql('SELECT * FROM {toybox} WHERE course = ? ORDER BY id DESC', [$course->id], IGNORE_MULTIPLE);
        $this->assertEquals(1, $restored->restorereview);
        $this->assertEquals(1, $DB->count_records('toybox_toy_history', ['toyboxid' => $restored->id]));
        $cm = get_coursemodule_from_instance('toybox', $restored->id);
        $context = \context_module::instance($cm->id);
        $this->setUser($student);
        $this->assertFalse(toys::held_back($restored, $context));

        // From another site: held back from learners, not from teachers.
        $restored->restorereview = 2;
        $this->assertTrue(toys::held_back($restored, $context));
        $this->setUser($teacher);
        $this->assertFalse(toys::held_back($restored, $context));
    }

    /**
     * Privacy: who changed toys is found, exported and forgotten (the toys themselves stay).
     */
    public function test_privacy_toy_editors(): void {
        global $DB;
        [, $toybox, $teacher] = $this->setup_course();
        $this->setUser($teacher);
        $toy = $this->save($toybox, [['id' => 0, 'label' => 'A', 'html' => '<p>a</p>']])[0];
        $context = \context_module::instance($toybox->cmid);

        $contexts = privacy\provider::get_contexts_for_userid($teacher->id)->get_contextids();
        $this->assertContains((string) $context->id, array_map('strval', $contexts));
        $userlist = new \core_privacy\local\request\userlist($context, 'mod_toybox');
        privacy\provider::get_users_in_context($userlist);
        $this->assertContains((int) $teacher->id, array_map('intval', $userlist->get_userids()));

        $approved = new \core_privacy\local\request\approved_contextlist($teacher, 'mod_toybox', [$context->id]);
        privacy\provider::export_user_data($approved);
        $data = \core_privacy\local\request\writer::with_context($context)->get_data([]);
        $this->assertEquals('A', $data->toyedits[0]['toy']);

        privacy\provider::delete_data_for_user($approved);
        $this->assertEquals(0, $DB->get_field('toybox_toy', 'usermodified', ['id' => $toy['id']]));
        $this->assertEquals(0, $DB->count_records('toybox_toy_history', ['usermodified' => $teacher->id]));
        $this->assertEquals(1, $DB->count_records('toybox_toy', ['toyboxid' => $toybox->id]));
    }
}
