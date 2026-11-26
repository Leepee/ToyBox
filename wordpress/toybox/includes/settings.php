<?php
/**
 * Settings → ToyBox: the look of players and toys.
 *
 * @package ToyBox
 */

defined( 'ABSPATH' ) || exit;

/**
 * The chosen look: 'auto' (match this site), 'solent' or 'toybox'.
 *
 * @return string
 */
function toybox_theme_setting() {
	$theme = get_option( 'toybox_theme', 'auto' );
	return in_array( $theme, array( 'auto', 'solent', 'toybox' ), true ) ? $theme : 'auto';
}

/**
 * Registers the setting and its page.
 */
function toybox_settings_init() {
	register_setting(
		'toybox',
		'toybox_theme',
		array(
			'type'              => 'string',
			'default'           => 'auto',
			'sanitize_callback' => static function ( $v ) {
				return in_array( $v, array( 'auto', 'solent', 'toybox' ), true ) ? $v : 'auto';
			},
		)
	);
	add_settings_section( 'toybox_look', '', '__return_false', 'toybox' );
	add_settings_field(
		'toybox_theme',
		__( 'Look and feel', 'toybox' ),
		static function () {
			$current = toybox_theme_setting();
			$options = array(
				'auto'   => __( 'Match this site', 'toybox' ),
				'solent' => __( 'Solent University', 'toybox' ),
				'toybox' => __( 'ToyBox (dark)', 'toybox' ),
			);
			echo '<select name="toybox_theme" id="toybox_theme">';
			foreach ( $options as $value => $label ) {
				printf( '<option value="%s" %s>%s</option>', esc_attr( $value ), selected( $current, $value, false ), esc_html( $label ) );
			}
			echo '</select><p class="description">'
				. esc_html__( 'Colours and font for players and toys. "Match this site" reads your WordPress theme. The same look is described to AI assistants by "Copy AI prompt".', 'toybox' )
				. '</p>';
		},
		'toybox',
		'toybox_look'
	);
}
add_action( 'admin_init', 'toybox_settings_init' );

/**
 * Adds Settings → ToyBox.
 */
function toybox_settings_menu() {
	add_options_page(
		__( 'ToyBox', 'toybox' ),
		__( 'ToyBox', 'toybox' ),
		'manage_options',
		'toybox',
		static function () {
			echo '<div class="wrap"><h1>' . esc_html__( 'ToyBox', 'toybox' ) . '</h1><form method="post" action="options.php">';
			settings_fields( 'toybox' );
			do_settings_sections( 'toybox' );
			submit_button();
			echo '</form></div>';
		}
	);
}
add_action( 'admin_menu', 'toybox_settings_menu' );

/**
 * The active WordPress theme's colours and fonts (from theme.json), for "Match this site".
 * Read on the server so the editor preview in wp-admin matches the real site.
 *
 * @return array|null
 */
function toybox_site_tokens() {
	if ( 'auto' !== toybox_theme_setting() || ! function_exists( 'wp_get_global_settings' ) ) {
		return null;
	}
	$settings = wp_get_global_settings();
	$styles   = wp_get_global_styles();

	$colors = array();
	foreach ( array( 'default', 'theme', 'custom' ) as $origin ) {
		foreach ( (array) ( $settings['color']['palette'][ $origin ] ?? array() ) as $c ) {
			if ( isset( $c['slug'], $c['color'] ) ) {
				$colors[ $c['slug'] ] = $c['color'];
			}
		}
	}
	$fonts = array();
	foreach ( array( 'theme', 'custom' ) as $origin ) {
		foreach ( (array) ( $settings['typography']['fontFamilies'][ $origin ] ?? array() ) as $f ) {
			if ( isset( $f['slug'] ) ) {
				$fonts[ $f['slug'] ] = $f;
			}
		}
	}
	// "var:preset|color|base" or "var(--wp--preset--color--base)" → the colour.
	$color = static function ( $v ) use ( $colors ) {
		if ( ! is_string( $v ) ) {
			return '';
		}
		if ( preg_match( '/^var:preset\|color\|([a-z0-9-]+)$/', $v, $m ) || preg_match( '/var\(--wp--preset--color--([a-z0-9-]+)\)/', $v, $m ) ) {
			return $colors[ $m[1] ] ?? '';
		}
		return $v;
	};

	$font      = '';
	$fontfaces = array();
	$family    = $styles['typography']['fontFamily'] ?? '';
	if ( is_string( $family ) && ( preg_match( '/^var:preset\|font-family\|([a-z0-9-]+)$/', $family, $m ) || preg_match( '/var\(--wp--preset--font-family--([a-z0-9-]+)\)/', $family, $m ) ) ) {
		$preset = $fonts[ $m[1] ] ?? null;
		if ( $preset ) {
			$font = $preset['fontFamily'] ?? '';
			foreach ( array_slice( (array) ( $preset['fontFace'] ?? array() ), 0, 2 ) as $face ) {
				$src = is_array( $face['src'] ?? null ) ? reset( $face['src'] ) : ( $face['src'] ?? '' );
				if ( is_string( $src ) && str_starts_with( $src, 'file:./' ) ) {
					$src = get_theme_file_uri( substr( $src, 7 ) );
				}
				if ( is_string( $src ) && '' !== $src ) {
					$fontfaces[] = array(
						'family' => trim( (string) ( $face['fontFamily'] ?? '' ), "\"' " ),
						'weight' => (string) ( $face['fontWeight'] ?? '400' ),
						'style'  => (string) ( $face['fontStyle'] ?? 'normal' ),
						'url'    => $src,
					);
				}
			}
		}
	} elseif ( is_string( $family ) ) {
		$font = $family;
	}

	$neutral = array( 'base', 'base-2', 'contrast', 'contrast-2', 'contrast-3', 'black', 'white', 'cyan-bluish-gray', 'pale-pink', 'light-green-cyan', 'pale-cyan-blue' );
	$accents = array();
	foreach ( (array) ( $settings['color']['palette']['theme'] ?? array() ) as $c ) {
		if ( isset( $c['slug'], $c['color'] ) && ! in_array( $c['slug'], $neutral, true ) ) {
			$accents[] = $c['color'];
		}
	}

	return array(
		'name'         => wp_get_theme()->get( 'Name' ),
		'font'         => $font,
		'fontFaces'    => $fontfaces,
		'text'         => $color( $styles['color']['text'] ?? '' ),
		'background'   => $color( $styles['color']['background'] ?? '' ),
		'primary'      => $color( $styles['elements']['button']['color']['background'] ?? '' ),
		'onPrimary'    => $color( $styles['elements']['button']['color']['text'] ?? '' ),
		'link'         => $color( $styles['elements']['link']['color']['text'] ?? '' ),
		'accents'      => $accents,
		'buttonRadius' => is_string( $styles['elements']['button']['border']['radius'] ?? null ) ? $styles['elements']['button']['border']['radius'] : '',
	);
}
