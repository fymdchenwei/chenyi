import './style.css';
import { registerWordImages } from './art';
import { loadAll } from './content';
import { mountAlbum, mountDraw, mountReveal, mountTen } from './screens/collect';
import { mountMap } from './screens/map';
import { mountGate, mountParent, mountTimeup } from './screens/parent';
import { mountLearn, mountQuiz, mountResult } from './screens/play';
import { addUsage, timeUp } from './state';
import type { AppCtx, GameData, Screen } from './types';
import { primeSpeech } from './speech';
import { unlockAudio } from './sfx';

const app = document.querySelector('#app');
if (!(app instanceof HTMLElement)) throw new Error('missing app');

app.innerHTML = `<div class="boot"><div class="boot-title">陈一</div><p>正在打开冒险…</p></div>`;

void loadAll()
  .then((data) => start(app, data))
  .catch(() => {
    app.innerHTML = `<div class="boot"><div class="boot-title">陈一</div><p>内容没有加载出来，请再打开一次。</p></div>`;
  });

function start(root: HTMLElement, data: GameData) {
  registerWordImages(data.units.flatMap((unit) => unit.words));
  root.innerHTML = `<div class="stage-wrap"><div class="stage" id="stage"></div></div>`;
  const stage = root.querySelector('#stage');
  if (!(stage instanceof HTMLElement)) return;

  let cleanup = () => {};
  let usageAcc = 0;
  let screen: Screen = { name: 'map' };

  const ctx: AppCtx = { data, goto };

  function goto(next: Screen) {
    const blocked = timeUp() && next.name !== 'parent' && next.name !== 'parent-gate' && next.name !== 'timeup';
    screen = blocked ? { name: 'timeup' } : next;
    // Only the page after the arithmetic gate may show in portrait.
    document.body.classList.toggle('parent-open', screen.name === 'parent');
    cleanup();
    cleanup = render(stage as HTMLElement, screen, ctx);
  }

  stage.addEventListener('pointerdown', () => {
    unlockAudio();
    primeSpeech();
  });

  document.addEventListener(
    'touchmove',
    (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('.scroll')) return;
      if (
        document.body.classList.contains('parent-open') &&
        window.matchMedia('(orientation: portrait)').matches &&
        target instanceof Element &&
        target.closest('.parent-body')
      ) {
        return;
      }
      event.preventDefault();
    },
    { passive: false },
  );

  window.setInterval(() => {
    if (document.hidden) return;
    if (timeUp()) {
      if (screen.name !== 'timeup' && screen.name !== 'parent' && screen.name !== 'parent-gate') goto({ name: 'timeup' });
      return;
    }
    if (screen.name === 'parent' || screen.name === 'parent-gate' || screen.name === 'timeup') return;
    usageAcc += 1;
    if (usageAcc >= 15) {
      addUsage(usageAcc);
      usageAcc = 0;
    }
  }, 1000);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && usageAcc) {
      addUsage(usageAcc);
      usageAcc = 0;
    }
  });

  goto(timeUp() ? { name: 'timeup' } : { name: 'map' });
}

function render(stage: HTMLElement, screen: Screen, ctx: AppCtx): () => void {
  if (screen.name === 'map') return mountMap(stage, ctx);
  if (screen.name === 'learn') return mountLearn(stage, ctx, screen.unit, screen.index);
  if (screen.name === 'quiz') return mountQuiz(stage, ctx, screen.unit, screen.index);
  if (screen.name === 'result') return mountResult(stage, ctx, screen.unit, screen.index, screen.stars, screen.gained, screen.first);
  if (screen.name === 'draw') return mountDraw(stage, ctx);
  if (screen.name === 'reveal') return mountReveal(stage, ctx, screen);
  if (screen.name === 'ten') return mountTen(stage, ctx, screen.hits);
  if (screen.name === 'album') return mountAlbum(stage, ctx);
  if (screen.name === 'parent-gate') return mountGate(stage, ctx);
  if (screen.name === 'parent') return mountParent(stage, ctx);
  return mountTimeup(stage, ctx);
}
