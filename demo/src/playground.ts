import { ToyBoxPlayer, fmt } from '../../core/src/player';
import { StandaloneToy } from '../../core/src/standalone';
import { lintToy } from '../../core/src/lint';
import { buildAiPrompt, guideWithTheme } from '../../core/src/aiPrompt';
import { bootTheme, downloadText } from './themeBoot';
import type { Theme } from '../../core/src/theme';
import { EXAMPLES, STARTER } from '../../core/src/examples';
import type { Aspect } from '../../core/src/types';
import type { Cue } from '../../core/src/types';

const EXAMPLE_PARAMS = Object.fromEntries(EXAMPLES.map((e) => [e.file, e.params]));
const EXAMPLE_RECT = Object.fromEntries(EXAMPLES.map((e) => [e.file, e.rect]));

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const html = $<HTMLTextAreaElement>('toy-html');
const params = $<HTMLTextAreaElement>('toy-params');
const err = $('err');
const out = $('out');
const num = (id: string) => Number($<HTMLInputElement>(id).value);
const sdkUrl = new URL('toybox-sdk.js', location.href).href;

const lines: string[] = [];
function print(s: string) {
  lines.unshift(s);
  out.textContent = lines.slice(0, 40).join('\n');
}

let theme: Theme = await bootTheme((t) => {
  theme = t;
  player.setTheme(t);
  standalone.setTheme(t);
  run();
});

const player = new ToyBoxPlayer($('player'), {
  sdkUrl,
  theme,
  onComplete: (r) => print(`${fmt(r.at)}  complete  ${JSON.stringify(r.result)}`),
  onLog: (_c, d) => print(`log       ${JSON.stringify(d)}`),
});
player.setLesson({ title: 'Playground', video: 'media/demo.mp4', cues: [] }, new URL('./', location.href).href);

const standalone = new StandaloneToy($('standalone'), {
  sdkUrl,
  theme,
  onComplete: (r) => print(`complete  ${JSON.stringify(r.result)}`),
  onLog: (_s, d) => print(`log       ${JSON.stringify(d)}`),
});

// ---- mode: on a video, or toy only
const mode = () => (document.querySelector<HTMLInputElement>('input[name=mode]:checked')?.value ?? 'video') as 'video' | 'toy';
const aspect = () => $<HTMLSelectElement>('f-aspect').value as Aspect;
function applyMode() {
  const toy = mode() === 'toy';
  document.querySelectorAll<HTMLElement>('.video-only').forEach((e) => (e.hidden = toy));
  document.querySelectorAll<HTMLElement>('.toy-only').forEach((e) => (e.hidden = !toy));
  $('player').hidden = toy;
  $('standalone').hidden = !toy;
  if (toy) {
    player.pause();
    player.setCues([]);
  }
  run();
}
document.querySelectorAll<HTMLInputElement>('input[name=mode]').forEach((r) => (r.onchange = applyMode));
$<HTMLSelectElement>('f-aspect').onchange = run;

function readParams(): Record<string, unknown> | null {
  try {
    const p = JSON.parse(params.value || '{}');
    err.textContent = '';
    return p;
  } catch (e) {
    err.textContent = `Params aren't valid JSON: ${(e as Error).message}`;
    return null;
  }
}

function buildCue(): Cue | null {
  const p = readParams();
  if (!p) return null;
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
  checkToy();
  const cue = buildCue();
  if (!cue) return;
  if (mode() === 'toy') {
    standalone.show({ id: cue.id, label: cue.label, html: cue.html, params: cue.params }, aspect());
    print('--- running toy on its own');
    return;
  }
  player.setCues([cue]);
  player.seek(Math.max(0, cue.start - 0.75)); // a short run-up so you see it appear
  player.play();
  print(`--- running toy at ${fmt(cue.start)}`);
}

// ---- checker
const lintEl = $('lint');
function checkToy() {
  const issues = lintToy(html.value, { mode: mode(), autoHeight: aspect() === 'auto' });
  lintEl.innerHTML = '';
  if (!issues.length) {
    lintEl.innerHTML = '<li class="ok">✓ No problems found</li>';
    return issues;
  }
  for (const i of issues) {
    const li = document.createElement('li');
    li.className = i.level;
    li.textContent = i.message;
    lintEl.appendChild(li);
  }
  return issues;
}
let lintTimer = 0;
html.addEventListener('input', () => {
  clearTimeout(lintTimer);
  lintTimer = window.setTimeout(checkToy, 400);
});

// ---- AI prompt
let guideText: Promise<string> | null = null;
$('ai-copy').onclick = async () => {
  guideText ??= fetch('toybox-toy-guide.md').then((r) => r.text());
  const cue = buildCue();
  const isStarter = html.value.trim() === STARTER.trim() || !html.value.trim();
  const prompt = buildAiPrompt(await guideText, {
    mode: mode(),
    aspect: aspect(),
    rect: cue?.rect,
    start: cue?.start,
    end: cue?.end,
    pause: cue?.pause,
    params: isStarter ? undefined : cue?.params,
    existingHtml: isStarter ? undefined : html.value,
    issues: isStarter ? undefined : lintToy(html.value, { mode: mode(), autoHeight: aspect() === 'auto' }),
  }, theme);
  try {
    await navigator.clipboard.writeText(prompt);
    print(`AI prompt copied (${Math.round(prompt.length / 1000)}k characters). Paste it into ChatGPT, Claude, Gemini…, fill in the [brackets], then paste the HTML and settings it gives you back here.`);
  } catch {
    print('Couldn’t reach the clipboard. Use "Download toy guide" and attach it to your AI chat instead.');
  }
};

$('guide-dl').onclick = async () => {
  guideText ??= fetch('toybox-toy-guide.md').then((r) => r.text());
  downloadText('toybox-toy-guide.md', guideWithTheme(await guideText, theme));
};

async function loadExample(key: string) {
  if (!key) return;
  html.value = key === 'starter' ? STARTER : await (await fetch(key)).text();
  params.value = JSON.stringify(EXAMPLE_PARAMS[key] ?? {}, null, 2);
  const r = EXAMPLE_RECT[key] ?? { x: 20, y: 12, w: 60, h: 62 };
  for (const k of ['x', 'y', 'w', 'h'] as const) $<HTMLInputElement>(`f-${k}`).value = String(r[k]);
  $<HTMLInputElement>('f-pause').checked = EXAMPLES.find((e) => e.file === key)?.pause ?? true;
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
  print(`Cue JSON (copied). Save your HTML as demo/public/toys/my-toy.html, then add this to a lesson's "cues":\n${json}`);
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
if (new URLSearchParams(location.search).get('mode') === 'toy') {
  document.querySelector<HTMLInputElement>('input[name=mode][value=toy]')!.checked = true;
  applyMode();
} else {
  checkToy();
}
