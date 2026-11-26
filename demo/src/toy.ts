import { StandaloneToy } from '../../core/src/standalone';
import type { Aspect } from '../../core/src/types';

// Toy-only mode: a single toy on a page, as it would appear in a Moodle course.
const TOYS: Record<string, { name: string; intro: string; params: Record<string, unknown>; aspect: Aspect }> = {
  'toys/fourier-lab.html': {
    name: 'Fourier Lab',
    intro: 'Any repeating wave is a mix of sine waves. Build one from its ingredients, then switch to “Draw” and let the FFT take your own wave apart.',
    params: { harmonics: 12, startPreset: 'sawtooth' },
    aspect: '16:9',
  },
  'toys/wave-lab.html': {
    name: 'Wave Lab',
    intro: 'Amplitude sets how tall a wave is; frequency sets how many cycles fit in a second. Match the dashed wave.',
    params: { amplitude: 0.3, frequency: 1, target: { amplitude: 0.6, frequency: 2.5 }, showPhase: true },
    aspect: '16:9',
  },
  'toys/phase-lab.html': {
    name: 'Phase Lab',
    intro: 'Two identical waves, one shifted. Find the shift that makes them cancel to silence.',
    params: { frequency: 2, phase: 20, goal: 'cancel' },
    aspect: '16:9',
  },
  'toys/quiz.html': {
    name: 'Quick quiz',
    intro: 'A quick check. On its own, the quiz has no “Rewatch” button.',
    params: { question: 'A wave has a period of 0.5 s. What is its frequency?', options: ['0.5 Hz', '2 Hz'], answer: 1, explain: 'f = 1/T = 1/0.5 = 2 Hz.', theme: 'dark' },
    aspect: 'auto',
  },
  'toys/fraction-builder.html': {
    name: 'Fraction builder',
    intro: 'Shade the bar to show the fraction.',
    params: { numerator: 5, denominator: 8 },
    aspect: '4:3',
  },
};

const pick = document.getElementById('pick') as HTMLSelectElement;
const shape = document.getElementById('shape') as HTMLSelectElement;
const status = document.getElementById('status')!;
for (const [file, t] of Object.entries(TOYS)) pick.add(new Option(t.name, file));

const host = new StandaloneToy(document.getElementById('toy')!, {
  sdkUrl: new URL('toybox-sdk.js', location.href).href,
  onComplete: (r) => {
    status.textContent = `✓ Finished. Result saved: ${JSON.stringify(r.result)}`;
  },
});

function show(resetShape: boolean) {
  const t = TOYS[pick.value];
  if (resetShape) shape.value = t.aspect;
  document.getElementById('topic')!.textContent = `Week 3 · ${t.name}`;
  document.getElementById('intro')!.textContent = t.intro;
  status.textContent = 'Not finished yet.';
  host.show({ id: pick.value, label: t.name, toy: pick.value, params: t.params }, shape.value as Aspect);
}
pick.onchange = () => show(true);
shape.onchange = () => show(false);
show(true);
