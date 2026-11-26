import type { Rect } from './types';

/** The blank starter toy offered in the editors. */
export const STARTER = `<!doctype html>
<html>
<head>
  <script src="toybox-sdk.js"></script>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; }
    .card { height: 100vh; box-sizing: border-box; padding: 5%; background: #fff; border-radius: 16px;
            display: flex; flex-direction: column; justify-content: center; gap: 6%; }
    h1 { margin: 0; font-size: 6vw; }
    input { width: 100%; accent-color: #f59e0b; }
    .ends { display: flex; justify-content: space-between; font-weight: 700; }
    button { align-self: start; padding: .5em 1.2em; border: 0; border-radius: 99px; background: #1e3a8a; color: #fff; }
  </style>
</head>
<body>
  <div class="card">
    <h1 id="q"></h1>
    <input id="s" type="range" min="0" max="1" step="0.01" value="0.5" />
    <div class="ends"><span>0</span><span>1</span></div>
    <button id="go">Lock it in</button>
    <div id="fb"></div>
  </div>
  <script>
    // 1. Read the educator's params
    ToyBox.onInit(function (p) {
      document.getElementById('q').textContent = 'Where is ' + p.label + ' on the number line?';

      // 2. React to the learner
      document.getElementById('go').onclick = function () {
        var guess = Number(document.getElementById('s').value);
        var off = Math.abs(guess - p.value);
        document.getElementById('fb').textContent =
          off < 0.05 ? 'Spot on!' : 'You were ' + Math.round(off * 100) + '% away.';

        // 3. Tell the player you're done (it logs the result, and resumes the video)
        setTimeout(function () { ToyBox.complete({ guess: guess, error: off }); }, 1200);
      };
    });
  </script>
</body>
</html>`;

export interface ExampleToy {
  /** Path relative to the toys folder's parent, e.g. 'toys/quiz.html' (or 'starter'). */
  file: string;
  name: string;
  params: Record<string, unknown>;
  /** Suggested box when used on a video. */
  rect: Rect;
  /** Pause the video while it's shown? */
  pause: boolean;
}

const BOX: Rect = { x: 20, y: 12, w: 60, h: 62 };

/** The example toys that ship with ToyBox, with sensible starting settings. */
export const EXAMPLES: ExampleToy[] = [
  { file: 'starter', name: 'Blank starter (number line)', params: { label: '1/3', value: 0.3333 }, rect: BOX, pause: true },
  { file: 'toys/wave-lab.html', name: 'Wave Lab', params: { amplitude: 0.3, frequency: 1, target: { amplitude: 0.8, frequency: 3 } }, rect: { x: 6, y: 5, w: 88, h: 86 }, pause: true },
  { file: 'toys/phase-lab.html', name: 'Phase Lab', params: { frequency: 2, phase: 30, goal: 'cancel' }, rect: { x: 8, y: 6, w: 84, h: 84 }, pause: true },
  { file: 'toys/fourier-lab.html', name: 'Fourier Lab', params: { harmonics: 12, startPreset: 'square' }, rect: { x: 3, y: 3, w: 94, h: 91 }, pause: true },
  { file: 'toys/fraction-builder.html', name: 'Fraction builder', params: { numerator: 2, denominator: 5 }, rect: BOX, pause: true },
  {
    file: 'toys/quiz.html',
    name: 'Quiz',
    params: { question: 'Which is bigger?', options: ['3/4', '5/8'], answer: 0, explain: '3/4 = 6/8.', rewatchAt: 0, theme: 'dark' },
    rect: { x: 22, y: 20, w: 56, h: 58 },
    pause: true,
  },
  {
    file: 'toys/fact-card.html',
    name: 'Fact card',
    params: { emoji: '🍕', text: '8 slices? Each is 1/8 of the pizza.', more: 'Eat 2 and you had 2/8 = 1/4.' },
    rect: { x: 66, y: 5, w: 31, h: 24 },
    pause: false,
  },
];
