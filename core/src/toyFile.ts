// The ToyBox toy file: one toy as a small JSON file, so the same toy moves between
// Moodle, WordPress and PowerPoint (export from one editor, import into another).
import type { Aspect, Rect } from './types';

/** A toy file's contents. Only "toybox" and "html" are required. */
export interface ToyFile {
  /** Format version. */
  toybox: 1;
  label?: string;
  html: string;
  params?: Record<string, unknown>;
  /** Box shape when the toy is shown on its own. */
  aspect?: Aspect;
  /** Where it sat over a video, and how it behaved there. */
  rect?: Rect;
  pause?: boolean;
  resumeOnComplete?: boolean;
  required?: boolean;
}

/** What a toy file can set on an editor toy. */
export interface ToyFileSource {
  label?: string;
  html?: string;
  params?: Record<string, unknown>;
  rect?: Rect;
  pause?: boolean;
  resumeOnComplete?: boolean;
  required?: boolean;
}

const ASPECTS: Aspect[] = ['16:9', '4:3', '1:1', '3:4', 'auto'];
/** Largest toy file we read (toys themselves are limited to 1 MB by default). */
export const MAX_TOY_FILE = 4 * 1024 * 1024;

/** Turn a toy into toy-file text. */
export function toToyFile(toy: ToyFileSource, aspect?: Aspect): string {
  const file: ToyFile = {
    toybox: 1,
    label: toy.label ?? '',
    html: toy.html ?? '',
    params: toy.params ?? {},
    ...(aspect ? { aspect } : {}),
    ...(toy.rect ? { rect: toy.rect } : {}),
    ...(toy.pause !== undefined ? { pause: !!toy.pause } : {}),
    ...(toy.resumeOnComplete !== undefined ? { resumeOnComplete: !!toy.resumeOnComplete } : {}),
    ...(toy.required !== undefined ? { required: !!toy.required } : {}),
  };
  return JSON.stringify(file, null, 2) + '\n';
}

/** Whether some text looks like a toy file (e.g. pasted into the code box). */
export function looksLikeToyFile(text: string): boolean {
  return /^\s*\{\s*"toybox"\s*:/.test(text);
}

const num = (v: unknown, lo: number, hi: number, d: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : d;
  return Math.min(hi, Math.max(lo, n));
};

/** Read toy-file text; throws an Error with a plain message if it isn't one. */
export function parseToyFile(text: string): ToyFile {
  if (text.length > MAX_TOY_FILE) throw new Error('too large');
  let d: any;
  try {
    d = JSON.parse(text);
  } catch {
    throw new Error('not a toy file');
  }
  if (!d || typeof d !== 'object' || d.toybox !== 1 || typeof d.html !== 'string') throw new Error('not a toy file');
  const file: ToyFile = {
    toybox: 1,
    label: typeof d.label === 'string' ? d.label.slice(0, 255) : '',
    html: d.html,
    params: d.params && typeof d.params === 'object' && !Array.isArray(d.params) ? d.params : {},
  };
  if (ASPECTS.includes(d.aspect)) file.aspect = d.aspect;
  if (d.rect && typeof d.rect === 'object') {
    file.rect = {
      x: num(d.rect.x, 0, 100, 20),
      y: num(d.rect.y, 0, 100, 12),
      w: num(d.rect.w, 5, 100, 60),
      h: num(d.rect.h, 5, 100, 62),
    };
  }
  for (const k of ['pause', 'resumeOnComplete', 'required'] as const) if (typeof d[k] === 'boolean') file[k] = d[k];
  return file;
}

/** A safe file name for a toy: "wave-lab.toybox.json". */
export function toyFileName(label: string | undefined): string {
  const base = (label ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${base || 'toy'}.toybox.json`;
}
