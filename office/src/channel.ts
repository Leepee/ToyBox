// Messages between the toy on the slide and the editor window.
// In PowerPoint the editor is an Office dialog (messageParent / messageChild);
// in a plain browser (for trying the add-in out) it's an overlay frame using postMessage.
import type { ToyFile } from '../../core/src/toyFile';

declare const Office: any;

/** What's stored with each toy on a slide. */
export interface SlideToy {
  toy: ToyFile;
  /** ToyBox look: a key of THEMES. */
  theme: string;
}

export type ChannelMessage =
  | { type: 'ready' }
  | { type: 'init'; saved: SlideToy | null }
  | { type: 'save'; saved: SlideToy }
  | { type: 'cancel' };

/** True when running inside an Office app (not just a browser tab). */
export const inOffice = (info: { host?: unknown } | undefined) => !!info?.host && typeof Office !== 'undefined';

/** Wait for Office.js (resolves straight away with no host outside Office). */
export function officeReady(): Promise<{ host?: unknown }> {
  if (typeof Office === 'undefined' || !Office.onReady) return Promise.resolve({});
  return Promise.race([
    Office.onReady() as Promise<{ host?: unknown }>,
    // Office.js never answers in some plain-browser cases; don't hang.
    new Promise<{ host?: unknown }>((r) => setTimeout(() => r({}), 4000)),
  ]);
}

/** Parse a channel message, or null. */
export function readMessage(raw: unknown): ChannelMessage | null {
  try {
    const m = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return m && typeof m === 'object' && typeof m.type === 'string' ? (m as ChannelMessage) : null;
  } catch {
    return null;
  }
}

/** The editor side of the channel. */
export function editorChannel(office: boolean, onMessage: (m: ChannelMessage) => void): (m: ChannelMessage) => void {
  if (office && Office.context?.ui?.messageParent) {
    Office.context.ui.addHandlerAsync?.(Office.EventType.DialogParentMessageReceived, (arg: { message: string }) => {
      const m = readMessage(arg.message);
      if (m) onMessage(m);
    });
    return (m) => Office.context.ui.messageParent(JSON.stringify(m));
  }
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    const m = readMessage(e.data);
    if (m) onMessage(m);
  });
  return (m) => window.parent.postMessage(JSON.stringify(m), location.origin);
}
