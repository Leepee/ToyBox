<?php
/**
 * Showing toys on the site: the [toybox id="…"] shortcode and the ToyBox block.
 *
 * @package ToyBox
 */

defined( 'ABSPATH' ) || exit;

/**
 * The HTML for one Toy (the player is built by assets/view.js when it scrolls into view).
 *
 * @param int $post_id The Toy's id.
 * @return string
 */
function toybox_render( $post_id ) {
	$post = get_post( $post_id );
	if ( ! $post || 'toybox_toy' !== $post->post_type ) {
		return '';
	}
	// Drafts only show to people who can edit toys.
	if ( 'publish' !== $post->post_status && ! current_user_can( 'manage_options' ) ) {
		return '';
	}
	$data = toybox_get_data( $post_id );
	if ( ! $data['toys'] ) {
		return '';
	}
	wp_enqueue_style( 'toybox', TOYBOX_URL . 'assets/toybox.css', array(), TOYBOX_VERSION );
	wp_enqueue_script( 'toybox', TOYBOX_URL . 'assets/view.js', array(), TOYBOX_VERSION, true );

	// The player loads each toy from its own address (see frame.php), not from the page.
	$toys = array_map(
		static function ( $toy ) use ( $post_id ) {
			$toy['toy'] = toybox_frame_url( $post_id, $toy );
			unset( $toy['html'] );
			return $toy;
		},
		$data['toys']
	);
	$config = array(
		'mode'     => $data['mode'],
		'aspect'   => $data['aspect'],
		'theme'    => toybox_theme_setting(),
		'site'     => toybox_site_tokens(),
		'videoUrl' => toybox_video_url( $data ),
		'sdkUrl'   => toybox_sdk_url(),
		'toys'     => $toys,
		'strings'  => array(
			'toysinthisvideo' => __( 'Toys in this video', 'toybox' ),
			'jumpto'          => __( 'Jump to this toy', 'toybox' ),
			'finished'        => __( 'Finished', 'toybox' ),
			'untitled'        => __( 'Untitled toy', 'toybox' ),
		),
	);
	return '<div class="toybox-wp" data-region="toybox">'
		. '<script type="application/json" class="toybox-config">'
		. wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT )
		. '</script><div class="toybox-stage"></div></div>';
}

/**
 * The [toybox id="123"] shortcode.
 *
 * @param array $atts Attributes.
 * @return string
 */
function toybox_shortcode( $atts ) {
	$atts = shortcode_atts( array( 'id' => 0 ), $atts, 'toybox' );
	return toybox_render( (int) $atts['id'] );
}
add_shortcode( 'toybox', 'toybox_shortcode' );

/**
 * The ToyBox block (rendered on the server, like the shortcode).
 */
function toybox_register_block() {
	wp_register_script(
		'toybox-block',
		TOYBOX_URL . 'block/block.js',
		array( 'wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-data', 'wp-core-data', 'wp-i18n' ),
		TOYBOX_VERSION,
		true
	);
	register_block_type(
		TOYBOX_DIR . 'block',
		array(
			'render_callback' => static function ( $attributes ) {
				return toybox_render( (int) ( $attributes['toyId'] ?? 0 ) );
			},
		)
	);
}
add_action( 'init', 'toybox_register_block' );
