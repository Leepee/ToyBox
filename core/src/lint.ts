/**
 * A quick, friendly check of a toy's HTML before it goes live.
 * It's not a security boundary (the sandbox + CSP are); it just explains
 * things that won't work, in words an educator (or their AI) can act on.
 */
export interface LintIssue {
  level: 'error' | 'warning' | 'tip';
  message: string;
}

export interface LintContext {
  /** 'toy' = shown on its own; 'video' = overlaid on a video. */
  mode?: 'video' | 'toy';
  /** Toy-only "fit content" sizing. */
  autoHeight?: boolean;
}

export function lintToy(html: string, ctx: LintContext = {}): LintIssue[] {
  const out: LintIssue[] = [];
  const add = (level: LintIssue['level'], message: string) => out.push({ level, message });
  const code = html ?? '';

  if (!code.trim()) {
    add('error', 'The toy is empty.');
    return out;
  }
  const kb = new Blob([code]).size / 1024;
  if (kb > 1024) add('error', `The toy is ${Math.round(kb)} KB. Keep it under 1 MB (embed fewer or smaller images).`);
  else if (kb > 300) add('warning', `The toy is ${Math.round(kb)} KB, which is large. It may be slow to load.`);

  if (!/<script/i.test(code)) add('warning', 'There is no <script>, so the toy can’t be interactive or report completion.');
  if (!/ToyBox\s*\./.test(code)) {
    add('warning', 'The toy doesn’t use the ToyBox SDK, so it can’t receive settings or report that the learner finished.');
  } else {
    if (!/ToyBox\s*\.\s*complete\s*\(/.test(code))
      add('warning', 'The toy never calls ToyBox.complete(…), so it can’t count towards activity completion.');
    if (!/ToyBox\s*\.\s*onInit\s*\(/.test(code))
      add('tip', 'Wrap your setup in ToyBox.onInit(function (params) { … }) so educators can change its settings.');
  }

  const external = [...code.matchAll(/\b(?:src|href)\s*=\s*["'](https?:)?\/\/([^"'/]+)[^"']*["']/gi)]
    .filter((m) => !/toybox-sdk\.js/.test(m[0]))
    .map((m) => m[2]);
  if (external.length)
    add('error', `It loads files from the internet (${[...new Set(external)].join(', ')}). Toys can’t do that: put the code/CSS inline and images as data: URLs.`);
  if (/@import\s+url\(\s*["']?https?:/i.test(code) || /url\(\s*["']?https?:/i.test(code))
    add('error', 'Its CSS loads something from the internet (e.g. a web font). That’s blocked; use system fonts.');
  if (/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/.test(code))
    add('error', 'It tries to use the network (fetch / XMLHttpRequest / WebSocket). Toys run offline, so this is blocked.');
  if (/\b(alert|confirm|prompt)\s*\(/.test(code))
    add('error', 'alert() / confirm() / prompt() pop-ups are blocked. Show messages inside the toy instead.');
  if (/\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/.test(code))
    add('error', 'Browser storage (localStorage, cookies…) isn’t available to toys and will throw an error.');
  if (/\b(window\.top|parent\.document|top\.location|window\.open)\b/.test(code))
    add('error', 'Toys can’t reach the page around them or open windows.');
  if (/\b(location\s*\.\s*(href|assign|replace)|(window|document|self|top|parent)\s*\.\s*location\b|location\s*=)/.test(code) || /http-equiv\s*=\s*["']?refresh/i.test(code))
    add('error', 'It tries to go to another web page (location / refresh). Toys must stay on their own page; ToyBox stops any toy that navigates away.');
  if (/<a\b[^>]*\bhref\s*=\s*["']?(https?:)?\/\//i.test(code))
    add('warning', 'It links to another website. Clicking a link would take the toy away from its page, and ToyBox would stop it. Put links in the course page instead.');
  if (/type\s*=\s*["']?password/i.test(code) || /\b(password|passcode|log\s*in|sign\s*in|username)\b/i.test(code.replace(/<script[\s\S]*?<\/script>/gi, '')))
    add('error', 'It mentions passwords or signing in. Toys must never ask learners for passwords or personal details.');
  if (/\b(RTCPeerConnection|RTCDataChannel|webkitRTCPeerConnection)\b/.test(code))
    add('error', 'It uses WebRTC (peer-to-peer connections). Toys must not connect to anything outside the page.');
  if (/<form\b/i.test(code) && /\baction\s*=/i.test(code))
    add('warning', 'Forms can’t be submitted. Handle button clicks in JavaScript instead.');

  if (ctx.mode === 'toy' && ctx.autoHeight && /100vh/.test(code))
    add('warning', 'With “fit content” sizing, don’t use 100vh heights. Let the content set the height, or pick a fixed shape.');
  const hexes = new Set((code.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? []).map((h) => h.toLowerCase()));
  if (hexes.size >= 4 && !/var\(--tb-/.test(code))
    add('tip', `It uses ${hexes.size} fixed colours. Use the theme variables (var(--tb-primary), var(--tb-surface)… and ToyBox.color() on a canvas) so it matches your institution's look.`);
  if (/\b(width|height)\s*:\s*(\d{4,})px/.test(code))
    add('tip', 'Some sizes are very large fixed pixels. Use %, vw/vh or flex/grid so the toy fits any screen.');

  return out;
}
