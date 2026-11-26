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

/** Colours and fonts a host gathered from its site (Moodle page styles, WordPress theme.json…). */
export interface SiteTokens {
  name?: string;
  font?: string;
  fontFaces?: FontFace[];
  text?: string;
  background?: string;
  /** Main button colour (and its text colour, if known). */
  primary?: string;
  onPrimary?: string;
  link?: string;
  /** The site's brand/accent colours, most important first. */
  accents?: string[];
  success?: string;
  warning?: string;
  danger?: string;
  muted?: string;
  border?: string;
  surfaceAlt?: string;
  radius?: string;
  buttonRadius?: string;
  band?: string;
}

/** #rgb / #rrggbb / rgb() → [r, g, b] (0–255), or null. */
function rgbOf(c: string): [number, number, number] | null {
  const h = toHex(c);
  let m = h.match(/^#([0-9a-f]{3})$/i);
  if (m) return [0, 1, 2].map((i) => parseInt(m![1][i] + m![1][i], 16)) as [number, number, number];
  m = h.match(/^#([0-9a-f]{6})/i);
  return m ? ([0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16)) as [number, number, number]) : null;
}
function luminance(c: string): number {
  const rgb = rgbOf(c);
  if (!rgb) return 1;
  const [r, g, b] = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG contrast ratio between two colours (1–21). */
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
/** Straight-line distance between two colours in RGB (0–441). */
function colourDistance(a: string, b: string): number {
  const x = rgbOf(a), y = rgbOf(b);
  if (!x || !y) return 999;
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}
const usable = (c?: string) => !!c && !/^transparent$|rgba\([^)]*,\s*0\)$/i.test(c.trim()) && !!rgbOf(c);

/**
 * Builds a full theme from a site's colours, making sure everything stays readable:
 * colours too faint against the toy's background (e.g. a pale yellow accent on
 * white) are swapped for readable ones.
 */
export function themeFromTokens(t: SiteTokens, base: Theme = THEMES.solent): Theme {
  const surface = usable(t.background) ? toHex(t.background!) : '#ffffff';
  const dark = luminance(surface) < 0.35;
  const fallback = dark ? THEMES.toybox : THEMES.solent;
  const pick = (c: string | undefined, min: number, alt: string) => (usable(c) && contrast(toHex(c!), surface) >= min ? toHex(c!) : alt);
  const text = pick(t.text, 4.5, dark ? '#f1f5f9' : '#1d2125');
  const primary = usable(t.primary) ? toHex(t.primary!) : fallback.primary;
  const onPrimary =
    usable(t.onPrimary) && contrast(toHex(t.onPrimary!), primary) >= 4.5
      ? toHex(t.onPrimary!)
      : contrast('#ffffff', primary) >= contrast('#111111', primary)
        ? '#ffffff'
        : '#111111';
  const link = pick(t.link, 4.5, pick(primary, 4.5, text));
  const danger = pick(t.danger, 3, fallback.danger);
  const success = pick(t.success, 3, fallback.success);
  const warning = pick(t.warning, 3, fallback.warning);
  // Data colours: the site's own (readable ones only), then the fallback theme's.
  const palette: string[] = [];
  for (const c of [...(t.accents ?? []), primary, link, danger, success, ...fallback.palette, ...base.palette]) {
    if (!usable(c)) continue;
    const hex = toHex(c);
    if (contrast(hex, surface) < 3) continue;
    if (palette.some((p) => colourDistance(p, hex) < 60)) continue; // too similar to one we have
    if (palette.length < 6) palette.push(hex);
  }
  // Always six data colours (toys may use --tb-c1 … --tb-c6).
  for (let i = 0; palette.length < 6 && i < 12; i++) palette.push(palette[i % Math.max(1, palette.length)] ?? text);
  const accent = palette.find((c) => c.toLowerCase() !== primary.toLowerCase()) ?? danger;
  const family = (t.font ?? '').split(',')[0].replace(/["']/g, '').trim();
  return {
    id: 'site',
    name: t.name ?? 'This site',
    mode: dark ? 'dark' : 'light',
    font: t.font || fallback.font,
    fontFaces: t.fontFaces ?? [],
    page: dark ? '#0b0f17' : '#e9ecef',
    surface,
    surfaceAlt: usable(t.surfaceAlt) ? toHex(t.surfaceAlt!) : dark ? '#111827' : '#f8f9fa',
    text,
    muted: pick(t.muted, 4.5, dark ? '#94a3b8' : '#5f6670'),
    border: usable(t.border) ? toHex(t.border!) : dark ? 'rgba(255, 255, 255, 0.15)' : '#dee2e6',
    grid: dark ? '#1f2937' : '#e9ecef',
    primary,
    onPrimary,
    accent,
    link,
    success,
    warning,
    danger,
    palette,
    radius: t.radius || '8px',
    buttonRadius: t.buttonRadius || t.radius || '6px',
    shadow: dark ? '0 8px 30px rgba(0, 0, 0, 0.5)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
    band: usable(t.band) ? toHex(t.band!) : dark ? '#111827' : '#343a40',
    onBand: '#ffffff',
    promptNotes: `Match this site's look: font ${family || 'the system font'}, main buttons ${primary} with ${onPrimary} text, text ${text} on ${surface}, links ${link}, brand highlight ${accent}. Clean cards with rounded corners. Use the highlight colour sparingly.`,
  };
}

/**
 * Builds a theme from the page it's running in (e.g. a Moodle site's theme),
 * reading Bootstrap's CSS variables and computed styles.
 */
export function themeFromPage(base: Theme = THEMES.solent): Theme {
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
  const bodyBg = body.backgroundColor;
  return themeFromTokens(
    {
      font: body.fontFamily,
      fontFaces: faces,
      text: body.color,
      background: usable(bodyBg) ? bodyBg : '#ffffff',
      // Bootstrap (Moodle) first, then WordPress block-theme presets.
      primary: v('--bs-primary', '--primary', '--wp--preset--color--primary') || probe('btn btn-primary', 'background-color'),
      onPrimary: probe('btn btn-primary', 'color'),
      link: probe('a.', 'color'),
      accents: [v('--bs-primary', '--primary'), v('--bs-info', '--info')].filter(Boolean),
      success: v('--bs-success', '--success'),
      warning: v('--bs-warning', '--warning'),
      danger: v('--bs-danger', '--danger'),
      muted: v('--bs-secondary-color', '--bs-gray-600', '--gray-600'),
      border: v('--bs-border-color', '--gray-300'),
      surfaceAlt: v('--bs-light', '--light'),
      radius: v('--bs-border-radius-lg', '--bs-border-radius'),
      buttonRadius: v('--bs-border-radius'),
      band: v('--bs-dark', '--dark'),
    },
    base,
  );
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
