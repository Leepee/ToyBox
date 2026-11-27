/** Where a toy sits over the video, in percent of the video frame. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The toy itself: its code and the settings passed into it. */
export interface ToySpec {
  id: string;
  /** Short name, shown on timeline markers, progress lists and to screen readers. */
  label?: string;
  /** URL of the toy's HTML file (relative to the lesson file), or... */
  toy?: string;
  /** ...the toy's HTML inline (the playground and Moodle store toys this way). */
  html?: string;
  /** Anything the educator wants to pass into the toy (`ToyBox.onInit(params => …)`). */
  params?: Record<string, unknown>;
}

/** A toy placed at a moment in a video. */
export interface Cue extends ToySpec {
  /** Seconds into the video when the toy appears. */
  start: number;
  /** Seconds into the video when the toy disappears. */
  end: number;
  rect: Rect;
  /** Pause the video when the toy appears, so the learner must engage. */
  pause?: boolean;
  /** Resume playback automatically when the toy calls ToyBox.complete(). */
  resumeOnComplete?: boolean;
}

export interface Lesson {
  title: string;
  video: string;
  poster?: string;
  cues: Cue[];
}

/** How a toy-only (no video) toy is sized on the page. */
export type Aspect = '16:9' | '4:3' | '1:1' | '3:4' | 'auto';

/** Messages a toy can send to its host. */
export type ToyMessage =
  | { type: 'ready' }
  | { type: 'pause' }
  | { type: 'play' }
  | { type: 'seek'; time: number }
  | { type: 'complete'; result?: unknown }
  | { type: 'log'; data: unknown }
  | { type: 'resize'; height: number }
  /** Not sent by toys: the host saw the toy's frame navigate to another page and stopped it. */
  | { type: 'navigated' };

export interface CompletionRecord {
  cueId: string;
  label?: string;
  /** Video time when completed (0 for toy-only). */
  at: number;
  result?: unknown;
}
