<?php
/**
 * The Toy edit screen: a settings box and the shared ToyBox editor
 * (live preview, examples, checker, Copy AI prompt, Download toy guide).
 *
 * @package ToyBox
 */

defined( 'ABSPATH' ) || exit;

/**
 * Words used by the editor (the same keys as the Moodle plugin's editor_* strings).
 *
 * @return array<string, string>
 */
function toybox_editor_strings() {
	return array(
		'addtoy'             => __( 'Add toy', 'toybox' ),
		'allsaved'           => __( 'All changes saved', 'toybox' ),
		'aspect169'          => __( '16:9 (wide)', 'toybox' ),
		'aspect43'           => __( '4:3', 'toybox' ),
		'aspect11'           => __( 'Square', 'toybox' ),
		'aspect34'           => __( '3:4 (tall)', 'toybox' ),
		'aspectauto'         => __( 'Fit content', 'toybox' ),
		'badjson'            => __( 'These settings are not valid JSON', 'toybox' ),
		'badtoyfile'         => __( 'That isn\'t a ToyBox toy file. Toy files end in .toybox.json and come from "Export toy" in Moodle, WordPress or PowerPoint.', 'toybox' ),
		'exported'           => __( 'Toy exported: the file is downloaded and copied. Import it, or paste it into "Toy code", in any ToyBox editor (Moodle, WordPress or PowerPoint).', 'toybox' ),
		'exporttoy'          => __( 'Export toy', 'toybox' ),
		'exporttoy_help'     => __( 'Saves this toy as a .toybox.json file (and copies it), to use in Moodle, in another post or in PowerPoint.', 'toybox' ),
		'importconfirm'      => __( 'Replace this toy with the one in the file?', 'toybox' ),
		'imported'           => __( 'Toy imported. Update to keep it.', 'toybox' ),
		'importtoy'          => __( 'Import toy', 'toybox' ),
		'importtoy_help'     => __( 'Opens a .toybox.json toy file exported from Moodle, WordPress or PowerPoint. You can also paste a toy file into "Toy code".', 'toybox' ),
		'checker'            => __( 'Checker', 'toybox' ),
		'copyaiprompt'       => __( 'Copy AI prompt', 'toybox' ),
		'copyaiprompt_help'  => __( 'Copies the toy guide plus this toy\'s details. Paste it into ChatGPT, Claude, Gemini or Copilot.', 'toybox' ),
		'deletetoy'          => __( 'Delete toy', 'toybox' ),
		'deletetoyconfirm'   => __( 'Delete this toy?', 'toybox' ),
		'downloadguide'      => __( 'Download toy guide', 'toybox' ),
		'downloadguide_help' => __( 'The toy guide (Markdown) plus this site\'s style notes. Attach it to an AI chat.', 'toybox' ),
		'end'                => __( 'Ends at (seconds)', 'toybox' ),
		'height'             => __( 'Height %', 'toybox' ),
		'makewithai'         => __( 'Make it with AI:', 'toybox' ),
		'messages'           => __( 'Messages from the toy', 'toybox' ),
		'messageshelp'       => __( 'Press Preview to try the toy. Anything it reports appears here.', 'toybox' ),
		'novideo'            => __( 'No video yet. Choose one in the ToyBox settings box, then update.', 'toybox' ),
		'noproblems'         => __( 'No problems found', 'toybox' ),
		'onlinevideo'        => __( 'This uses an online video (lower quality). Video sites add their own titles and buttons over the player. For the cleanest result, use a video file from your Media Library.', 'toybox' ),
		'pausevideo'         => __( 'Pause the video', 'toybox' ),
		'posx'               => __( 'Left %', 'toybox' ),
		'posy'               => __( 'Top %', 'toybox' ),
		'preview'            => __( 'Preview', 'toybox' ),
		'previewing'         => __( 'previewing', 'toybox' ),
		'promptcopied'       => __( 'AI prompt copied. Paste it into your AI chat, fill in the [brackets], then paste the HTML it gives you into "Toy code".', 'toybox' ),
		'promptfailed'       => __( 'Couldn\'t copy to the clipboard. Use "Download toy guide" and attach the file to your AI chat instead.', 'toybox' ),
		'replacecode'        => __( 'Replace this toy\'s code with the example?', 'toybox' ),
		'requiredtoy'        => __( 'Count as finished when done', 'toybox' ),
		'resumeoncomplete'   => __( 'Resume when finished', 'toybox' ),
		'savechanges'        => __( 'Save changes', 'toybox' ),
		'saved'              => __( 'Saved', 'toybox' ),
		'shape'              => __( 'Shape', 'toybox' ),
		'start'              => __( 'Starts at (seconds)', 'toybox' ),
		'startfrom'          => __( 'Start from an example', 'toybox' ),
		'starthere'          => __( 'Start here', 'toybox' ),
		'starthere_help'     => __( 'Set the start time to where the preview video is now', 'toybox' ),
		'toy'                => __( 'Toy', 'toybox' ),
		'toycode'            => __( 'Toy code (HTML)', 'toybox' ),
		'toylabel'           => __( 'Name', 'toybox' ),
		'toyparams'          => __( 'Settings (JSON)', 'toybox' ),
		'unsaved'            => __( 'Unsaved changes', 'toybox' ),
		'untitled'           => __( 'Untitled toy', 'toybox' ),
		'width'              => __( 'Width %', 'toybox' ),
	);
}

/**
 * The video URL for the editor and player (Media Library files are already URLs).
 *
 * @param array $data Toy data.
 * @return string|null
 */
function toybox_video_url( $data ) {
	return ( 'video' === $data['mode'] && '' !== $data['video'] ) ? $data['video'] : null;
}

/**
 * Adds the boxes to the Toy edit screen.
 */
function toybox_add_meta_boxes() {
	add_meta_box( 'toybox_editor', __( 'Toy', 'toybox' ), 'toybox_editor_box', 'toybox_toy', 'normal', 'high' );
	add_meta_box( 'toybox_settings', __( 'ToyBox settings', 'toybox' ), 'toybox_settings_box', 'toybox_toy', 'side', 'high' );
}
add_action( 'add_meta_boxes', 'toybox_add_meta_boxes' );

/**
 * The settings box: type, video and the shortcode.
 *
 * @param WP_Post $post The Toy.
 */
function toybox_settings_box( $post ) {
	$data = toybox_get_data( $post->ID );
	wp_nonce_field( 'toybox_save', 'toybox_nonce' );
	?>
	<p>
		<label for="toybox-mode"><strong><?php esc_html_e( 'Type', 'toybox' ); ?></strong></label><br>
		<select id="toybox-mode" name="toybox_mode" class="widefat">
			<option value="toy" <?php selected( $data['mode'], 'toy' ); ?>><?php esc_html_e( 'A toy on its own', 'toybox' ); ?></option>
			<option value="video" <?php selected( $data['mode'], 'video' ); ?>><?php esc_html_e( 'A video with toys', 'toybox' ); ?></option>
		</select>
	</p>
	<div id="toybox-video-fields" <?php echo 'video' === $data['mode'] ? '' : 'hidden'; ?>>
		<p>
			<label for="toybox-video"><strong><?php esc_html_e( 'Video', 'toybox' ); ?></strong></label><br>
			<input type="url" id="toybox-video" name="toybox_video" class="widefat" value="<?php echo esc_attr( $data['video'] ); ?>" placeholder="https://">
		</p>
		<p>
			<button type="button" class="button" id="toybox-pick-video"><?php esc_html_e( 'Choose from Media Library', 'toybox' ); ?></button>
		</p>
		<p class="description">
			<?php esc_html_e( 'A video file from your Media Library looks best. YouTube, Vimeo and Panopto links also work (lower quality: those sites add their own titles and buttons over the player).', 'toybox' ); ?>
		</p>
	</div>
	<?php if ( 'publish' === $post->post_status ) : ?>
		<p>
			<strong><?php esc_html_e( 'Shortcode', 'toybox' ); ?></strong><br>
			<input type="text" readonly class="widefat code" onclick="this.select()" value="<?php echo esc_attr( '[toybox id="' . $post->ID . '"]' ); ?>">
		</p>
		<p class="description"><?php esc_html_e( 'Or add the "ToyBox" block in the block editor.', 'toybox' ); ?></p>
	<?php endif; ?>
	<?php
}

/**
 * The editor box: the shared ToyBox editor mounts here. Its changes are copied
 * into hidden fields, so WordPress's own Publish/Update button saves them.
 *
 * @param WP_Post $post The Toy.
 */
function toybox_editor_box( $post ) {
	$data   = toybox_get_data( $post->ID );
	$config = array(
		'mode'      => $data['mode'],
		'aspect'    => $data['aspect'],
		'theme'     => toybox_theme_setting(),
		'site'      => toybox_site_tokens(),
		'videoUrl'  => toybox_video_url( $data ),
		'sdkUrl'    => TOYBOX_URL . 'assets/sdk/toybox-sdk.js',
		'pluginUrl' => TOYBOX_URL . 'assets/',
		'guideUrl'  => TOYBOX_URL . 'assets/guide/toybox-toy-guide.md',
		'toys'      => $data['toys'],
		'strings'   => toybox_editor_strings(),
	);
	?>
	<input type="hidden" name="toybox_toys" id="toybox-toys" value="<?php echo esc_attr( wp_json_encode( $data['toys'] ) ); ?>">
	<input type="hidden" name="toybox_aspect" id="toybox-aspect" value="<?php echo esc_attr( $data['aspect'] ); ?>">
	<div id="toybox-editor-root" class="toybox-editor-root">
		<script type="application/json" class="toybox-config"><?php echo wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ); ?></script>
	</div>
	<?php
}

/**
 * Loads the editor (and the Media Library picker) on the Toy edit screen only.
 *
 * @param string $hook Admin page.
 */
function toybox_admin_assets( $hook ) {
	$screen = get_current_screen();
	if ( ! $screen || 'toybox_toy' !== $screen->post_type || ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
		return;
	}
	wp_enqueue_media();
	wp_enqueue_style( 'toybox-editor', TOYBOX_URL . 'assets/editor.css', array(), TOYBOX_VERSION );
	wp_enqueue_script( 'toybox-editor', TOYBOX_URL . 'assets/editor.js', array(), TOYBOX_VERSION, true );
}
add_action( 'admin_enqueue_scripts', 'toybox_admin_assets' );
