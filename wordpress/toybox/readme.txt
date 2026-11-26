=== ToyBox ===
Contributors: toybox
Tags: interactive, video, education, html5, ai
Requires at least: 6.4
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.1.0
License: GPLv3 or later
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Interactive toys (small sandboxed HTML widgets) on their own or on top of a video. Make them with AI, then drop them into any post or page.

== Description ==

A *toy* is a small interactive widget: drag, slide, build or predict your way to understanding one idea. ToyBox lets you:

* Make a **toy on its own**, or a **video with toys** that appear at set moments (and can pause the video until the viewer has played).
* Use a video from your **Media Library** (best), or a **YouTube, Vimeo or Panopto** link.
* Write toys in HTML, or have an AI write them: the editor's **Copy AI prompt** puts a detailed toy-making guide plus the toy's details on your clipboard, and **Download toy guide** gives you the guide as a Markdown file to attach to any AI chat. A **checker** explains anything in the code that won't work.
* Show toys anywhere with the **ToyBox block** or the `[toybox id="123"]` shortcode. They load when scrolled into view.
* Match your site: **Settings → ToyBox → Look and feel** reads your theme's colours and fonts (theme.json), or uses the Solent University or dark ToyBox looks.

= Safety =

Toys are code, so they never run in your page: each runs in a sandboxed iframe with no access to your site, its cookies or the network. Only administrators can create or edit toys.

== Installation ==

1. Upload the `toybox` folder (or the zip) via **Plugins → Add New → Upload Plugin**, then activate.
2. Go to **ToyBox → Add new toy**. Pick a type, start from an example or paste an AI-made toy, press **Preview**, then **Publish**.
3. Add the **ToyBox** block (or the shortcode shown on the toy) to a post or page.

== Changelog ==

= 0.1.0 =
* First release: toys and videos with toys, block and shortcode, shared ToyBox editor with AI prompt and guide, "match this site" theming, YouTube/Vimeo/Panopto support.
