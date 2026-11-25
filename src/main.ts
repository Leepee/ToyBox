import { ToyBoxPlayer, fmt } from './player';
import type { Cue } from './types';

const logEl = document.getElementById('log')!;
const done = new Set<string>();

const player = new ToyBoxPlayer(document.getElementById('player')!, {
  onComplete(rec) {
    done.add(rec.cueId);
    const li = logEl.querySelector(`[data-cue="${CSS.escape(rec.cueId)}"]`);
    li?.classList.add('done');
    console.info('[ToyBox] complete', rec);
  },
  onLog(cue, data) {
    console.info('[ToyBox] log', cue.id, data);
  },
});

interface LessonEntry {
  file: string;
  title: string;
  about?: string;
}

// ?lesson=lessons/other.json loads any lesson file; otherwise the first one in lessons/index.json.
const catalog: LessonEntry[] = await fetch('lessons/index.json')
  .then((r) => (r.ok ? r.json() : []))
  .catch(() => []);
const lessonUrl = new URLSearchParams(location.search).get('lesson') ?? catalog[0]?.file ?? 'lessons/fractions.json';

const pick = document.getElementById('lesson-pick') as HTMLSelectElement;
for (const l of catalog) pick.add(new Option(l.title, l.file, false, l.file === lessonUrl));
pick.hidden = catalog.length < 2;
pick.onchange = () => {
  const u = new URL(location.href);
  u.searchParams.set('lesson', pick.value);
  location.href = u.href;
};
document.getElementById('lesson-title')!.textContent =
  catalog.find((l) => l.file === lessonUrl)?.about ?? '';

player
  .loadLesson(lessonUrl)
  .then((lesson) => {
    if (!catalog.length) document.getElementById('lesson-title')!.textContent = lesson.title;
    document.title = `${lesson.title} · ToyBox`;
    renderLog(lesson.cues);
  })
  .catch((e) => {
    document.getElementById('lesson-title')!.textContent = String(e.message ?? e);
  });

function renderLog(cues: Cue[]) {
  logEl.innerHTML = '';
  for (const c of [...cues].sort((a, b) => a.start - b.start)) {
    const li = document.createElement('li');
    li.dataset.cue = c.id;
    li.innerHTML = `<span class="t">${fmt(c.start)}</span>`;
    li.append(c.label ?? c.id);
    li.style.cursor = 'pointer';
    li.onclick = () => player.seek(c.start);
    logEl.appendChild(li);
  }
}
