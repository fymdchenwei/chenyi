import type { AppCtx } from '../types';
import { levelPlan } from '../questions';
import {
  game,
  isCleared,
  levelStars,
  ownedCount,
  resetProgress,
  setDailyMin,
  timeUp,
  toggleSpeech,
  usageToday,
} from '../state';
import { esc } from '../util';
import { actionFrom, backBtn, nav, starPill, toastHtml } from '../ui';

export function mountGate(root: HTMLElement, ctx: AppCtx): () => void {
  let a = 18 + Math.floor(Math.random() * 41);
  let b = 17 + Math.floor(Math.random() * 41);
  let entry = '';
  let shake = false;

  const onClick = (event: MouseEvent) => {
    const el = actionFrom(event);
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'back') {
      ctx.goto(timeUp() ? { name: 'timeup' } : { name: 'map' });
      return;
    }
    if (action === 'digit') {
      if (entry.length >= 3) return;
      entry += el.dataset.digit ?? '';
      shake = false;
      draw();
      return;
    }
    if (action === 'del') {
      entry = entry.slice(0, -1);
      draw();
      return;
    }
    if (action === 'ok') {
      if (Number(entry) === a + b) ctx.goto({ name: 'parent' });
      else {
        shake = true;
        entry = '';
        a = 18 + Math.floor(Math.random() * 41);
        b = 17 + Math.floor(Math.random() * 41);
        draw();
      }
    }
  };

  function draw() {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
    root.innerHTML = `<div class="screen gate" data-screen="gate">
      <header class="qbar">${backBtn()}<div class="q-title">家长验证</div></header>
      <div class="gate-body">
        <div class="problem ${shake ? 'shake' : ''}">
          <p>请输入答案</p>
          <h2>${a} + ${b} =</h2>
          <div class="entry">${esc(entry || '？')}</div>
          ${shake ? '<small>再算一次</small>' : '<small>给爸爸妈妈的题目</small>'}
        </div>
        <div class="numpad">
          ${keys
            .map((k) => {
              if (k === 'del') return `<button type="button" data-action="del">删除</button>`;
              if (k === 'ok') return `<button type="button" class="ok" data-action="ok">确定</button>`;
              return `<button type="button" data-action="digit" data-digit="${k}">${k}</button>`;
            })
            .join('')}
        </div>
      </div>
    </div>`;
  }

  root.addEventListener('click', onClick);
  draw();
  return () => root.removeEventListener('click', onClick);
}

export function mountParent(root: HTMLElement, ctx: AppCtx): () => void {
  let confirm = false;
  const limits = [
    [10, '10分钟'],
    [15, '15分钟'],
    [20, '20分钟'],
    [30, '30分钟'],
    [45, '45分钟'],
    [0, '不限制'],
  ] as const;

  const onClick = (event: MouseEvent) => {
    const el = actionFrom(event);
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'nav') {
      const to = el.dataset.to;
      if (to === 'map') ctx.goto({ name: 'map' });
      else if (to === 'draw') ctx.goto({ name: 'draw' });
      else if (to === 'album') ctx.goto({ name: 'album' });
      return;
    }
    if (action === 'back') ctx.goto({ name: 'map' });
    if (action === 'limit') setDailyMin(Number(el.dataset.min));
    if (action === 'speech') toggleSpeech();
    if (action === 'reset') confirm = true;
    if (action === 'reset-no') confirm = false;
    if (action === 'reset-yes') {
      resetProgress();
      confirm = false;
      ctx.goto({ name: 'map' });
      return;
    }
    draw();
  };

  function draw() {
    const units = ctx.data.units.filter((u) => u.playable);
    let attempts = 0;
    let correct = 0;
    let learned = 0;
    let total = 0;
    const groups = units
      .map((unit) => {
        const rows = unit.words
          .map((w) => {
            total += 1;
            const stat = game.words[w.id];
            if (stat?.learned) learned += 1;
            if (stat) {
              attempts += stat.attempts;
              correct += stat.correct;
            }
            const acc = stat && stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : 0;
            return `<div class="wrow">
              <b>${esc(w.en)}</b>
              <span>${esc(w.zhShort)}</span>
              <i class="${stat?.learned ? 'yes' : ''}">${stat?.learned ? '已学' : '未学'}</i>
              <em><span style="width:${acc}%"></span></em>
              <small>${stat ? `${stat.correct}/${stat.attempts}` : '—'}</small>
            </div>`;
          })
          .join('');
        const levels = levelPlan(unit.unit)
          .map((level, index) => {
            const cleared = isCleared(unit.unit, index);
            const stars = levelStars(unit.unit, index);
            return `<div class="lrow">
              <b>${esc(level.title)}</b>
              <i class="${cleared ? 'yes' : ''}">${cleared ? '已练习' : '未练习'}</i>
              <small>${cleared ? `${stars}★` : '—'}</small>
            </div>`;
          })
          .join('');
        return `<section class="practice-unit"><h3>第${unit.unit}单元 ${esc(unit.titleEn)}</h3><div class="level-list">${levels}</div>${rows}</section>`;
      })
      .join('');
    const accAll = attempts ? Math.round((correct / attempts) * 100) : 0;
    const used = Math.floor(usageToday() / 60);
    const limit = game.settings.dailyMin;
    root.innerHTML = `<div class="screen parent" data-screen="parent">
      <header class="topbar slim">${backBtn()}<h2>家长</h2>${starPill()}</header>
      <div class="parent-body">
        <div class="stats">
          <div><b>${used}${limit ? ` / ${limit}` : ''}</b><span>今天分钟</span></div>
          <div><b>${game.stars}</b><span>可用星星</span></div>
          <div><b>${game.totalEarned}</b><span>累计星星</span></div>
          <div><b>${learned}/${total}</b><span>已学单词</span></div>
          <div><b>${accAll}%</b><span>正确率</span></div>
          <div><b>${ownedCount()}</b><span>卡片</span></div>
        </div>
        <div class="limits">
          <span>每日时长</span>
          ${limits
            .map(
              ([min, label]) =>
                `<button type="button" class="chip${game.settings.dailyMin === min ? ' on' : ''}" data-action="limit" data-min="${min}">${label}</button>`,
            )
            .join('')}
          <button type="button" class="chip${game.settings.muteSpeech ? ' on' : ''}" data-action="speech">${game.settings.muteSpeech ? '发音已关' : '发音开着'}</button>
        </div>
        <div class="word-table scroll">
          <h3 class="practice-head">已经练习</h3>
          ${groups}
        </div>
        <button type="button" class="btn danger" data-action="reset">重置进度</button>
      </div>
      ${nav('parent')}
      ${
        confirm
          ? `<div class="reward-pop"><div class="modal-card"><h3>清空所有进度？</h3><p>星星、卡片和学习记录都会消失。每日时长会留下。</p><div class="res-actions"><button type="button" class="btn ghost" data-action="reset-no">再想想</button><button type="button" class="btn danger" data-action="reset-yes">清空</button></div></div></div>`
          : ''
      }
    </div>`;
  }

  root.addEventListener('click', onClick);
  draw();
  return () => root.removeEventListener('click', onClick);
}

export function mountTimeup(root: HTMLElement, ctx: AppCtx): () => void {
  const used = Math.floor(usageToday() / 60);
  root.innerHTML = `<div class="screen timeup" data-screen="timeup">
    <div class="time-card">
      <div class="moon">☾</div>
      <h2>今天玩得够多啦</h2>
      <p>已经学习 ${used} 分钟。明天再来冒险吧！</p>
      <button type="button" class="btn" data-action="parent">家长来看看</button>
    </div>
    ${toastHtml('')}
  </div>`;
  const onClick = (event: MouseEvent) => {
    const el = actionFrom(event);
    if (el?.dataset.action === 'parent') ctx.goto({ name: 'parent-gate' });
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
