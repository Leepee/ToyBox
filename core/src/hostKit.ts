// Small helpers shared by the ToyBox hosts (Moodle, WordPress).
import type { Aspect, Cue } from './types';

/** A toy as hosts (Moodle, WordPress) store it: a cue plus whether it counts for completion. */
export interface EditorToy extends Cue {
  id: string; // a host id (Moodle: numeric) or a generated id for unsaved toys
  required: boolean;
}

/** Reads the JSON config that the host page embeds next to the mount point. */
export function readConfig<T>(root: Element, selector = 'script.mod-toybox-config'): T {
  const el = root.querySelector(selector);
  return JSON.parse(el?.textContent ?? '{}') as T;
}

/** Normalise toys from PHP (numeric ids) into the shape the core player uses. */
export function fromServer(toys: any[]): EditorToy[] {
  return toys.map((t) => ({ ...t, id: String(t.id), params: t.params ?? {} }));
}

export type { Aspect };

import { THEMES, resolveThemeFonts, themeFromPage, themeFromTokens, type SiteTokens, type Theme } from './theme';

/**
 * The site's chosen ToyBox look: 'auto' reads the site theme's colours and font
 * from the page; otherwise a built-in theme. Fonts become data: URLs for the toys.
 */
export async function loadTheme(id: string, sdkUrl: string, site?: SiteTokens | null): Promise<Theme> {
  // A host that knows its site's colours (WordPress reads theme.json) passes them in;
  // otherwise read them from the page (Moodle).
  if ((id === 'auto' || !THEMES[id]) && site) return resolveThemeFonts(themeFromTokens(site), location.href);
  if (id === 'auto' || !THEMES[id]) return resolveThemeFonts(themeFromPage(THEMES.solent), location.href);
  return resolveThemeFonts(THEMES[id], sdkUrl);
}

/** Tiny DOM helper: el('div.cls', {attr: v}, ...children). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: string,
  attrs: Record<string, any> = {},
  ...kids: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const [name, ...classes] = tag.split('.');
  const node = document.createElement(name) as HTMLElementTagNameMap[K];
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'text') node.textContent = String(v);
    else if (k.startsWith('on') && typeof v === 'function') (node as any)[k] = v;
    else if (k in node && typeof v !== 'string') (node as any)[k] = v;
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) if (kid != null && kid !== false) node.append(kid);
  return node;
}
