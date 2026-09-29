import { burst } from '../fx';
import { allCards, findCard, RARITY_META, rollCard, seriesOwned } from '../gacha';
import { claimSeries, game, giveCard, ownedCount, seeAlbum, setPity, spendStars, timeUp } from '../state';
import { sfxFlip, sfxLegendary, sfxStar, sfxTap, sfxWrong } from '../sfx';
import { speak } from '../speech';
import type { AppCtx, CardDef, DrawHit, Rarity } from '../types';
import { asset, esc } from '../util';
import { actionFrom, nav, starPill, toastHtml } from '../ui';

const RARITY_RANK: Record<Rarity, number> = { common: 1, rare: 2, epic: 3, legendary: 4 };

function cardLevel(id: string): number {
  return game.owned[id] ?? 0;
}

function levelMark(level: number, maxed: boolean): string {
  const cap = 10;
  const pips = Array.from({ length: cap }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('');
  return `<div class="lv-line"><b>${maxed || level >= cap ? 'MAX' : `Lv.${level}`}</b><span class="pips">${pips}</span></div>`;
}

function gainLine(hit: { isNew: boolean; level: number; refund: number; maxed: boolean }): string {
  if (hit.isNew) return '新卡片';
  if (hit.maxed) return `已满级 MAX，返还 ${hit.refund} 颗星星`;
  return `升级到 Lv.${hit.level}`;
}

export function mountDraw(root: HTMLElement, ctx: AppCtx): () => void {
  let toast = '';
  let timer = 0;
  const manifest = ctx.data.cards;

  const onClick = (event: MouseEvent) => {
    const el = actionFrom(event);
    if (!el) return;
    if (el.dataset.action === 'nav') return goNav(ctx, el.dataset.to);
    if (el.dataset.action === 'do-draw') {
      if (!beginDraw(ctx, 1, manifest.drawCost, notify)) return;
      return;
    }
    if (el.dataset.action === 'do-ten') {
      if (!beginDraw(ctx, 10, manifest.tenDrawCost, notify)) return;
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
    const left = Math.max(1, manifest.pityLegendary - game.pity.legendary);
    const total = allCards(manifest).length;
    root.innerHTML = `<div class="screen draw" data-screen="draw">
      <header class="topbar slim">
        <h2>抽卡</h2>
        ${starPill()}
      </header>
      <div class="draw-hero">
        <div class="pack-wrap">
          <img class="pack" src="${asset(`content/cards/images/${manifest.cardBack}`)}" alt="" />
        </div>
        <p class="pity">距离传说保底还有 <b>${left}</b> 抽</p>
        <div class="draw-actions">
          <button type="button" class="btn big" data-action="do-draw">抽一张<span>${manifest.drawCost} ★</span></button>
          <button type="button" class="btn big ten" data-action="do-ten">十连抽<span>${manifest.tenDrawCost} ★</span></button>
        </div>
        <p class="sub">十连抽比十次单抽少 2 颗星 · 已收集 ${ownedCount()} / ${total}</p>
      </div>
      ${nav('draw')}
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

function beginDraw(ctx: AppCtx, count: number, cost: number, notify: (message: string) => void): boolean {
  const manifest = ctx.data.cards;
  if (timeUp()) {
    ctx.goto({ name: 'timeup' });
    return false;
  }
  if (game.stars < cost) {
    sfxWrong();
    notify('星星还不够，去闯关吧');
    return false;
  }
  spendStars(cost);
  let pity = { ...game.pity };
  const hits: DrawHit[] = [];
  for (let i = 0; i < count; i++) {
    const rolled = rollCard(manifest, pity, Math.random);
    pity = rolled.pity;
    const got = giveCard(rolled.card.id, manifest.maxLevel, manifest.maxRefund);
    hits.push({ cardId: rolled.card.id, isNew: got.isNew, level: got.level, refund: got.refund, maxed: got.maxed });
  }
  setPity(pity);
  sfxFlip();
  if (count === 1 && hits[0]) {
    const hit = hits[0];
    ctx.goto({ name: 'reveal', cardId: hit.cardId, isNew: hit.isNew, level: hit.level, refund: hit.refund, maxed: hit.maxed });
  } else {
    ctx.goto({ name: 'ten', hits });
  }
  return true;
}

export function mountReveal(
  root: HTMLElement,
  ctx: AppCtx,
  screen: { cardId: string; isNew: boolean; level: number; refund: number; maxed: boolean },
): () => void {
  const { cardId, isNew, level, refund, maxed } = screen;
  const found = findCard(ctx.data.cards, cardId);
  if (!found) {
    ctx.goto({ name: 'draw' });
    return () => {};
  }
  const { card } = found;
  const meta = RARITY_META[card.rarity];
  const legendary = card.rarity === 'legendary';
  let flipped = false;

  const onClick = (event: MouseEvent) => {
    const el = actionFrom(event);
    if (!el) return;
    if (el.dataset.action === 'collect') ctx.goto({ name: 'draw' });
    if (el.dataset.action === 'draw-again') {
      const manifest = ctx.data.cards;
      if (timeUp()) {
        ctx.goto({ name: 'timeup' });
        return;
      }
      if (game.stars < manifest.drawCost) {
        sfxWrong();
        ctx.goto({ name: 'draw' });
        return;
      }
      beginDraw(ctx, 1, manifest.drawCost, () => ctx.goto({ name: 'draw' }));
    }
  };

  root.innerHTML = `<div class="screen reveal${legendary ? ' legendary' : ''}" data-screen="reveal">
    ${legendary ? '<div class="rays"></div>' : ''}
    <div class="reveal-stage">
      <div class="flipper" id="flipper">
        <div class="face face-back"><img src="${asset(`content/cards/images/${ctx.data.cards.cardBack}`)}" alt="" /></div>
        <div class="face face-front">
          <div class="card-frame r-${card.rarity}">
            <img src="${asset(`content/cards/images/${card.image}`)}" alt="${esc(card.name)}" />
          </div>
        </div>
      </div>
      <div class="reveal-meta" id="reveal-meta">
        <div class="rarity-banner r-${card.rarity}">${meta.zh}</div>
        ${levelMark(level, maxed)}
        <h2>${esc(card.name)}</h2>
        <p class="blurb">${esc(card.blurb)}</p>
        <p class="dup">${gainLine({ isNew, level, refund, maxed })}</p>
      </div>
      <div class="reveal-actions" id="reveal-actions">
        <button type="button" class="btn ghost" data-action="draw-again">再抽一次<span>${ctx.data.cards.drawCost} ★</span></button>
        <button type="button" class="btn" data-action="collect">收下</button>
      </div>
    </div>
  </div>`;

  root.addEventListener('click', onClick);
  const flipper = root.querySelector('#flipper');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flipped = true;
      flipper?.classList.add('on');
      if (legendary) {
        sfxLegendary();
        const stage = root.querySelector('.reveal-stage');
        if (stage instanceof HTMLElement) {
          const rect = stage.getBoundingClientRect();
          const host = root.querySelector('.stage') ?? stage;
          if (host instanceof HTMLElement) {
            burst(host, rect.width / 2, rect.height / 2, 28);
          }
        }
      } else sfxFlip();
    });
  });
  window.setTimeout(() => {
    root.querySelector('#reveal-actions')?.classList.add('show');
    if (!flipped) flipper?.classList.add('on');
  }, legendary ? 900 : 700);

  return () => root.removeEventListener('click', onClick);
}

export function mountTen(root: HTMLElement, ctx: AppCtx, hits: DrawHit[]): () => void {
  let index = 0;
  let mode: 'flip' | 'grid' = 'flip';
  let timer = 0;
  const best = hits.reduce((max, hit) => {
    const card = findCard(ctx.data.cards, hit.cardId)?.card;
    return Math.max(max, card ? RARITY_RANK[card.rarity] : 0);
  }, 0);

  const onClick = (event: MouseEvent) => {
    const el = actionFrom(event);
    if (!el) return;
    if (el.dataset.action === 'skip-ten' || el.dataset.action === 'show-grid') {
      mode = 'grid';
      window.clearTimeout(timer);
      draw();
      return;
    }
    if (el.dataset.action === 'collect') ctx.goto({ name: 'draw' });
  };

  function schedule() {
    window.clearTimeout(timer);
    if (mode !== 'flip') return;
    timer = window.setTimeout(() => {
      if (index >= hits.length - 1) {
        mode = 'grid';
        draw();
        return;
      }
      index += 1;
      draw();
      schedule();
    }, 650);
  }

  function draw() {
    if (mode === 'grid') {
      root.innerHTML = `<div class="screen ten" data-screen="ten-grid">
        <header class="topbar slim"><h2>十连结果</h2>${starPill()}</header>
        <div class="ten-grid">${hits
          .map((hit) => {
            const found = findCard(ctx.data.cards, hit.cardId);
            if (!found) return '';
            const { card } = found;
            const meta = RARITY_META[card.rarity];
            const top = RARITY_RANK[card.rarity] === best;
            const badge = hit.isNew ? '新卡' : hit.maxed ? 'MAX' : `Lv.${hit.level}`;
            const cls = hit.isNew ? 'badge-new' : hit.maxed ? 'badge-max' : 'badge-up';
            return `<article class="ten-cell r-${card.rarity}${top ? ' best' : ''}">
              ${top ? '<em class="best-tag">最佳</em>' : ''}
              <img src="${asset(`content/cards/images/${card.image}`)}" alt="" />
              <b>${esc(card.name)}</b>
              <small>${meta.zh}</small>
              <span class="ten-badge ${cls}">${badge}</span>
            </article>`;
          })
          .join('')}</div>
        <button type="button" class="btn" data-action="collect">收下</button>
      </div>`;
      return;
    }
    const hit = hits[index];
    const found = hit ? findCard(ctx.data.cards, hit.cardId) : undefined;
    if (!hit || !found) {
      mode = 'grid';
      draw();
      return;
    }
    const { card } = found;
    const meta = RARITY_META[card.rarity];
    root.innerHTML = `<div class="screen ten flip" data-screen="ten-flip">
      <p class="ten-count">第 ${index + 1} / ${hits.length} 张</p>
      <div class="card-frame r-${card.rarity} pop">
        <img src="${asset(`content/cards/images/${card.image}`)}" alt="${esc(card.name)}" />
      </div>
      <div class="rarity-banner r-${card.rarity}">${meta.zh}</div>
      ${levelMark(hit.level, hit.maxed)}
      <h2>${esc(card.name)}</h2>
      <p class="dup">${gainLine(hit)}</p>
      <button type="button" class="btn ghost" data-action="skip-ten">快进到结果</button>
    </div>`;
    if (card.rarity === 'legendary') sfxLegendary();
  }

  root.addEventListener('click', onClick);
  draw();
  schedule();
  return () => {
    root.removeEventListener('click', onClick);
    window.clearTimeout(timer);
  };
}

export function mountAlbum(root: HTMLElement, ctx: AppCtx): () => void {
  const manifest = ctx.data.cards;
  let seriesId = manifest.series[3]?.id ?? manifest.series[0].id;
  let toast = '';
  let rewardName = '';
  let detailId = '';
  let timer = 0;
  seeAlbum(ownedCount());

  const onClick = (event: MouseEvent) => {
    const el = actionFrom(event);
    if (!el) return;
    if (el.dataset.action === 'nav') return goNav(ctx, el.dataset.to);
    if (el.dataset.action === 'tab') {
      seriesId = el.dataset.series ?? seriesId;
      draw();
      return;
    }
    if (el.dataset.action === 'chest') {
      const own = seriesOwned(manifest, seriesId, game.owned);
      const series = manifest.series.find((s) => s.id === seriesId);
      if (!series || own.have < own.total) {
        notify('集齐这一系列就能打开宝箱');
        return;
      }
      if (game.claimed[seriesId]) {
        notify('宝箱已经打开过啦');
        return;
      }
      claimSeries(seriesId, manifest.seriesReward);
      rewardName = series.name;
      sfxStar();
      draw();
      const pop = root.querySelector('.reward-pop');
      if (pop instanceof HTMLElement) burst(root.querySelector('.stage') instanceof HTMLElement ? (root.querySelector('.stage') as HTMLElement) : root, 400, 180, 24);
    }
    if (el.dataset.action === 'close-reward') {
      rewardName = '';
      draw();
      return;
    }
    if (el.dataset.action === 'open-card') {
      detailId = el.dataset.id ?? '';
      draw();
      return;
    }
    if (el.dataset.action === 'close-detail') {
      detailId = '';
      draw();
      return;
    }
    if (el.dataset.action === 'say-word') {
      speak(el.dataset.en ?? '', 0.72);
    }
  };

  function notify(message: string) {
    toast = message;
    draw();
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      toast = '';
      draw();
    }, 1400);
  }

  function draw() {
    const series = manifest.series.find((s) => s.id === seriesId) ?? manifest.series[0];
    const own = seriesOwned(manifest, series.id, game.owned);
    const ready = own.have >= own.total && own.total > 0 && !game.claimed[series.id];
    const pct = own.total ? Math.round((own.have / own.total) * 100) : 0;
    root.innerHTML = `<div class="screen album" data-screen="album">
      <header class="topbar slim">
        <h2>相册</h2>
        ${starPill()}
      </header>
      <div class="tabs">
        ${manifest.series
          .map(
            (s) =>
              `<button type="button" class="tab${s.id === series.id ? ' on' : ''}" style="--tab:${s.color}" data-action="tab" data-series="${s.id}"><span class="tab-ico">${tabIcon(s.id)}</span>${esc(s.name)}</button>`,
          )
          .join('')}
      </div>
      <div class="prog-row">
        ${starPill().replace('star-pill', 'star-pill mini')}
        <div class="prog"><span style="width:${pct}%"></span><b>${own.have}/${own.total}</b></div>
        <button type="button" class="chest${ready ? ' ready' : ''}${game.claimed[series.id] ? ' opened' : ''}" data-action="chest" aria-label="宝箱">
          <svg viewBox="0 0 64 48" aria-hidden="true"><rect x="6" y="18" width="52" height="24" rx="6" fill="#c47a12"/><path d="M8 20 V14 a24 24 0 0 1 48 0 v6" fill="#ffd24a"/><rect x="28" y="24" width="8" height="10" rx="2" fill="#fff6c8"/></svg>
        </button>
      </div>
      <div class="album-grid scroll">
        ${series.cards.map((card) => albumCard(card)).join('')}
      </div>
      ${nav('album')}
      ${toastHtml(toast)}
      ${
        rewardName
          ? `<div class="reward-pop"><div class="modal-card"><h3>集齐 ${esc(rewardName)}！</h3><p>+${manifest.seriesReward} 星星</p><button type="button" class="btn" data-action="close-reward">太好啦</button></div></div>`
          : ''
      }
      ${detailHtml(ctx, detailId)}
    </div>`;
  }

  root.addEventListener('click', onClick);
  draw();
  return () => {
    root.removeEventListener('click', onClick);
    window.clearTimeout(timer);
  };
}

function albumCard(card: CardDef): string {
  const level = cardLevel(card.id);
  const meta = RARITY_META[card.rarity];
  if (level <= 0) {
    return `<button type="button" class="acard sil" data-action="open-card" data-id="${esc(card.id)}"><div class="acard-art"><img src="${asset(`content/cards/images/${card.image}`)}" alt="" /><b>?</b></div>${lockMini()}</button>`;
  }
  const lv = level >= 10 ? 'MAX' : `Lv.${level}`;
  return `<button type="button" class="acard got r-${card.rarity}" data-action="open-card" data-id="${esc(card.id)}"><div class="acard-art"><img src="${asset(`content/cards/images/${card.image}`)}" alt="" /><em class="lv-badge">${lv}</em></div><div><b>${esc(card.name)}</b><small>${meta.zh}</small></div><i class="check">✓</i></button>`;
}

function detailHtml(ctx: AppCtx, id: string): string {
  if (!id) return '';
  const found = findCard(ctx.data.cards, id);
  if (!found) return '';
  const { card } = found;
  const extra = ctx.data.lore[card.id];
  const level = cardLevel(card.id);
  const src = asset(`content/cards/images/${card.image}`);
  if (level <= 0) {
    const hint = extra?.hint ?? '集齐星星后再来遇见它';
    return `<div class="detail-pop"><article class="detail-card locked">
      <div class="sil-frame"><img src="${src}" alt="" /><b>?</b></div>
      <div class="detail-copy">
        <p class="prompt">还没获得</p>
        <p>${esc(hint)}</p>
        <button type="button" class="btn" data-action="close-detail">知道啦</button>
      </div>
    </article></div>`;
  }
  const meta = RARITY_META[card.rarity];
  const word = extra?.word;
  return `<div class="detail-pop"><article class="detail-card">
    <img class="hero" src="${src}" alt="${esc(card.name)}" />
    <div class="detail-copy scroll">
      <h3>${esc(card.name)}</h3>
      <div class="rarity-banner r-${card.rarity}">${meta.zh}</div>
      ${levelMark(level, level >= ctx.data.cards.maxLevel)}
      <p class="blurb">${esc(card.blurb)}</p>
      <h4>知识点</h4>
      <p>${esc(extra?.lore ?? card.blurb)}</p>
      ${
        word
          ? `<button type="button" class="btn ghost word-btn" data-action="say-word" data-en="${esc(word.en)}">${esc(word.en)} · ${esc(word.zh)}</button>`
          : ''
      }
      <button type="button" class="btn" data-action="close-detail">关闭</button>
    </div>
  </article></div>`;
}

function lockMini(): string {
  return `<svg class="lock-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5" fill="#d5dbe8"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#98a2b3" stroke-width="2"/></svg>`;
}

function tabIcon(id: string): string {
  if (id === 'heroes') return shield();
  if (id === 'journey') return cloud();
  if (id === 'digibeasts') return gem();
  return paw();
}

function shield(): string {
  return `<svg viewBox="0 0 32 32"><path d="M16 3l10 4v8c0 7-4.5 11-10 14C10.5 26 6 22 6 15V7z" fill="#fff"/></svg>`;
}
function cloud(): string {
  return `<svg viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="10" ry="6" fill="#fff"/><circle cx="12" cy="16" r="5" fill="#fff"/><circle cx="20" cy="15" r="6" fill="#fff"/></svg>`;
}
function gem(): string {
  return `<svg viewBox="0 0 32 32"><path d="M8 12h16l-8 14zM8 12l8-6 8 6" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;
}
function paw(): string {
  return `<svg viewBox="0 0 32 32"><circle cx="10" cy="12" r="3" fill="#fff"/><circle cx="16" cy="9" r="3" fill="#fff"/><circle cx="22" cy="12" r="3" fill="#fff"/><ellipse cx="16" cy="20" rx="6" ry="5" fill="#fff"/></svg>`;
}

function goNav(ctx: AppCtx, to: string | undefined): void {
  sfxTap();
  if (to === 'map') ctx.goto({ name: 'map' });
  else if (to === 'draw') ctx.goto({ name: 'draw' });
  else if (to === 'album') ctx.goto({ name: 'album' });
  else if (to === 'parent') ctx.goto({ name: 'parent-gate' });
}
