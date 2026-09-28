import { countArt, mascotSvg, portrait, wordArt } from '../art';
import { unitByNumber } from '../content';
import { burstAt } from '../fx';
import { levelPlan, makeQuestions, questionWordId, starsFor, type Question } from '../questions';
import { awardLevel, isLevelUnlocked, markLearned, recordAttempt } from '../state';
import { canSpeak, speak, stopSpeech } from '../speech';
import { sfxCombo, sfxCorrect, sfxStar, sfxWrong } from '../sfx';
import type { AppCtx } from '../types';
import { esc, hashStr } from '../util';
import { actionFrom, backBtn, speakerBtn, starIcon, toastHtml, turtleBtn } from '../ui';

export function mountLearn(root: HTMLElement, ctx: AppCtx, unitNum: number, index: number): () => void {
  const unit = unitByNumber(ctx.data, unitNum);
  const words = unit.words;
  let card = 0;
  const seen = new Set<number>([0]);
  let play = 0;
  let spoken = -1;

  const onClick = (event: MouseEvent) => {
    const el = actionFrom(event);
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'back') {
      ctx.goto({ name: 'map' });
      return;
    }
    if (action === 'prev') {
      card = (card + words.length - 1) % words.length;
      seen.add(card);
      play += 1;
      draw();
      return;
    }
    if (action === 'next') {
      card = (card + 1) % words.length;
      seen.add(card);
      play += 1;
      draw();
      return;
    }
    if (action === 'speak') {
      speak(words[card].en, 0.72);
      return;
    }
    if (action === 'turtle') {
      speak(words[card].en, 0.45);
      return;
    }
    if (action === 'finish-learn' && seen.size === words.length) {
      for (const w of words) markLearned(w.id);
      const result = awardLevel(unitNum, index, 3);
      ctx.goto({ name: 'result', unit: unitNum, index, stars: 3, gained: result.gained, first: result.first });
    }
  };

  function draw() {
    const w = words[card];
    if (spoken !== play) {
      spoken = play;
      speak(w.en, 0.72);
    }
    const ready = seen.size === words.length;
    root.innerHTML = `<div class="screen learn" data-screen="learn">
      <header class="qbar">
        ${backBtn()}
        <div class="q-title">${esc(levelPlan(unitNum)[index].title)}</div>
        <div class="q-count">${card + 1}/${words.length}</div>
      </header>
      <div class="learn-layout">
        <button type="button" class="arrow" data-action="prev" aria-label="上一张">‹</button>
        <article class="learn-card">
          <div class="art-wrap">${wordArt(w.id)}</div>
          <h2>${esc(w.en)}</h2>
          <p class="zh">${esc(w.zhShort)}</p>
          ${w.zh !== w.zhShort ? `<p class="zh-book">词表：${esc(w.zh)}</p>` : ''}
          ${w.note ? `<p class="zh-book">${esc(w.note)}</p>` : ''}
          ${w.example ? `<p class="example">${esc(w.example.en)}<small>${esc(w.example.zh)}</small></p>` : ''}
          <div class="speak-row">${speakerBtn()}${turtleBtn()}</div>
        </article>
        <button type="button" class="arrow" data-action="next" aria-label="下一张">›</button>
      </div>
      <div class="dots">${words.map((_, i) => `<i class="${i === card ? 'on' : seen.has(i) ? 'seen' : ''}"></i>`).join('')}</div>
      <button type="button" class="btn finish" data-action="finish-learn" ${ready ? '' : 'disabled'}>我学会啦</button>
      ${canSpeak() ? '' : '<p class="fallback">这台设备暂时没有英语语音，请家长读一读</p>'}
    </div>`;
  }

  root.addEventListener('click', onClick);
  draw();
  return () => {
    root.removeEventListener('click', onClick);
    stopSpeech();
  };
}

interface Tile {
  id: string;
  ch: string;
  used: boolean;
}

export function mountQuiz(root: HTMLElement, ctx: AppCtx, unitNum: number, index: number): () => void {
  const unit = unitByNumber(ctx.data, unitNum);
  const plan = levelPlan(unitNum)[index];
  const questions = makeQuestions(unit, plan.kind, hashStr(`${unitNum}-${index}-${Date.now()}`));
  let queue = questions.map((_, i) => i);
  const tried = new Set<number>();
  let wrongs = 0;
  let hints = 0;
  let combo = 0;
  let lock = false;
  let timer = 0;
  let play = 0;
  let spoken = -1;
  let banner = '';
  let shake = false;
  let flash: { i: number; ok: boolean } | null = null;
  let tiles: Tile[] = [];
  let slots: (string | null)[] = [];
  let picked: number[] = [];
  let faded = new Set<number>();
  let zhShown = false;
  let hintGlow = -1;

  if (questions.length === 0) {
    root.innerHTML = `<div class="screen" data-screen="quiz"><p class="fallback">这关还没准备好</p>${backBtn()}</div>`;
    const onClick = (event: MouseEvent) => {
      const el = actionFrom(event);
      if (el?.dataset.action === 'back') ctx.goto({ name: 'map' });
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }

  setup();

  const onClick = (event: MouseEvent) => {
    const el = actionFrom(event);
    if (!el || (lock && el.dataset.action !== 'back')) return;
    const action = el.dataset.action;
    const q = current();
    if (action === 'back') {
      ctx.goto({ name: 'map' });
      return;
    }
    if (action === 'speak') {
      const text = speakOf(q);
      if (text) {
        const ok = speak(text, 0.72);
        if (!ok) banner = '请家长读一读';
      }
      draw();
      return;
    }
    if (action === 'turtle') {
      const text = speakOf(q);
      if (text) speak(text, 0.45);
      return;
    }
    if (action === 'hint') {
      applyHint(q);
      return;
    }
    if (action === 'pick') {
      const i = Number(el.dataset.i);
      if (faded.has(i)) return;
      const ok = isPickCorrect(q, i);
      flash = { i, ok };
      if (ok) succeed(questionWordId(q));
      else fail(questionWordId(q), hintText(q));
      draw();
      return;
    }
    if (action === 'tile' && q.type === 'dictation') {
      const id = el.dataset.id ?? '';
      const tile = tiles.find((t) => t.id === id);
      const empty = slots.findIndex((s) => s === null);
      if (!tile || tile.used || empty < 0) return;
      tile.used = true;
      slots[empty] = tile.id;
      if (slots.every(Boolean)) {
        const spelled = slots.map((tid) => tiles.find((t) => t.id === tid)?.ch ?? '').join('');
        if (spelled === q.answer) succeed(q.wordId);
        else fail(q.wordId, `再听一次，开头是 ${q.answer[0]}`);
      }
      draw();
      return;
    }
    if (action === 'backspace' && q.type === 'dictation') {
      for (let i = slots.length - 1; i >= 0; i--) {
        if (slots[i]) {
          const tile = tiles.find((t) => t.id === slots[i]);
          if (tile) tile.used = false;
          slots[i] = null;
          break;
        }
      }
      draw();
      return;
    }
    if (action === 'order-add' && q.type === 'order') {
      const i = Number(el.dataset.i);
      if (!picked.includes(i)) picked.push(i);
      hintGlow = -1;
      draw();
      return;
    }
    if (action === 'order-undo' && q.type === 'order') {
      picked.pop();
      draw();
      return;
    }
    if (action === 'order-check' && q.type === 'order') {
      if (picked.length < q.lines.length) return;
      const ok = picked.every((n, i) => n === q.answer[i]);
      if (ok) succeed();
      else fail(undefined, '再想一想顺序');
      draw();
    }
  };

  function current(): Question {
    return questions[queue[0]];
  }

  function setup() {
    const q = current();
    faded = new Set();
    zhShown = false;
    hintGlow = -1;
    flash = null;
    picked = [];
    if (q.type === 'dictation') {
      const letters = q.answer.split('');
      const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('').filter((ch) => !letters.includes(ch));
      const extra = letters.length >= 7 ? 2 : 3;
      const extras: string[] = [];
      const pool = [...alphabet];
      while (extras.length < extra && pool.length) {
        extras.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      }
      const all = [...letters, ...extras].map((ch, i) => ({ id: `${play}-${i}-${ch}`, ch, used: false }));
      tiles = shuffleLocal(all);
      slots = letters.map(() => null);
    }
  }

  function applyHint(q: Question) {
    if (q.type === 'dictation') {
      const i = slots.findIndex((s) => s === null);
      if (i < 0) return;
      const ch = q.answer[i];
      const tile = tiles.find((t) => !t.used && t.ch === ch);
      if (!tile) return;
      tile.used = true;
      slots[i] = tile.id;
      hints += 1;
      if (slots.every(Boolean)) {
        const spelled = slots.map((tid) => tiles.find((t) => t.id === tid)?.ch ?? '').join('');
        if (spelled === q.answer) {
          draw();
          succeed(q.wordId);
          return;
        }
      }
      draw();
      return;
    }
    if (q.type === 'order') {
      hints += 1;
      hintGlow = q.answer[picked.length] ?? -1;
      banner = '发亮的排在下一个';
      draw();
      return;
    }
    if (faded.size >= 2) return;
    const wrongsIdx = optionCount(q)
      .map((_, i) => i)
      .filter((i) => i !== correctIndex(q) && !faded.has(i));
    if (!wrongsIdx.length) return;
    faded.add(wrongsIdx[0]);
    hints += 1;
    if (q.type === 'who') zhShown = true;
    draw();
  }

  function succeed(wordId?: string) {
    const idx = queue[0];
    const first = !tried.has(idx);
    if (first) {
      tried.add(idx);
      recordAttempt(wordId, true);
    }
    combo += 1;
    if (combo >= 2) sfxCombo(combo);
    else sfxCorrect();
    banner = combo >= 2 ? `连击 x${combo}！` : '答对啦！';
    shake = false;
    lock = true;
    later(() => {
      queue.shift();
      lock = false;
      banner = '';
      flash = null;
      if (!queue.length) {
        const stars = starsFor(wrongs, hints);
        const result = awardLevel(unitNum, index, stars);
        ctx.goto({ name: 'result', unit: unitNum, index, stars, gained: result.gained, first: result.first });
        return;
      }
      play += 1;
      setup();
      draw();
    }, 720);
  }

  function fail(wordId: string | undefined, message: string) {
    const idx = queue[0];
    if (!tried.has(idx)) {
      tried.add(idx);
      wrongs += 1;
      recordAttempt(wordId, false);
    }
    combo = 0;
    sfxWrong();
    banner = message;
    shake = true;
    lock = true;
    later(() => {
      const cur = queue.shift();
      if (cur !== undefined) queue.push(cur);
      lock = false;
      banner = '';
      shake = false;
      flash = null;
      play += 1;
      setup();
      draw();
    }, 900);
  }

  function later(fn: () => void, ms: number) {
    window.clearTimeout(timer);
    timer = window.setTimeout(fn, ms);
  }

  function draw() {
    const q = current();
    const text = speakOf(q);
    if (text && spoken !== play) {
      spoken = play;
      if (!speak(text, 0.72) && (q.type === 'dictation' || q.type === 'listen-picture' || q.type === 'count-hear')) {
        banner = q.type === 'dictation' ? `看一看：${q.answer}` : `请家长读：${text}`;
      }
    }
    const solved = questions.length - queue.length;
    const pct = Math.round((solved / questions.length) * 100);
    const projected = starsFor(wrongs, hints);
    const hearts = Math.max(1, 5 - wrongs);
    root.innerHTML = `<div class="screen quiz ${shake ? 'shake' : ''}" data-screen="quiz" data-q="${q.type}">
      <header class="qbar">
        ${backBtn()}
        <div class="q-stars">${[1, 2, 3].map((n) => `<span class="${n <= projected ? 'on' : ''}">${starIcon()}</span>`).join('')}</div>
        <div class="q-progress" aria-hidden="true"><span style="width:${pct}%"></span></div>
        <div class="combo${combo >= 2 ? ' on' : ''}">${combo >= 2 ? `x${combo} 连击` : plan.title}</div>
        <div class="heart">♥ ${hearts}</div>
      </header>
      <div class="q-body">${body(q)}</div>
      ${toastHtml(banner)}
    </div>`;
  }

  function body(q: Question): string {
    if (q.type === 'dictation') {
      const slotHtml = slots
        .map((id) => {
          const ch = tiles.find((t) => t.id === id)?.ch ?? '';
          return `<span class="slot${ch ? ' filled' : ''}">${esc(ch)}</span>`;
        })
        .join('');
      const tileHtml = tiles
        .map(
          (t) =>
            `<button type="button" class="tile${t.used ? ' used' : ''}" data-action="tile" data-id="${t.id}" ${t.used ? 'disabled' : ''}>${esc(t.ch)}</button>`,
        )
        .join('');
      return `<div class="dict-layout">
        <div class="mascot-side">${mascotSvg()}</div>
        <div class="dict-main">
          <p class="prompt">听一听，拼出来</p>
          <div class="speak-row">${speakerBtn()}${turtleBtn()}</div>
          <div class="slots">${slotHtml}</div>
        </div>
        <button type="button" class="hint-btn" data-action="hint">提示</button>
      </div>
      <div class="tiles">${tileHtml}<button type="button" class="tile backspace" data-action="backspace" aria-label="删除">×</button></div>`;
    }
    if (q.type === 'meaning-en-zh' || q.type === 'meaning-zh-en') {
      const prompt =
        q.type === 'meaning-en-zh'
          ? `<div class="prompt-card">${wordArt(q.wordId)}<h2>${esc(q.en)}</h2><div class="speak-row">${speakerBtn()}${turtleBtn()}</div></div>`
          : `<div class="prompt-card zh-card"><p class="big-zh">${esc(q.zh)}</p><p class="prompt">哪一个单词？</p></div>`;
      return `<div class="mean-layout">${prompt}<div class="choice-grid">${q.options
        .map((o, i) => choice(i, esc(o.label), q.type === 'meaning-zh-en'))
        .join('')}</div></div>`;
    }
    if (q.type === 'listen-picture') {
      return `<div class="listen-layout">
        <p class="prompt">听一听，选图片</p>
        <div class="speak-row big">${speakerBtn()}${turtleBtn()}</div>
        <div class="pic-grid">${q.options
          .map((o, i) => {
            const cls = optClass(i);
            return `<button type="button" class="pic-card${cls}" data-action="pick" data-i="${i}" ${faded.has(i) ? 'disabled' : ''}>${wordArt(o.wordId)}</button>`;
          })
          .join('')}</div>
      </div>`;
    }
    if (q.type === 'who') {
      return `<div class="who-layout">
        <div class="who-top">
          <div class="speak-row">${speakerBtn()}${turtleBtn()}</div>
          <div class="bubble">${esc(q.en)}</div>
          ${zhShown ? `<p class="zh">${esc(q.zh)}</p>` : ''}
        </div>
        <p class="prompt">谁说的？</p>
        <div class="pic-grid">${q.options
          .map((o, i) => {
            return `<button type="button" class="pic-card portrait-card${optClass(i)}" data-action="pick" data-i="${i}" ${faded.has(i) ? 'disabled' : ''}>${portrait(o.face)}<span>${esc(o.name)}</span></button>`;
          })
          .join('')}</div>
        <button type="button" class="hint-btn slim" data-action="hint">提示</button>
      </div>`;
    }
    if (q.type === 'fill') {
      return `<div class="fill-layout">
        <div class="prompt-card">
          <p class="sentence">${esc(q.before)}<span class="blank">____</span>${esc(q.after)}</p>
          <p class="zh">${esc(q.zh)}</p>
        </div>
        <div class="choice-grid">${q.options.map((o, i) => choice(i, esc(o), true)).join('')}</div>
        <button type="button" class="hint-btn slim" data-action="hint">提示</button>
      </div>`;
    }
    if (q.type === 'order') {
      const strip = q.answer
        .map((_, i) => {
          const pick = picked[i];
          if (pick === undefined) return `<span class="order-slot"></span>`;
          return `<button type="button" class="order-chip" data-action="order-undo">${esc(q.lines[pick].en)}</button>`;
        })
        .join('');
      const cards = q.lines
        .map((line, i) => {
          if (picked.includes(i)) return '';
          const glow = i === hintGlow ? ' glow' : '';
          return `<button type="button" class="order-card${glow}" data-action="order-add" data-i="${i}"><b>${esc(line.en)}</b><small>${esc(line.zh)}</small></button>`;
        })
        .join('');
      return `<div class="order-layout">
        <p class="prompt">按顺序点一点</p>
        <div class="order-strip">${strip}</div>
        <div class="order-list">${cards}</div>
        <button type="button" class="btn slim" data-action="order-check" ${picked.length === q.lines.length ? '' : 'disabled'}>对一对</button>
      </div>`;
    }
    if (q.type === 'count-see') {
      return `<div class="mean-layout">
        <div class="prompt-card">${countArt(q.n, false, `see${q.n}`)}<p class="prompt">数一数，选单词</p></div>
        <div class="choice-grid">${q.options.map((o, i) => choice(i, esc(o.label), true)).join('')}</div>
      </div>`;
    }
    return `<div class="listen-layout">
      <p class="prompt">听数字，选一选</p>
      <div class="speak-row big">${speakerBtn()}${turtleBtn()}</div>
      <div class="pic-grid">${q.options
        .map((o, i) => `<button type="button" class="pic-card${optClass(i)}" data-action="pick" data-i="${i}">${countArt(o.n, false, `h${play}${i}`)}</button>`)
        .join('')}</div>
    </div>`;
  }

  function choice(i: number, label: string, english: boolean): string {
    return `<button type="button" class="choice${english ? ' en' : ''}${optClass(i)}" data-action="pick" data-i="${i}" ${faded.has(i) ? 'disabled' : ''}>${label}</button>`;
  }

  function optClass(i: number): string {
    const bits = [];
    if (faded.has(i)) bits.push('dim');
    if (flash && flash.i === i) bits.push(flash.ok ? 'good' : 'bad');
    return bits.length ? ` ${bits.join(' ')}` : '';
  }

  root.addEventListener('click', onClick);
  draw();
  return () => {
    root.removeEventListener('click', onClick);
    window.clearTimeout(timer);
    stopSpeech();
  };
}

function speakOf(q: Question): string | null {
  if (q.type === 'dictation' || q.type === 'meaning-en-zh' || q.type === 'listen-picture' || q.type === 'who' || q.type === 'count-hear') {
    return q.speak;
  }
  return null;
}

function correctIndex(q: Question): number {
  if (q.type === 'order' || q.type === 'dictation') return -1;
  return q.answer;
}

function optionCount(q: Question): number[] {
  if (q.type === 'meaning-en-zh' || q.type === 'meaning-zh-en' || q.type === 'fill') return q.options.map((_, i) => i);
  if (q.type === 'listen-picture' || q.type === 'who' || q.type === 'count-see' || q.type === 'count-hear') return q.options.map((_, i) => i);
  return [];
}

function isPickCorrect(q: Question, i: number): boolean {
  if (q.type === 'order' || q.type === 'dictation') return false;
  return i === q.answer;
}

function hintText(q: Question): string {
  if (q.type === 'meaning-en-zh' || q.type === 'meaning-zh-en') return `再记一记：${q.options[q.answer].label}`;
  if (q.type === 'fill') return `再记一记：${q.options[q.answer]}`;
  if (q.type === 'who') return `是${q.options[q.answer].name}说的`;
  if (q.type === 'listen-picture') return '再听一次';
  if (q.type === 'count-see') return `是 ${q.options[q.answer].label}`;
  if (q.type === 'count-hear') return '再数一次';
  return '再试一次';
}

function shuffleLocal<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

export function mountResult(
  root: HTMLElement,
  ctx: AppCtx,
  unitNum: number,
  index: number,
  stars: number,
  gained: number,
  first: boolean,
): () => void {
  const plan = levelPlan(unitNum);
  const title = stars >= 3 ? '太棒了！' : stars === 2 ? '很好！' : '完成啦！';
  const next = nextStep(ctx, unitNum, index);
  root.innerHTML = `<div class="screen result" data-screen="result">
    <h2>${title}</h2>
    <p class="sub">${esc(plan[index]?.title ?? '')}${first ? '' : ' · 又闯了一次'}</p>
    <div class="res-stars">${[1, 2, 3]
      .map((n) => `<span class="res-star${n <= stars ? ' on' : ''}" style="animation-delay:${n * 0.15}s">${starIcon()}</span>`)
      .join('')}</div>
    <p class="gain">${gained > 0 ? `得到 ${gained} 颗星星` : '星星已经拿过啦'}</p>
    <div class="res-actions">
      <button type="button" class="btn ghost" data-action="home">回地图</button>
      <button type="button" class="btn" data-action="replay">再玩一次</button>
      ${next ? `<button type="button" class="btn green" data-action="next">下一关</button>` : ''}
    </div>
  </div>`;
  const starEls = root.querySelectorAll('.res-star.on');
  starEls.forEach((el, i) => {
    window.setTimeout(() => {
      if (el instanceof HTMLElement) {
        sfxStar();
        burstAt(el, 10);
      }
    }, 200 + i * 180);
  });
  const onClick = (event: MouseEvent) => {
    const el = actionFrom(event);
    if (!el) return;
    if (el.dataset.action === 'home') ctx.goto({ name: 'map' });
    if (el.dataset.action === 'replay') {
      const kind = plan[index].kind;
      ctx.goto(kind === 'learn' ? { name: 'learn', unit: unitNum, index } : { name: 'quiz', unit: unitNum, index });
    }
    if (el.dataset.action === 'next' && next) ctx.goto(next);
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}

function nextStep(ctx: AppCtx, unitNum: number, index: number): { name: 'learn' | 'quiz'; unit: number; index: number } | null {
  const plan = levelPlan(unitNum);
  if (index + 1 < plan.length && isLevelUnlocked(unitNum, index + 1, true)) {
    const kind = plan[index + 1].kind;
    return { name: kind === 'learn' ? 'learn' : 'quiz', unit: unitNum, index: index + 1 };
  }
  const nextUnit = ctx.data.units.find((u) => u.unit === unitNum + 1);
  if (nextUnit?.playable && isLevelUnlocked(nextUnit.unit, 0, true)) {
    const kind = levelPlan(nextUnit.unit)[0].kind;
    return { name: kind === 'learn' ? 'learn' : 'quiz', unit: nextUnit.unit, index: 0 };
  }
  return null;
}
