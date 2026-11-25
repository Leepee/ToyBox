import { ToyBoxPlayer, fmt } from './player';
import type { Cue } from './types';

const STARTER = `<!doctype html>
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

const EXAMPLE_PARAMS: Record<string, unknown> = {
  starter: { label: '1/3', value: 0.3333 },
  'toys/fraction-builder.html': { numerator: 2, denominator: 5 },
  'toys/quiz.html': { question: 'Which is bigger?', options: ['3/4', '5/8'], answer: 0, explain: '3/4 = 6/8.', rewatchAt: 18 },
  'toys/fact-card.html': { emoji: '🍕', text: '8 slices? Each is 1/8 of the pizza.', more: 'Eat 2 and you had 2/8 = 1/4.' },
};
const EXAMPLE_RECT: Record<string, Cue['rect']> = {
  'toys/fact-card.html': { x: 66, y: 5, w: 31, h: 24 },
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const html = $<HTMLTextAreaElement>('toy-html');
const params = $<HTMLTextAreaElement>('toy-params');
const err = $('err');
const out = $('out');
const num = (id: string) => Number($<HTMLInputElement>(id).value);

const lines: string[] = [];
function print(s: string) {
  lines.unshift(s);
  out.textContent = lines.slice(0, 40).join('\n');
}

const player = new ToyBoxPlayer($('player'), {
  onComplete: (r) => print(`${fmt(r.at)}  complete  ${JSON.stringify(r.result)}`),
  onLog: (_c, d) => print(`log       ${JSON.stringify(d)}`),
});
player.setLesson({ title: 'Playground', video: 'media/demo.mp4', cues: [] }, new URL('./', location.href).href);

function buildCue(): Cue | null {
  let p: Record<string, unknown>;
  try {
    p = JSON.parse(params.value || '{}');
  } catch (e) {
    err.textContent = `Params aren't valid JSON: ${(e as Error).message}`;
    return null;
  }
  err.textContent = '';
  return {
    id: 'playground-toy',
    label: 'My toy',
    start: num('f-start'),
    end: Math.max(num('f-end'), num('f-start') + 0.5),
    html: html.value,
    rect: { x: num('f-x'), y: num('f-y'), w: num('f-w'), h: num('f-h') },
    pause: $<HTMLInputElement>('f-pause').checked,
    resumeOnComplete: $<HTMLInputElement>('f-resume').checked,
    params: p,
  };
}

function run() {
  const cue = buildCue();
  if (!cue) return;
  player.setCues([cue]);
  player.seek(Math.max(0, cue.start - 0.75)); // a short run-up so you see it appear
  player.play();
  print(`--- running toy at ${fmt(cue.start)}`);
}

async function loadExample(key: string) {
  if (!key) return;
  html.value = key === 'starter' ? STARTER : await (await fetch(key)).text();
  params.value = JSON.stringify(EXAMPLE_PARAMS[key] ?? {}, null, 2);
  const r = EXAMPLE_RECT[key] ?? { x: 20, y: 12, w: 60, h: 62 };
  for (const k of ['x', 'y', 'w', 'h'] as const) $<HTMLInputElement>(`f-${k}`).value = String(r[k]);
  $<HTMLInputElement>('f-pause').checked = key !== 'toys/fact-card.html';
  run();
}

$<HTMLSelectElement>('example').onchange = (e) => loadExample((e.target as HTMLSelectElement).value);
$('apply').onclick = run;
$('copy').onclick = async () => {
  const cue = buildCue();
  if (!cue) return;
  const { html: _h, ...rest } = cue;
  const json = JSON.stringify({ ...rest, id: 'my-toy', toy: '../toys/my-toy.html' }, null, 2);
  await navigator.clipboard?.writeText(json).catch(() => {});
  print(`Cue JSON (copied). Save your HTML as public/toys/my-toy.html, then add this to a lesson's "cues":\n${json}`);
};
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    run();
  }
});
// Tab inserts spaces in the editor instead of leaving it.
html.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  html.setRangeText('  ', html.selectionStart, html.selectionEnd, 'end');
});

html.value = STARTER;
params.value = JSON.stringify(EXAMPLE_PARAMS.starter, null, 2);
