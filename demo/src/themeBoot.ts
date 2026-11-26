import { DEFAULT_THEME, THEMES, applyTheme, resolveThemeFonts, type Theme } from '../../core/src/theme';

const KEY = 'toybox-theme';
const base = () => new URL('./', location.href).href;

/** ?theme=… wins, then the viewer's last choice, then the default (Solent). */
function chosenId(): string {
  const q = new URLSearchParams(location.search).get('theme');
  if (q && THEMES[q]) return q;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && THEMES[saved]) return saved;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_THEME;
}

/**
 * Applies the chosen theme to the page (fonts resolved to data: URLs so toys can
 * use them too) and wires up the header's theme picker.
 */
export async function bootTheme(onChange?: (t: Theme) => void): Promise<Theme> {
  const theme = await resolveThemeFonts(THEMES[chosenId()], base());
  applyTheme(theme);
  const pick = document.getElementById('theme-pick') as HTMLSelectElement | null;
  if (pick) {
    for (const t of Object.values(THEMES)) pick.add(new Option(t.name, t.id, false, t.id === theme.id));
    pick.onchange = async () => {
      try {
        localStorage.setItem(KEY, pick.value);
      } catch {
        /* storage unavailable */
      }
      const next = await resolveThemeFonts(THEMES[pick.value], base());
      applyTheme(next);
      onChange?.(next);
    };
  }
  return theme;
}

/** Triggers a download of text as a file. */
export function downloadText(filename: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}
