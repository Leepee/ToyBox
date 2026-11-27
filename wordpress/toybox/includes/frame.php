<?php
/**
 * Serves one toy's code on its own, for the player's sandboxed iframe:
 * /?toybox_frame=<toy post id>&toy=<toy id>&rev=<hash>
 *
 * Serving toys from their own address means the content policy is an HTTP header
 * (nothing in the toy can switch it off or get in ahead of it), and pages don't
 * carry every toy's code. The address changes whenever the toy's code does, so
 * browsers can cache it until then.
 *
 * @package ToyBox
 */

defined( 'ABSPATH' ) || exit;

/**
 * The SDK's address.
 *
 * @return string
 */
function toybox_sdk_url() {
	return TOYBOX_URL . 'assets/sdk/toybox-sdk.js';
}

/**
 * The content policy every toy runs under: its own inline code and the ToyBox SDK only, no network.
 *
 * @param bool $header True for the HTTP header (adds the sandbox, in case the address is opened directly).
 * @return string
 */
function toybox_toy_csp( $header = false ) {
	$rules = array(
		"default-src 'none'",
		"script-src 'unsafe-inline' " . toybox_sdk_url(),
		"style-src 'unsafe-inline'",
		'img-src data: blob:',
		'media-src data: blob:',
		'font-src data:',
		"connect-src 'none'",
		"form-action 'none'",
		"base-uri 'none'",
	);
	if ( $header ) {
		$rules[] = 'sandbox allow-scripts';
	}
	return implode( '; ', $rules );
}

/**
 * A version stamp for a toy's address.
 *
 * @param array $toy A stored toy.
 * @return string
 */
function toybox_toy_rev( $toy ) {
	return substr( sha1( TOYBOX_VERSION . '|' . ( $toy['html'] ?? '' ) ), 0, 16 );
}

/**
 * Where the player loads a toy from.
 *
 * @param int   $post_id The Toy post.
 * @param array $toy A stored toy.
 * @return string
 */
function toybox_frame_url( $post_id, $toy ) {
	return add_query_arg(
		array(
			'toybox_frame' => (int) $post_id,
			'toy'          => rawurlencode( $toy['id'] ),
			'rev'          => toybox_toy_rev( $toy ),
		),
		home_url( '/' )
	);
}

/**
 * A toy's code, ready to serve: its SDK <script> pointed at the real SDK (or one added),
 * with the policy repeated as a meta tag at the very start.
 *
 * @param string $html The toy's code.
 * @return string
 */
function toybox_prepare_html( $html ) {
	$sdk      = toybox_sdk_url();
	$uses_sdk = (bool) preg_match( '/toybox-sdk\.js/', $html );
	if ( $uses_sdk ) {
		$html = preg_replace( '/(["\'])[^"\']*toybox-sdk\.js\1/', '"' . esc_url( $sdk ) . '"', $html );
	}
	$html = preg_replace( '/^\s*<!doctype[^>]*>/i', '', $html );
	return '<!doctype html><meta charset="utf-8">'
		. '<meta http-equiv="Content-Security-Policy" content="' . esc_attr( toybox_toy_csp() ) . '">'
		. ( $uses_sdk ? '' : '<script src="' . esc_url( $sdk ) . '"></script>' )
		. $html;
}

/**
 * Answers /?toybox_frame=… requests.
 */
function toybox_serve_frame() {
	if ( ! isset( $_GET['toybox_frame'], $_GET['toy'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- a read-only, public page.
		return;
	}
	$post_id = absint( $_GET['toybox_frame'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$toy_id  = sanitize_key( wp_unslash( $_GET['toy'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$rev     = isset( $_GET['rev'] ) ? sanitize_key( wp_unslash( $_GET['rev'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$post    = get_post( $post_id );
	$toy     = null;
	if ( $post && 'toybox_toy' === $post->post_type && ( 'publish' === $post->post_status || current_user_can( 'manage_options' ) ) ) {
		foreach ( toybox_get_data( $post_id )['toys'] as $t ) {
			if ( isset( $t['id'] ) && strtolower( (string) $t['id'] ) === $toy_id ) {
				$toy = $t;
				break;
			}
		}
	}
	nocache_headers();
	if ( ! $toy ) {
		status_header( 404 );
		header( 'Content-Type: text/plain; charset=utf-8' );
		echo esc_html__( 'This toy isn\'t available.', 'toybox' );
		exit;
	}
	header_remove( 'Cache-Control' );
	header_remove( 'Expires' );
	header_remove( 'Pragma' );
	status_header( 200 );
	header( 'Content-Type: text/html; charset=utf-8' );
	header( 'Content-Security-Policy: ' . toybox_toy_csp( true ) );
	header( 'X-Content-Type-Options: nosniff' );
	header( 'Referrer-Policy: no-referrer' );
	if ( 'publish' === $post->post_status && toybox_toy_rev( $toy ) === $rev ) {
		header( 'Cache-Control: public, max-age=31536000, immutable' );
	} else {
		header( 'Cache-Control: private, no-cache' );
	}
	echo toybox_prepare_html( (string) ( $toy['html'] ?? '' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- toy code, run only in a sandboxed frame with no network.
	exit;
}
add_action( 'init', 'toybox_serve_frame', 1 );
