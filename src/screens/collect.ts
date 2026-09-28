import { burst } from '../fx';
import { allCards, findCard, RARITY_META, rollCard, seriesOwned } from '../gacha';
import { claimSeries, game, giveCard, ownedCount, seeAlbum, setPity, spendStars, timeUp } from '../state';
import { sfxFlip, sfxLegendary, sfxStar, sfxTap, sfxWrong } from '../sfx';
import type { AppCtx, CardDef } from '../types';
import { asset, esc } from '../util';
import { actionFrom, nav, starPill, toastHtml } from '../ui';

export function mountDraw(root: HTMLElement, ctx: AppCtx): () => void {
  let toast = '';
  let timer = 0;
  const manifest = ctx.data.cards;

  const onClick = (event: MouseEvent) => {
    const el = actionFrom(event);
    if (!el) return;
    if (el.dataset.action === 'nav') return goNav(ctx, el.dataset.to);
    if (el.dataset.action === 'do-draw') {
      if (timeUp()) {
        ctx.goto({ name: 'timeup' });
        return;
      }
      if (game.stars < manifest.drawCost) {
        sfxWrong();
        notify('星星还不够，去闯关吧');
        return;
      }
      const rolled = rollCard(manifest, game.pity, Math.random);
      const prev = game.owned[rolled.card.id] ?? 0;
      const refund = prev > 0 ? manifest.duplicateRefund[rolled.card.rarity] : 0;
      spendStars(manifest.drawCost);
      setPity(rolled.pity);
      const got = giveCard(rolled.card.id, refund);
      sfxFlip();
      ctx.goto({ name: 'reveal', cardId: rolled.card.id, isNew: got.isNew, refund });
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
        <button type="button" class="btn big" data-action="do-draw">抽一张<span>${manifest.drawCost} ★</span></button>
        <p class="sub">已收集 ${ownedCount()} / ${total}</p>
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

export function mountReveal(root: HTMLElement, ctx: AppCtx, cardId: string, isNew: boolean, refund: number): () => void {
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
      const rolled = rollCard(manifest, game.pity, Math.random);
      const prev = game.owned[rolled.card.id] ?? 0;
      const nextRefund = prev > 0 ? manifest.duplicateRefund[rolled.card.rarity] : 0;
      spendStars(manifest.drawCost);
      setPity(rolled.pity);
      const got = giveCard(rolled.card.id, nextRefund);
      ctx.goto({ name: 'reveal', cardId: rolled.card.id, isNew: got.isNew, refund: nextRefund });
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
          <div class="rarity-banner r-${card.rarity}">${'★'.repeat(meta.stars)} ${meta.zh}</div>
          <h2>${esc(card.name)}</h2>
          <p class="blurb">${esc(card.blurb)}</p>
          ${isNew ? '' : `<p class="dup">重复卡片，返还 ${refund} 星星</p>`}
        </div>
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

export function mountAlbum(root: HTMLElement, ctx: AppCtx): () => void {
  const manifest = ctx.data.cards;
  let seriesId = manifest.series[3]?.id ?? manifest.series[0].id;
  let toast = '';
  let rewardName = '';
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
  const owned = (game.owned[card.id] ?? 0) > 0;
  const meta = RARITY_META[card.rarity];
  if (!owned) {
    return `<article class="acard sil"><div class="acard-art"><img src="${asset(`content/cards/images/${card.image}`)}" alt="" /><b>?</b></div>${lockMini()}</article>`;
  }
  return `<article class="acard got r-${card.rarity}"><div class="acard-art"><img src="${asset(`content/cards/images/${card.image}`)}" alt="" /></div><div><b>${esc(card.name)}</b><small>${'★'.repeat(meta.stars)} ${meta.zh}</small></div><i class="check">✓</i></article>`;
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
