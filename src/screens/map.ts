import { dragonSvg, mascotSvg } from '../art';
import type { AppCtx } from '../types';
import { levelPlan } from '../questions';
import { game, isCleared, isLevelUnlocked, levelStars, seeIntro, timeUp, toggleSfx, usageToday } from '../state';
import { esc } from '../util';
import { actionFrom, lockIcon, nav, starIcon, starPill, toastHtml } from '../ui';

const NODE_POS = [
  { x: 18, y: 70 },
  { x: 32, y: 82 },
  { x: 47, y: 68 },
  { x: 62, y: 80 },
  { x: 76, y: 62 },
  { x: 64, y: 46 },
  { x: 46, y: 36 },
];

const PILL = ['', '你好', '数字', '家庭', '教室', '文具', '颜色'];

function pathD(): string {
  const pts = NODE_POS.map((p) => [p.x * 10, p.y * 2.8]);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const mx = (x1 + x2) / 2;
    const my = Math.min(y1, y2) - 16;
    d += ` Q ${mx} ${my} ${x2} ${y2}`;
  }
  return d;
}

function backdrop(): string {
  const d = pathD();
  return `<svg class="map-svg" viewBox="0 0 1000 280" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8fd4ff"/>
        <stop offset="0.55" stop-color="#d7f3ff"/>
        <stop offset="1" stop-color="#b7e6ff"/>
      </linearGradient>
      <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#b6ee7a"/>
        <stop offset="1" stop-color="#5ec45a"/>
      </linearGradient>
    </defs>
    <rect width="1000" height="280" fill="url(#sky)"/>
    <ellipse cx="120" cy="150" rx="70" ry="28" fill="#7dce8a"/>
    <rect x="108" y="118" width="24" height="22" rx="3" fill="#f0c27a"/>
    <path d="M100 122 l20 -16 20 16 z" fill="#e07070"/>
    <ellipse cx="880" cy="70" rx="54" ry="20" fill="#8fd18a"/>
    <rect x="868" y="40" width="18" height="22" fill="#f2d2a2"/>
    <path d="M862 44 h30 l-4 -16 h-8 l-4 8 h-8 z" fill="#e23b3b"/>
    <ellipse cx="500" cy="250" rx="520" ry="70" fill="#5eb0ea"/>
    <ellipse cx="500" cy="188" rx="440" ry="92" fill="#e7c48a"/>
    <ellipse cx="500" cy="180" rx="410" ry="84" fill="url(#grass)"/>
    <path d="M430 120 q 20 50 10 90" fill="none" stroke="#d7f4ff" stroke-width="8" stroke-linecap="round" opacity=".8"/>
    <path d="M560 110 q -10 50 8 100" fill="none" stroke="#e7fbff" stroke-width="7" stroke-linecap="round" opacity=".85"/>
    <g transform="translate(470 28)">
      <rect x="20" y="40" width="40" height="36" fill="#f7d7a5"/>
      <path d="M16 42 h48 l-24 -22 z" fill="#e07070"/>
      <rect x="0" y="28" width="22" height="48" fill="#f3e2c0"/>
      <path d="M-4 30 h30 l-15 -18 z" fill="#c94b4b"/>
      <rect x="62" y="18" width="26" height="58" fill="#fff6e4"/>
      <path d="M58 20 h34 l-17 -20 z" fill="#d64545"/>
      <rect x="70" y="0" width="3" height="16" fill="#8a6a3a"/>
      <path d="M73 2 l10 4 -10 4 z" fill="#ffd24a"/>
      <rect x="34" y="58" width="12" height="18" rx="4" fill="#8a5a32"/>
    </g>
    <circle cx="250" cy="150" r="18" fill="#3e9a45"/><rect x="246" y="160" width="8" height="16" rx="2" fill="#8a5a32"/>
    <circle cx="300" cy="200" r="16" fill="#2f8a40"/><rect x="296" y="208" width="7" height="14" fill="#8a5a32"/>
    <circle cx="700" cy="150" r="18" fill="#3e9a45"/><rect x="696" y="160" width="8" height="16" fill="#8a5a32"/>
    <circle cx="760" cy="196" r="14" fill="#2f8a40"/><rect x="756" y="204" width="7" height="12" fill="#8a5a32"/>
    <path d="${d}" fill="none" stroke="#fff4c2" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <path d="${d}" fill="none" stroke="#ffd56a" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

export function mountMap(root: HTMLElement, ctx: AppCtx): () => void {
  let unitNum = bestUnit(ctx);
  let panel = false;
  let toast = '';
  let timer = 0;

  const onClick = (event: MouseEvent) => {
    const el = actionFrom(event);
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'nav') {
      const to = el.dataset.to;
      if (to === 'map') return;
      if (to === 'draw') ctx.goto({ name: 'draw' });
      else if (to === 'album') ctx.goto({ name: 'album' });
      else if (to === 'parent') ctx.goto(timeUp() ? { name: 'parent-gate' } : { name: 'parent-gate' });
      return;
    }
    if (action === 'select-unit') {
      unitNum = Number(el.dataset.unit);
      draw();
      return;
    }
    if (action === 'open-level') {
      const unit = Number(el.dataset.unit);
      const index = Number(el.dataset.level);
      const meta = ctx.data.units.find((u) => u.unit === unit);
      if (!meta?.playable) {
        notify('即将开放');
        return;
      }
      if (!isLevelUnlocked(unit, index, true)) {
        notify('还没解锁哦');
        return;
      }
      if (timeUp()) {
        ctx.goto({ name: 'timeup' });
        return;
      }
      seeIntro();
      const kind = levelPlan(unit)[index].kind;
      ctx.goto(kind === 'learn' ? { name: 'learn', unit, index } : { name: 'quiz', unit, index });
      return;
    }
    if (action === 'satchel') {
      panel = !panel;
      draw();
      return;
    }
    if (action === 'toggle-sfx') {
      toggleSfx();
      draw();
      return;
    }
    if (action === 'dismiss-intro') {
      seeIntro();
      draw();
    }
  };

  function notify(message: string) {
    toast = message;
    draw();
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      toast = '';
      draw();
    }, 1500);
  }

  function draw() {
    const meta = ctx.data.units.find((u) => u.unit === unitNum) ?? ctx.data.units[0];
    const plan = levelPlan(meta.unit);
    const focus = currentIndex(meta.unit, meta.playable);
    const nodes = plan
      .map((level, index) => {
        const pos = NODE_POS[index];
        const unlocked = isLevelUnlocked(meta.unit, index, meta.playable);
        const cleared = unlocked && isCleared(meta.unit, index);
        const stars = levelStars(meta.unit, index);
        const cls = [
          'node',
          level.boss ? 'boss' : '',
          !unlocked ? 'is-locked' : '',
          cleared ? 'done' : '',
          unlocked && index === focus && !cleared ? 'current' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const face = !unlocked ? lockIcon() : cleared ? starIcon() : level.boss ? '<span class="crown">♛</span>' : starIcon();
        const mini = cleared ? `<span class="mini-stars">${'★'.repeat(stars)}</span>` : '';
        return `<button type="button" class="${cls}" style="left:${pos.x}%;top:${pos.y}%" data-action="open-level" data-unit="${meta.unit}" data-level="${index}" aria-label="${esc(level.title)}">${face}${mini}</button>`;
      })
      .join('');
    const showMascot = meta.playable && isLevelUnlocked(meta.unit, focus, true);
    const pos = NODE_POS[focus];
    const intro =
      !game.introSeen && meta.unit === 1
        ? `<div class="intro" style="left:${NODE_POS[0].x}%;top:${NODE_POS[0].y}%"><b>从这里开始！</b><button type="button" data-action="dismiss-intro">知道啦</button></div>`
        : '';
    root.innerHTML = `<div class="screen map" data-screen="map">
      <header class="topbar">
        <div class="name-pill"><span>陈一</span></div>
        ${starPill()}
        <button type="button" class="satchel${panel ? ' open' : ''}" data-action="satchel" aria-label="背包">
          <svg viewBox="0 0 72 48" aria-hidden="true"><path d="M8 20 h56 v20 a8 8 0 0 1-8 8 H16 a8 8 0 0 1-8-8 z" fill="#f0a04a"/><path d="M20 20 v-6 a16 16 0 0 1 32 0 v6" fill="none" stroke="#c47a12" stroke-width="4"/><rect x="12" y="24" width="14" height="14" rx="4" fill="#5eb0f0"/><rect x="29" y="24" width="14" height="14" rx="4" fill="#b48bff"/><rect x="46" y="24" width="14" height="14" rx="4" fill="#ffd24a"/><text x="53" y="35" font-size="12" text-anchor="middle" fill="#8a5a12">?</text></svg>
        </button>
      </header>
      <div class="unit-dock">
        ${ctx.data.units
          .map((u) => {
            const open = isLevelUnlocked(u.unit, 0, u.playable);
            return `<button type="button" class="unit-pill${u.unit === meta.unit ? ' on' : ''}${open ? '' : ' is-locked'}" data-action="select-unit" data-unit="${u.unit}">${open ? '' : lockIcon()}<span>${u.unit} ${esc(PILL[u.unit] ?? u.titleZh)}</span></button>`;
          })
          .join('')}
      </div>
      <div class="scene">
        <i class="cloud c1"></i><i class="cloud c2"></i><i class="cloud c3"></i>
        ${backdrop()}
        <div class="dragon">${dragonSvg()}</div>
        <div class="unit-banner">第${meta.unit}单元 · ${esc(meta.titleEn)}<small>${esc(meta.titleZh)}</small></div>
        <div class="node-layer">${nodes}</div>
        ${showMascot ? `<div class="mascot" style="left:${pos.x}%;top:${pos.y}%">${mascotSvg()}</div>` : ''}
        ${intro}
        ${
          panel
            ? `<div class="panel">
                <h3>背包</h3>
                <p>闯关得到星星，星星可以抽卡。</p>
                <p>今天已学 ${Math.ceil(usageToday() / 60)} 分钟</p>
                <button type="button" class="btn tiny" data-action="toggle-sfx">${game.settings.muteSfx ? '打开音效' : '关闭音效'}</button>
              </div>`
            : ''
        }
      </div>
      ${nav('map')}
      ${toastHtml(toast)}
    </div>`;
  }

  root.addEventListener('click', onClick);
  draw();
  return () => {
    root.removeEventListener('click', onClick);
    window.clearTimeout(timer);
  };
}

function bestUnit(ctx: AppCtx): number {
  for (const unit of ctx.data.units) {
    if (!unit.playable) continue;
    const plan = levelPlan(unit.unit);
    for (let i = 0; i < plan.length; i++) {
      if (isLevelUnlocked(unit.unit, i, true) && !isCleared(unit.unit, i)) return unit.unit;
    }
  }
  return 1;
}

function currentIndex(unit: number, playable: boolean): number {
  const plan = levelPlan(unit);
  for (let i = 0; i < plan.length; i++) {
    if (isLevelUnlocked(unit, i, playable) && !isCleared(unit, i)) return i;
  }
  return Math.max(0, plan.length - 1);
}
