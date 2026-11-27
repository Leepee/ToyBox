<?php
/**
 * Plugin Name:       ToyBox
 * Description:       Interactive toys (small sandboxed HTML widgets) on their own or on top of a video. Make them with AI using the built-in toy guide, then drop them into any post or page.
 * Version:           0.1.1
 * Requires at least: 6.4
 * Requires PHP:      8.1
 * Author:            ToyBox contributors
 * License:           GPL-3.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain:       toybox
 *
 * @package ToyBox
 */

defined( 'ABSPATH' ) || exit;

define( 'TOYBOX_VERSION', '0.1.1' );
define( 'TOYBOX_FILE', __FILE__ );
define( 'TOYBOX_DIR', plugin_dir_path( __FILE__ ) );
define( 'TOYBOX_URL', plugin_dir_url( __FILE__ ) );

/** Shapes a toy can have when shown on its own. */
const TOYBOX_ASPECTS = array( '16:9', '4:3', '1:1', '3:4', 'auto' );

require_once TOYBOX_DIR . 'includes/toys.php';
require_once TOYBOX_DIR . 'includes/editor.php';
require_once TOYBOX_DIR . 'includes/render.php';
require_once TOYBOX_DIR . 'includes/settings.php';
