/**
 * Themes: one set of design tokens that styles the ToyBox pages (player,
 * editor, playground) AND is passed into every toy, where the SDK turns it
 * into CSS variables (--tb-surface, --tb-primary, …) and ToyBox.theme.
 */

export interface FontFace {
  family: string;
  weight: string;
  style?: string;
  /** Font file URL. Hosts turn this into a data: URL before sending it to toys. */
  url: string;
}

export interface Theme {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  font: string;
  fontFaces?: FontFace[];
  /** Page background behind cards. */
  page: string;
  /** Cards, panels and the toy's own background. */
  surface: string;
  /** Insets: canvases, code boxes, wells. */
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  /** Faint lines (graph grids). */
  grid: string;
  primary: string;
  onPrimary: string;
  /** Brand highlight, used sparingly (targets, key numbers, focus). */
  accent: string;
  link: string;
  success: string;
  warning: string;
  danger: string;
  /** Distinct colours for data series (waves, bars…), in order of use. */
  palette: string[];
  radius: string;
  buttonRadius: string;
  shadow: string;
  /** Title band / footer / video controls. */
  band: string;
  onBand: string;
  /** Plain-language style brief for AI assistants. */
  promptNotes: string;
}

export const THEMES: Record<string, Theme> = {
  toybox: {
    id: 'toybox',
    name: 'ToyBox (dark)',
    mode: 'dark',
    font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    page: '#0b0f17',
    surface: '#0b1020',
    surfaceAlt: '#070b17',
    text: '#e5e7eb',
    muted: '#94a3b8',
    border: 'rgba(255, 255, 255, 0.15)',
    grid: '#1a223c',
    primary: '#1e3a8a',
    onPrimary: '#ffffff',
    accent: '#f59e0b',
    link: '#7aa2ff',
    success: '#4ade80',
    warning: '#f59e0b',
    danger: '#f87171',
    palette: ['#f59e0b', '#22d3ee', '#f472b6', '#a78bfa', '#4ade80', '#60a5fa'],
    radius: '16px',
    buttonRadius: '999px',
    shadow: '0 12px 40px rgba(0, 0, 0, 0.65)',
    band: '#121826',
    onBand: '#e5e7eb',
    promptNotes:
      'Dark, playful lab style: deep navy cards, light text, bright accent colours for data, rounded pill buttons.',
  },
  solent: {
    id: 'solent',
    name: 'Solent University',
    mode: 'light',
    font: '"PT Sans", "Open Sans", Calibri, "Trebuchet MS", sans-serif',
    fontFaces: [
      { family: 'PT Sans', weight: '400', url: 'fonts/pt-sans-400.woff2' },
      { family: 'PT Sans', weight: '700', url: 'fonts/pt-sans-700.woff2' },
    ],
    page: '#ced4da',
    surface: '#ffffff',
    surfaceAlt: '#f8f9fa',
    text: '#1d2125',
    muted: '#6a737b',
    border: '#dee2e6',
    grid: '#e9ecef',
    primary: '#425b6c',
    onPrimary: '#ffffff',
    accent: '#b0111f',
    link: '#175d82',
    success: '#357a32',
    warning: '#b45309',
    danger: '#ca3120',
    // Solent brand colours that stay readable on white.
    palette: ['#b0111f', '#175d82', '#1c8276', '#9243f4', '#ff4d00', '#3f4254'],
    radius: '8px',
    buttonRadius: '8px',
    shadow: '0 2px 8px rgba(63, 66, 84, 0.18)',
    band: '#3f4254',
    onBand: '#f8f9fa',
    promptNotes: [
      'Match Solent University (Solent Online Learning):',
      '- Clean, light and accessible. White cards with a 1px light-grey border and 8px corners; plenty of white space.',
      '- PT Sans for everything. Headings bold and in sentence case; body text plain, friendly UK English.',
      '- Navy (#3F4254) for headings, title bands and strong text. Slate blue (#425B6C) buttons with white text.',
      '- Solent red (#B0111F) is the brand highlight: use it sparingly for the one thing to notice (a target, a key number, a focus ring), never for big backgrounds.',
      '- For several data series use the palette in order: red, sea blue (#175D82), teal (#1C8276), purple, orange, navy.',
      '- No gradients, glows, neon or emoji-heavy decoration. Simple line icons only.',
    ].join('\n'),
  },
};

export const DEFAULT_THEME = 'solent';

/** CSS variables for a theme (used by host pages and, via the SDK, inside toys). */
export function themeVars(t: Theme): Record<string, string> {
  const v: Record<string, string> = {
    '--tb-font': t.font,
    '--tb-page': t.page,
    '--tb-surface': t.surface,
    '--tb-surface-alt': t.surfaceAlt,
    '--tb-text': t.text,
    '--tb-muted': t.muted,
    '--tb-border': t.border,
    '--tb-grid': t.grid,
    '--tb-primary': t.primary,
    '--tb-on-primary': t.onPrimary,
    '--tb-accent': t.accent,
    '--tb-link': t.link,
    '--tb-success': t.success,
    '--tb-warning': t.warning,
    '--tb-danger': t.danger,
    '--tb-radius': t.radius,
    '--tb-button-radius': t.buttonRadius,
    '--tb-shadow': t.shadow,
    '--tb-band': t.band,
    '--tb-on-band': t.onBand,
  };
  t.palette.forEach((c, i) => (v[`--tb-c${i + 1}`] = c));
  return v;
}

/** Applies a theme's variables (and font) to an element, e.g. a page or the player. */
export function applyTheme(t: Theme, el: HTMLElement = document.documentElement) {
  for (const [k, val] of Object.entries(themeVars(t))) el.style.setProperty(k, val);
  el.dataset.tbTheme = t.id;
  el.dataset.tbMode = t.mode;
  el.style.colorScheme = t.mode;
  if (t.fontFaces?.length && el === document.documentElement) {
    const id = 'tb-theme-fonts';
    document.getElementById(id)?.remove();
    const style = document.createElement('style');
    style.id = id;
    style.textContent = t.fontFaces
      .map((f) => `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:${f.style ?? 'normal'};font-display:swap;src:url("${f.url}")}`)
      .join('\n');
    document.head.appendChild(style);
  }
}

const fontCache = new Map<string, Promise<string | null>>();

/**
 * Turns font URLs into data: URLs so sandboxed toys can use them (toys have no
 * network access, and their opaque origin can't load fonts cross-origin).
 */
export async function resolveThemeFonts(t: Theme, baseUrl: string): Promise<Theme> {
  if (!t.fontFaces?.length) return t;
  const faces = await Promise.all(
    t.fontFaces.map(async (f) => {
      if (f.url.startsWith('data:')) return f;
      const abs = new URL(f.url, baseUrl).href;
      if (!fontCache.has(abs)) {
        fontCache.set(
          abs,
          fetch(abs)
            .then((r) => (r.ok ? r.blob() : Promise.reject()))
            .then(
              (blob) =>
                new Promise<string>((res, rej) => {
                  const fr = new FileReader();
                  fr.onload = () => res(String(fr.result));
                  fr.onerror = rej;
                  fr.readAsDataURL(blob);
                }),
            )
            .catch(() => null),
        );
      }
      const data = await fontCache.get(abs)!;
      return data ? { ...f, url: data } : null;
    }),
  );
  return { ...t, fontFaces: faces.filter(Boolean) as FontFace[] };
}

/** rgb()/rgba()/hex → #rrggbb (keeps rgba() when partly transparent), so toys can add alpha. */
export function toHex(c: string): string {
  const m = c.trim().match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i);
  if (!m) return c.trim();
  if (m[4] !== undefined && parseFloat(m[4]) < (m[4].endsWith('%') ? 100 : 1)) return c.trim();
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
}

/**
 * Builds a theme from the page it's running in (e.g. a Moodle site's theme),
 * reading Bootstrap's CSS variables and computed styles.
 */
export function themeFromPage(base: Theme = THEMES.toybox): Theme {
  const root = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  const v = (...names: string[]) => names.map((n) => root.getPropertyValue(n).trim()).find(Boolean) ?? '';
  const probe = (cls: string, prop: string) => {
    const el = document.createElement(cls.startsWith('a') ? 'a' : 'div');
    el.className = cls.replace(/^a\./, '');
    if (cls.startsWith('a')) el.setAttribute('href', '#');
    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    document.body.appendChild(el);
    const out = getComputedStyle(el).getPropertyValue(prop);
    el.remove();
    return out;
  };
  const primary = toHex(v('--bs-primary', '--primary') || probe('btn btn-primary', 'background-color') || base.primary);
  const family = body.fontFamily.split(',')[0].replace(/["']/g, '').trim();
  const faces: FontFace[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin stylesheet
    }
    for (const r of Array.from(rules)) {
      if (!(r instanceof CSSFontFaceRule)) continue;
      const fam = r.style.getPropertyValue('font-family').replace(/["']/g, '').trim();
      const src = r.style.getPropertyValue('src').match(/url\(["']?([^"')]+)["']?\)/)?.[1];
      if (fam === family && src && faces.length < 4) {
        const url = new URL(src, sheet.href ?? location.href);
        if (url.origin === location.origin) faces.push({ family: fam, weight: r.style.getPropertyValue('font-weight') || '400', url: url.href });
      }
    }
  }
  const text = toHex(body.color || base.text);
  const pageBg = body.backgroundColor && body.backgroundColor !== 'rgba(0, 0, 0, 0)' ? body.backgroundColor : '#ffffff';
  const success = toHex(v('--bs-success', '--success') || base.success);
  const info = toHex(v('--bs-info', '--info') || base.link);
  const danger = toHex(v('--bs-danger', '--danger') || base.danger);
  const warning = toHex(v('--bs-warning', '--warning') || base.warning);
  const link = toHex(probe('a.', 'color') || primary);
  // Distinct data colours: the site's own first, then the base theme's to fill any gaps.
  const palette: string[] = [];
  for (const c of [primary, danger, success, info, warning, link, ...base.palette].map(toHex)) {
    if (!palette.some((p) => p.toLowerCase() === c.toLowerCase()) && palette.length < 6) palette.push(c);
  }
  return {
    id: 'site',
    name: 'This site',
    mode: 'light',
    font: body.fontFamily || base.font,
    fontFaces: faces,
    page: v('--bs-gray-200', '--gray-200') || '#e9ecef',
    surface: toHex(pageBg),
    surfaceAlt: v('--bs-light', '--light') || '#f8f9fa',
    text,
    muted: v('--bs-secondary-color', '--bs-gray-600', '--gray-600') || '#6c757d',
    border: v('--bs-border-color', '--gray-300') || '#dee2e6',
    grid: v('--bs-gray-200', '--gray-200') || '#e9ecef',
    primary,
    onPrimary: toHex(probe('btn btn-primary', 'color') || '#ffffff'),
    accent: danger,
    link,
    success,
    warning,
    danger,
    palette,
    radius: v('--bs-border-radius-lg', '--bs-border-radius') || '8px',
    buttonRadius: v('--bs-border-radius') || '6px',
    shadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    band: v('--bs-dark', '--dark') || '#343a40',
    onBand: '#ffffff',
    promptNotes: `Match this learning site: font ${family || 'system'}, buttons in ${primary} with ${'white'} text, text ${text}, links ${link}. Light, clean cards with rounded corners. Use the brand colour sparingly for highlights.`,
  };
}

/** The "look and feel" section added to AI prompts. */
export function themePromptSection(t: Theme): string {
  const vars = themeVars(t);
  return [
    '## Look and feel',
    t.promptNotes,
    '',
    'Use the ToyBox theme variables (already set for you inside the toy) instead of hard-coded colours, with these values as fallbacks:',
    '```css',
    ...Object.entries(vars).map(([k, v]) => `${k}: ${v};`),
    '```',
  ].join('\n');
}
