# 🧸 ToyBox

A web video player where **educators drop interactive "toys" on top of the video**: little HTML/JS widgets that appear at the right moment so learners can try out the idea the video just explained.

- **Player** (`index.html`): plays a *lesson* (a video plus a list of timed toys), pauses for the toys that need an answer, and tracks which toys the learner has completed.
- **Toy playground** (`playground.html`): write a toy's HTML on the left and see it running over the video on the right. When it works, copy the cue JSON into a lesson.

## Run it (Mac)

```bash
brew install node        # once
npm install              # once
npm run dev              # then open http://localhost:5173
```

## How it fits together

```
lesson.json ──► Player ──► <video>
                  │
                  └─► overlay ──► <iframe sandbox> toy  ◄──► toybox-sdk.js
                                   (postMessage only)
```

### A lesson
`public/lessons/fractions.json`:

```json
{
  "title": "Fractions 101",
  "video": "../media/demo.mp4",
  "cues": [{
    "id": "build-three-quarters",
    "label": "Build 3/4",
    "start": 12, "end": 14,
    "toy": "../toys/fraction-builder.html",
    "rect": { "x": 20, "y": 12, "w": 60, "h": 62 },
    "pause": true,
    "resumeOnComplete": true,
    "params": { "numerator": 3, "denominator": 4 }
  }]
}
```

| Field | Meaning |
|---|---|
| `start` / `end` | Seconds. The toy is shown while the playhead is in this range. |
| `rect` | Position and size in **% of the video frame**, so it scales to any screen and works in fullscreen. |
| `pause` | Pause the video when the toy appears, so the learner has to engage with it. |
| `resumeOnComplete` | Carry on playing once the toy calls `ToyBox.complete()`. |
| `params` | Anything you like; it is passed to the toy. This lets one toy be reused with different content. |

Load another lesson with `?lesson=lessons/your-lesson.json`.

### A toy
A toy is a plain HTML file (`public/toys/`) that includes the SDK:

```html
<script src="../toybox-sdk.js"></script>
<script>
  ToyBox.onInit(params => { /* build the UI from params */ });
  ToyBox.onTime(t => { /* optional: react to the video time */ });
  // ToyBox.pause() / play() / seek(seconds)
  // ToyBox.complete({ correct: true })   // learner finished
  // ToyBox.log({ anything })             // analytics/debug
  // ToyBox.defaults({...})               // params used when opened directly
</script>
```

Example toys:
- `wave-lab.html`: amplitude/frequency (optional phase) sliders, a "match the dashed wave" challenge, and sound
- `phase-lab.html`: two waves and their sum, with a draggable phase dial; goal is to make them cancel (or reinforce)
- `fourier-lab.html`: **Build** a wave by dragging spectrum bars or picking presets (square, sawtooth…), or **Draw** any wave and watch the FFT find its sines and rebuild it
- `fraction-builder.html`: shade *n/d* of a bar (pauses the video, checks the answer)
- `quiz.html`: multiple choice, with a "rewatch the explanation" button that seeks back
- `fact-card.html`: a non-blocking pop-up in the corner, with a countdown bar

### Safety
Toys are written by educators, not by us, so each toy runs in an `<iframe sandbox="allow-scripts">` without `allow-same-origin`. A toy can draw anything inside its own box, but it can't read or change the player page, its cookies or its storage. It can only send the small set of messages listed above, and the player checks every one of them (`src/toyHost.ts`).

## Demo lessons
- **Sine Waves** (`lessons/sine-waves.json`): a 95-second lesson covering amplitude, frequency, phase and the FFT, with Wave Lab, a quiz, Phase Lab, Fourier Lab and three fact cards. The video is drawn in code by `scripts/render_sine_video.py` (numpy + Pillow + ffmpeg), so the waves on screen are exact and the soundtrack is generated from the same maths. Re-run it after you change the script.
- **Fractions 101** (`lessons/fractions.json`): the original starter.

The live demo is deployed to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`.

## Code map

| File | What it does |
|---|---|
| `src/player.ts` | Video, controls, timeline markers, and syncing toys to frames (`requestVideoFrameCallback`) |
| `src/toyHost.ts` | Creates the sandboxed iframes and handles the message protocol |
| `src/types.ts` | Lesson, cue and message types |
| `public/toybox-sdk.js` | The `ToyBox` API that toys use |
| `src/main.ts`, `src/playground.ts` | The two pages |

## Roadmap ideas
- Drag-to-position and timeline editing in the playground; save lessons
- Save learner results to a backend (`onComplete` is the hook for this)
- HLS/adaptive streaming via `hls.js`, and YouTube/Vimeo as video sources
- Toy library and gallery; shared toy styles/theme
- Accessibility pass: captions, keyboard focus moving into a toy when it pauses the video
