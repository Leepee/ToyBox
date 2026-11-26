import type { LintIssue } from './lint';
import { themePromptSection, type Theme } from './theme';
import { STARTER } from './examples';

export interface PromptContext {
  mode: 'video' | 'toy';
  /** Toy-only box shape, e.g. '16:9' or 'auto'. */
  aspect?: string;
  /** Video mode: where the toy sits, in % of the video frame. */
  rect?: { x: number; y: number; w: number; h: number };
  start?: number;
  end?: number;
  pause?: boolean;
  /** Current settings JSON, if any. */
  params?: unknown;
  /** The toy's current code, when asking the AI to improve or fix it. */
  existingHtml?: string;
  issues?: LintIssue[];
}

/** The toy guide with the institution's look-and-feel brief appended (for "Download toy guide"). */
export function guideWithTheme(guide: string, theme?: Theme): string {
  if (!theme) return guide;
  return `${guide.trim()}

---

# This institution's style (${theme.name})

${themePromptSection(theme).replace(/^## Look and feel\n/, '')}
`;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Builds a prompt an educator can paste into any AI chat: the full toy guide,
 * then the facts about *this* toy, then a fill-in-the-blanks request.
 */
export function buildAiPrompt(guide: string, ctx: PromptContext, theme?: Theme): string {
  const facts: string[] = [];
  if (ctx.mode === 'toy') {
    facts.push('- Mode: **toy only** (no video). `ToyBox.hasVideo` will be false.');
    facts.push(
      ctx.aspect === 'auto'
        ? '- Size: **fit content**. The page width is fixed by the course page; the height follows your content. Do not use 100vh.'
        : `- Size: a **${ctx.aspect ?? '16:9'}** box that scales with the screen. Fill it (height: 100vh is fine).`,
    );
  } else {
    facts.push('- Mode: **on top of a video**. `ToyBox.hasVideo` will be true.');
    if (ctx.rect)
      facts.push(`- Box: ${ctx.rect.w}% × ${ctx.rect.h}% of the video frame (16:9), at ${ctx.rect.x}% from the left and ${ctx.rect.y}% from the top.`);
    if (ctx.start != null) facts.push(`- Appears at ${mmss(ctx.start)}${ctx.end != null ? `, until ${mmss(ctx.end)}` : ''}.`);
    facts.push(ctx.pause ? '- The video pauses while the toy is shown, and resumes when it calls ToyBox.complete().' : '- The video keeps playing while the toy is shown (keep it light and glanceable).');
  }
  if (ctx.params && Object.keys(ctx.params as object).length)
    facts.push('- Current settings (params):\n```json\n' + JSON.stringify(ctx.params, null, 2) + '\n```');

  // The blank starter counts as "no toy yet", however its whitespace was saved.
  const squash = (h: string) => h.replace(/\s+/g, '');
  const existing = ctx.existingHtml?.trim() && squash(ctx.existingHtml) !== squash(STARTER) ? ctx.existingHtml.trim() : '';

  // The educator's requirements: always included, so there's always somewhere to say what they want.
  const requirements = [
    '## What I want',
    existing ? 'Change the toy above as follows, keeping whatever already works:' : '',
    existing ? '- What to change or fix: [e.g. “make the target random”, “add a hint after two wrong tries”]' : '',
    '- Subject and level: [e.g. GCSE physics, first-year undergraduate statistics]',
    '- The idea the learner should *feel* by playing: [e.g. “doubling the frequency halves the period”]',
    '- What the learner does: [drag, slide, sort, build, predict, draw…]',
    '- How it ends (what counts as done): [e.g. “matches the target wave”, “answers 3 questions”]',
    '- Anything to avoid or include: [vocabulary, colours, accessibility needs]',
  ].filter(Boolean);

  const ask = existing
    ? [
        '## My current toy',
        '```html',
        existing,
        '```',
        ctx.issues?.length
          ? '\nThe ToyBox checker reported these problems. Please fix them too:\n' + ctx.issues.map((i) => `- (${i.level}) ${i.message}`).join('\n')
          : '',
        '',
        ...requirements,
      ].join('\n')
    : requirements.join('\n');

  return `${guide.trim()}

---

# My request

## This toy
${facts.join('\n')}
${theme ? '\n' + themePromptSection(theme) + '\n' : ''}
${ask}

Please reply with the complete toy as **one HTML file** in a single code block, then the settings JSON (params) in a second code block, then 2–3 sentences on how a learner uses it.
`;
}
