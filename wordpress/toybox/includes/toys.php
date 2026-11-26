<?php
/**
 * The "Toy" content type and how a toy is stored.
 *
 * Each Toy holds JSON in the `_toybox` post meta:
 *   { "mode": "toy"|"video", "aspect": "16:9", "video": "url", "toys": [ {id, label, html, params, start, end, rect, pause, …} ] }
 *
 * @package ToyBox
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers the Toy content type. Only administrators can create or edit toys:
 * toys are code (they run sandboxed, but it's still code).
 */
function toybox_register_post_type() {
	register_post_type(
		'toybox_toy',
		array(
			'labels'             => array(
				'name'          => __( 'Toys', 'toybox' ),
				'singular_name' => __( 'Toy', 'toybox' ),
				'add_new_item'  => __( 'Add new toy', 'toybox' ),
				'edit_item'     => __( 'Edit toy', 'toybox' ),
				'all_items'     => __( 'All toys', 'toybox' ),
				'menu_name'     => __( 'ToyBox', 'toybox' ),
				'not_found'     => __( 'No toys yet.', 'toybox' ),
			),
			'public'             => false,
			'publicly_queryable' => false,
			'show_ui'            => true,
			'show_in_menu'       => true,
			'show_in_rest'       => true, // So the block can list toys.
			'menu_icon'          => 'dashicons-art',
			'supports'           => array( 'title' ),
			'map_meta_cap'       => false,
			'capabilities'       => array(
				'edit_post'              => 'manage_options',
				'read_post'              => 'manage_options',
				'delete_post'            => 'manage_options',
				'edit_posts'             => 'manage_options',
				'edit_others_posts'      => 'manage_options',
				'publish_posts'          => 'manage_options',
				'read_private_posts'     => 'manage_options',
				'delete_posts'           => 'manage_options',
				'delete_published_posts' => 'manage_options',
				'delete_others_posts'    => 'manage_options',
				'edit_published_posts'   => 'manage_options',
				'create_posts'           => 'manage_options',
			),
		)
	);
}
add_action( 'init', 'toybox_register_post_type' );

/**
 * A toy's stored data, with defaults filled in.
 *
 * @param int $post_id The Toy's id.
 * @return array{mode: string, aspect: string, video: string, toys: array}
 */
function toybox_get_data( $post_id ) {
	$raw  = get_post_meta( $post_id, '_toybox', true );
	$data = is_string( $raw ) && '' !== $raw ? json_decode( $raw, true ) : array();
	$data = is_array( $data ) ? $data : array();
	return array(
		'mode'   => ( isset( $data['mode'] ) && 'video' === $data['mode'] ) ? 'video' : 'toy',
		'aspect' => ( isset( $data['aspect'] ) && in_array( $data['aspect'], TOYBOX_ASPECTS, true ) ) ? $data['aspect'] : '16:9',
		'video'  => isset( $data['video'] ) ? (string) $data['video'] : '',
		'toys'   => ( isset( $data['toys'] ) && is_array( $data['toys'] ) ) ? array_values( $data['toys'] ) : array(),
	);
}

/**
 * Cleans one toy sent by the editor.
 *
 * @param array $toy Raw toy.
 * @param int   $index Position (for a fallback id).
 * @return array|null
 */
function toybox_clean_toy( $toy, $index ) {
	if ( ! is_array( $toy ) ) {
		return null;
	}
	$html = isset( $toy['html'] ) ? (string) $toy['html'] : '';
	if ( strlen( $html ) > 1048576 ) { // 1 MB, as in Moodle.
		$html = '';
	}
	$rect  = isset( $toy['rect'] ) && is_array( $toy['rect'] ) ? $toy['rect'] : array();
	$pct   = static function ( $v, $d ) {
		return round( min( 100, max( 0, is_numeric( $v ) ? (float) $v : $d ) ), 2 );
	};
	$start = isset( $toy['start'] ) ? max( 0, (float) $toy['start'] ) : 0;
	$end   = isset( $toy['end'] ) ? (float) $toy['end'] : $start + 2;
	$id    = isset( $toy['id'] ) ? preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $toy['id'] ) : '';
	return array(
		'id'               => '' !== $id ? $id : 'toy-' . ( $index + 1 ),
		'label'            => sanitize_text_field( isset( $toy['label'] ) ? (string) $toy['label'] : '' ),
		// Toy code is only ever run inside a sandboxed iframe with no network access.
		'html'             => $html,
		'params'           => ( isset( $toy['params'] ) && is_array( $toy['params'] ) ) ? $toy['params'] : new stdClass(),
		'start'            => $start,
		'end'              => max( $start + 0.5, $end ),
		'rect'             => array(
			'x' => $pct( $rect['x'] ?? null, 20 ),
			'y' => $pct( $rect['y'] ?? null, 12 ),
			'w' => max( 5, $pct( $rect['w'] ?? null, 60 ) ),
			'h' => max( 5, $pct( $rect['h'] ?? null, 62 ) ),
		),
		'pause'            => ! empty( $toy['pause'] ),
		'resumeOnComplete' => ! empty( $toy['resumeOnComplete'] ),
		'required'         => ! empty( $toy['required'] ),
	);
}

/**
 * Saves the Toy's settings and toys from the edit screen.
 *
 * @param int $post_id The Toy's id.
 */
function toybox_save_post( $post_id ) {
	if ( ! isset( $_POST['toybox_nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['toybox_nonce'] ) ), 'toybox_save' ) ) {
		return;
	}
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$mode   = isset( $_POST['toybox_mode'] ) && 'video' === $_POST['toybox_mode'] ? 'video' : 'toy';
	$aspect = isset( $_POST['toybox_aspect'] ) ? sanitize_text_field( wp_unslash( $_POST['toybox_aspect'] ) ) : '16:9';
	$video  = isset( $_POST['toybox_video'] ) ? esc_url_raw( wp_unslash( $_POST['toybox_video'] ) ) : '';
	// Toy code is raw HTML by design (administrators only; it runs sandboxed), so it is not run through KSES.
	$toys = isset( $_POST['toybox_toys'] ) ? json_decode( wp_unslash( $_POST['toybox_toys'] ), true ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
	$toys = is_array( $toys ) ? array_values( array_filter( array_map( 'toybox_clean_toy', $toys, array_keys( $toys ) ) ) ) : array();
	if ( 'toy' === $mode ) {
		$toys = array_slice( $toys, 0, 1 ); // A toy on its own is a single toy.
	}
	$data = array(
		'mode'   => $mode,
		'aspect' => in_array( $aspect, TOYBOX_ASPECTS, true ) ? $aspect : '16:9',
		'video'  => $video,
		'toys'   => $toys,
	);
	update_post_meta( $post_id, '_toybox', wp_slash( wp_json_encode( $data ) ) );
}
add_action( 'save_post_toybox_toy', 'toybox_save_post' );

/**
 * Adds a "Shortcode" column to the list of toys.
 *
 * @param array $columns Columns.
 * @return array
 */
function toybox_columns( $columns ) {
	$columns['toybox_shortcode'] = __( 'Shortcode', 'toybox' );
	return $columns;
}
add_filter( 'manage_toybox_toy_posts_columns', 'toybox_columns' );

/**
 * Fills the "Shortcode" column.
 *
 * @param string $column Column.
 * @param int    $post_id Toy id.
 */
function toybox_column_content( $column, $post_id ) {
	if ( 'toybox_shortcode' === $column ) {
		echo '<code>[toybox id="' . (int) $post_id . '"]</code>';
	}
}
add_action( 'manage_toybox_toy_posts_custom_column', 'toybox_column_content', 10, 2 );
