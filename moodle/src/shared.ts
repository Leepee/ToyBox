import type { Aspect, Cue } from '../../core/src/types';

/** A toy as stored by the Moodle plugin (see classes/local/toys.php export_for_js). */
export interface MoodleToy extends Cue {
  id: string; // numeric id as string; '' or 'new-…' for unsaved toys
  required: boolean;
}

/** Reads the JSON config that the PHP page embeds next to the mount point. */
export function readConfig<T>(root: Element): T {
  const el = root.querySelector('script.mod-toybox-config');
  return JSON.parse(el?.textContent ?? '{}') as T;
}

/** Normalise toys from PHP (numeric ids) into the shape the core player uses. */
export function fromServer(toys: any[]): MoodleToy[] {
  return toys.map((t) => ({ ...t, id: String(t.id), params: t.params ?? {} }));
}

export type { Aspect };

import { THEMES, resolveThemeFonts, themeFromPage, type Theme } from '../../core/src/theme';

/**
 * The site's chosen ToyBox look: 'auto' reads the Moodle theme's colours and font
 * from the page; otherwise a built-in theme. Fonts become data: URLs for the toys.
 */
export async function loadTheme(id: string, sdkUrl: string): Promise<Theme> {
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
