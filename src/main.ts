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

// ?lesson=lessons/other.json lets you load any lesson file.
const lessonUrl = new URLSearchParams(location.search).get('lesson') ?? 'lessons/fractions.json';

player
  .loadLesson(lessonUrl)
  .then((lesson) => {
    document.getElementById('lesson-title')!.textContent = lesson.title;
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
