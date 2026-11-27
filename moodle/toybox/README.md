# ToyBox for Moodle (mod_toybox)

An activity where learners play with small interactive **toys**: HTML widgets for dragging, sliding, building or predicting their way to understanding one idea.

Each activity is one of two types:

- **Video with toys**: toys appear on top of a video at chosen moments. The video can be an uploaded file, a link to a video file, or a **YouTube** or **Vimeo** link. A toy can pause the video until the learner has played with it, and can jump back to the relevant part of the video.
- **Toy only**: a single toy on its own, with no video. Put several on a course page to build your own sequence.

Teachers write toys in HTML, or get an AI to write them: the toy editor's **Copy AI prompt** button bundles a detailed toy-making guide with the toy's details, ready to paste into ChatGPT, Claude, Gemini or Copilot.

## Requirements

- Moodle **4.4 or later**. Tested on 4.4 and 5.3 (PostgreSQL); CI covers 4.4, 4.5 and 5.3.
- No other plugins, external services or API keys.

## Installing

1. Download `mod_toybox.zip` (from the GitHub Actions "Moodle plugin" run, or a release).
2. *Site administration → Plugins → Install plugins*, upload the zip, and follow the upgrade steps.
   Or unzip it into `mod/toybox` (Moodle 5.1+: `public/mod/toybox`) and visit *Site administration → Notifications*.

## Using it

1. In a course, **Add an activity → ToyBox**. Choose the type. For video, upload a video (mp4/webm), or paste a YouTube, Vimeo or video-file link.
   Choose **Display**: *Open as a page*, or **Show on the course page** so learners don't need to click into it.
2. Open the activity and choose **Edit toys** (in the activity's "More" menu if it's not shown).
   - Pick **Start from an example**, or **Copy AI prompt** and paste the AI's HTML into *Toy code*.
   - **Preview** runs it live. The **Checker** explains anything that won't work.
   - On a video: pause the preview where a toy should appear, then press **Start here**. Set its box with Left/Top/Width/Height (% of the video).
3. **Completion:** in the activity settings, choose *Add requirements → Learners must finish all required toys*. Each toy has a *Required for completion* tick box. ToyBox is not graded.
4. **Results** (in the activity menu) shows who has finished which toy, and what each toy reported.

## Showing ToyBox on the course page, or anywhere

- **Display → Show on the course page** puts the toy, or the video with its toys, straight into the course section, like a label. It works in standard formats and in Onetopic.
  - Players load only when scrolled into view, and starting one video pauses any other on the page.
  - Finishing toys still counts for completion. The view is logged when the player first appears, so the "view" completion rule works too.
- **Embed code**: editors see it under the activity. It's an `<iframe>` of `mod/toybox/embed.php?id=…` (just the player, no Moodle page around it), for use in a Page, Book or other text. To embed on other websites, turn on *Allow frame embedding* (Site administration → Security → HTTP security).

## YouTube, Vimeo and Panopto

- **YouTube** plays from `youtube-nocookie.com` (privacy-enhanced mode), with YouTube's own controls hidden.
- **Vimeo** plays with *do not track* on. Vimeo only hides its own controls for videos on paid Vimeo plans; otherwise both sets show.
- **Panopto** plays with its own interface turned down. Viewers need access to the session in Panopto, for example through your Moodle sign-in, and Panopto may still show its settings/captions buttons.
- ToyBox's controls talk to each player frame with the same messages the sites' own API scripts use, so **no YouTube, Vimeo or Panopto script runs in the Moodle page**. Their code stays in their own cross-origin frames, and ToyBox only accepts messages from the right frame and site.
- Video links must be `https://`. Administrators can limit them to a list of websites (see *Safety and limits* below).
- Toys appear within a fraction of a second of their time; uploaded video files are frame-accurate.
- Learners' browsers need to reach `youtube.com`/`youtube-nocookie.com`, `vimeo.com` or your Panopto server, as for any embedded video.

## Look and feel

*Site administration → Plugins → Activity modules → ToyBox → Look and feel* sets the colours and font of ToyBox players, editors and toys:

- **Match this Moodle site** (default): reads the site theme's colours and font.
- **Solent University**: PT Sans and Solent's palette.
- **ToyBox (dark)**: the original dark look.

The same look is described to AI assistants by **Copy AI prompt** and **Download toy guide**, so AI-made toys match it. Toys follow the look through CSS variables. Toys saved before version 0.2 keep their own colours until they're updated (for example, by picking the example again).

## Safety

Toys are code written by teachers or AI, so they never run in the Moodle page itself:

- Each toy is served on its own by `toy.php` and runs in an `<iframe sandbox="allow-scripts">` without `allow-same-origin`. It can't read or change the Moodle page, cookies or session, or open windows or pop-ups. Pages with toys on them don't contain the toys' code.
- `toy.php` sends a Content-Security-Policy **header**: no network at all (`fetch`, external scripts and images, forms, WebSockets). Because it's a header, nothing in the toy can switch it off. Learner input can't be sent anywhere.
- One thing browsers can't block is a frame navigating itself. If a toy tries, ToyBox stops it at once, shows a notice in its place and logs a *Toy stopped for opening another web page* event. The checker in the editor also flags code that navigates, links out, asks for passwords or uses WebRTC.
- The only thing a toy can do outside itself is send a few validated messages: pause, play, seek, finished (with a small JSON result, max 8 KB) and resize. Repeat results within 5 seconds are ignored.
- Creating and editing toys needs `mod/toybox:edittoys`, which is flagged as an XSS risk like other code-authoring capabilities.
- Every change of a toy's code is kept (the last 20 versions per toy), with who made it and when. Teachers can bring back an earlier version from **Earlier versions** in the editor. Saving toys is logged with a fingerprint of all of their code.
- **Restored activities:** toys restored from a backup stay visible, and teachers see a notice asking them to check them. Toys restored from **another Moodle site** are held back from learners until a teacher marks them as reviewed (or saves them). Duplicating and importing within the site need neither.
- Completion is for tracking engagement, not assessment: a learner who knows how could report a toy as finished without doing it. Use a quiz for anything that counts.

### Safety and limits (site settings)

*Site administration → Plugins → Activity modules → ToyBox*:

| Setting | Default | What it does |
|---|---|---|
| Only allow the toys that come with ToyBox | Off | Teachers can only choose the bundled example toys; code can't be typed, pasted or made with AI. Existing toys keep working. |
| Most toys in one activity | 50 | |
| Largest toy (KB) | 1024 | At most 4096. |
| Largest video upload | Site limit | Also limited by course and site upload limits. Uploads must be MP4, WebM or M4V. |
| Allowed video websites | Any | One per line (subdomains included), e.g. `youtube.com`, `vimeo.com`, `yourschool.cloud.panopto.eu`. Links must be `https://`. |

### Deploying

- **Content-Security-Policy on your site:** if your Moodle sends its own CSP, allow `frame-src` for `https://www.youtube-nocookie.com https://player.vimeo.com https://<your Panopto server>` (only those you use). ToyBox needs no third-party `script-src`.
- **Big video files:** uploaded videos are served by `pluginfile.php`, which supports seeking. On busy sites, turn on `$CFG->xsendfile` so the web server sends the files rather than PHP.
- **Embedding on other sites** (the *Embed* page's code) needs *Allow frame embedding* on. Leave it off if you only use ToyBox inside Moodle.
- **Who can write code:** `mod/toybox:edittoys` lets someone run their own code in front of learners (sandboxed). Give it to roles you'd trust to edit HTML labels; or turn on *Only allow the toys that come with ToyBox*.
- Report security problems privately: see `SECURITY.md` in the ToyBox repository.

## Capabilities

| Capability | Default roles |
|---|---|
| `mod/toybox:addinstance` | Editing teacher, Manager |
| `mod/toybox:view` | Everyone with course access |
| `mod/toybox:edittoys` | Editing teacher, Manager |
| `mod/toybox:submit` (saves results and counts for completion) | Student |
| `mod/toybox:viewresults` | Teacher, Editing teacher, Manager (with separate groups, only their groups unless they can access all groups) |

## Not yet

- Moodle app (mobile) support.
- Dragging toys into position on the preview (positions are typed as percentages).

## Development

The plugin's JavaScript is built from the shared TypeScript in the ToyBox repository (`core/` and `moodle/src/`). Run `npm run build:moodle` there; don't edit `amd/` or `styles.css` by hand. Grunt isn't used.
