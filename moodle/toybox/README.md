# ToyBox for Moodle (mod_toybox)

An activity where learners play with small interactive **toys**: HTML widgets for dragging, sliding, building or predicting their way to understanding one idea.

Each activity is one of two types:

- **Video with toys**: toys appear on top of a video at chosen moments. A toy can pause the video until the learner has played with it, and can jump back to the relevant part of the video.
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

1. In a course, **Add an activity → ToyBox**. Choose the type, and for video, upload a video (mp4/webm) or link to a video file.
2. Open the activity and choose **Edit toys** (in the activity's "More" menu if it's not shown).
   - Pick **Start from an example**, or **Copy AI prompt** and paste the AI's HTML into *Toy code*.
   - **Preview** runs it live. The **Checker** explains anything that won't work.
   - On a video: pause the preview where a toy should appear, then press **Start here**. Set its box with Left/Top/Width/Height (% of the video).
3. **Completion:** in the activity settings, choose *Add requirements → Learners must finish all required toys*. Each toy has a *Required for completion* tick box. ToyBox is not graded.
4. **Results** (in the activity menu) shows who has finished which toy, and what each toy reported.

## Look and feel

*Site administration → Plugins → Activity modules → ToyBox → Look and feel* sets the colours and font of ToyBox players, editors and toys:

- **Match this Moodle site** (default): reads the site theme's colours and font.
- **Solent University**: PT Sans and Solent's palette.
- **ToyBox (dark)**: the original dark look.

The same look is described to AI assistants by **Copy AI prompt** and **Download toy guide**, so AI-made toys match it. Toys follow the look through CSS variables. Toys saved before version 0.2 keep their own colours until they're updated (for example, by picking the example again).

## Safety

Toys are code written by teachers or AI, so they never run in the Moodle page itself:

- Each toy runs in an `<iframe sandbox="allow-scripts">` without `allow-same-origin`. It can't read or change the Moodle page, cookies or session, or open windows or pop-ups.
- A Content-Security-Policy is added to every toy: no network at all (`fetch`, external scripts and images, forms). Learner input can't be sent anywhere.
- The only thing a toy can do outside itself is send a few validated messages: pause, play, seek, finished (with a small JSON result, max 8 KB) and resize.
- Creating and editing toys needs `mod/toybox:edittoys`, which is flagged as an XSS risk like other code-authoring capabilities.

## Capabilities

| Capability | Default roles |
|---|---|
| `mod/toybox:addinstance` | Editing teacher, Manager |
| `mod/toybox:view` | Everyone with course access |
| `mod/toybox:edittoys` | Editing teacher, Manager |
| `mod/toybox:submit` (saves results and counts for completion) | Student |
| `mod/toybox:viewresults` | Teacher, Editing teacher, Manager |

## Not yet

- YouTube and Vimeo (links to video files work).
- Moodle app (mobile) support.
- Dragging toys into position on the preview (positions are typed as percentages).

## Development

The plugin's JavaScript is built from the shared TypeScript in the ToyBox repository (`core/` and `moodle/src/`). Run `npm run build:moodle` there; don't edit `amd/` or `styles.css` by hand. Grunt isn't used.
