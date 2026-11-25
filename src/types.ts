/** Where a toy sits over the video, in percent of the video frame. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One interactive moment in a lesson. */
export interface Cue {
  id: string;
  /** Seconds into the video when the toy appears. */
  start: number;
  /** Seconds into the video when the toy disappears. */
  end: number;
  /** URL of the toy's HTML file (relative to the lesson file), or... */
  toy?: string;
  /** ...inline HTML for the toy (used by the playground). */
  html?: string;
  rect: Rect;
  /** Pause the video when the toy appears, so the learner must engage. */
  pause?: boolean;
  /** Resume playback automatically when the toy calls ToyBox.complete(). */
  resumeOnComplete?: boolean;
  /** Anything the educator wants to pass into the toy. */
  params?: Record<string, unknown>;
  /** Short label shown on the timeline marker. */
  label?: string;
}

export interface Lesson {
  title: string;
  video: string;
  poster?: string;
  cues: Cue[];
}

/** Messages a toy can send to the player. */
export type ToyMessage =
  | { type: 'ready' }
  | { type: 'pause' }
  | { type: 'play' }
  | { type: 'seek'; time: number }
  | { type: 'complete'; result?: unknown }
  | { type: 'log'; data: unknown };

export interface CompletionRecord {
  cueId: string;
  label?: string;
  at: number;
  result?: unknown;
}
