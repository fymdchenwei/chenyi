import { ownedCount, game } from './state';
import { esc } from './util';

export function starIcon(): string {
  return `<svg class="star-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2l2.7 6.3 6.8.6-5.1 4.4 1.6 6.6L12 16.8 6 20.1l1.6-6.6L2.5 9.1l6.8-.6z" fill="#ffd24a" stroke="#e09a00" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
}

export function starPill(): string {
  return `<div class="star-pill">${starIcon()}<b>${game.stars}</b></div>`;
}

export function lockIcon(): string {
  return `<svg class="lock-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5" fill="#e6ebf2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#9aa6b8" stroke-width="2.2" stroke-linecap="round"/></svg>`;
}

function iconMap(): string {
  return `<svg viewBox="0 0 48 48" class="nav-ico"><rect x="6" y="10" width="36" height="28" rx="8" fill="#8fd18a"/><path d="M10 30c6-8 10-4 16-10 4 6 8 4 12 2" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="30" cy="18" r="4" fill="#ff5d7a"/></svg>`;
}
function iconDraw(): string {
  return `<svg viewBox="0 0 48 48" class="nav-ico"><rect x="8" y="12" width="22" height="28" rx="6" fill="#ffe08a" transform="rotate(-8 19 26)"/><rect x="16" y="10" width="22" height="28" rx="6" fill="#c9b6ff"/><path d="M27 18l1.6 3.8 4 .4-3 2.6.9 3.8L27 26.6 23.5 28.6l.9-3.8-3-2.6 4-.4z" fill="#ffd24a"/></svg>`;
}
function iconAlbum(): string {
  return `<svg viewBox="0 0 48 48" class="nav-ico"><rect x="8" y="12" width="32" height="26" rx="6" fill="#7ecbff"/><circle cx="18" cy="22" r="3" fill="#fff"/><path d="M12 32l8-8 6 5 4-3 6 6v2a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="#3d9a62"/></svg>`;
}
function iconParent(): string {
  return `<svg viewBox="0 0 48 48" class="nav-ico"><circle cx="17" cy="18" r="6" fill="#ffd2ad"/><circle cx="31" cy="18" r="6" fill="#ffd2ad"/><path d="M8 36c1-7 6-10 9-10s8 3 9 10" fill="#7ecbff"/><path d="M22 36c1-7 6-10 9-10s8 3 9 10" fill="#ff8fb8"/><path d="M24 16l1.2 2.4 2.6.2-2 1.7.6 2.5L24 21.4l-2.4 1.4.6-2.5-2-1.7 2.6-.2z" fill="#ff5d7a"/></svg>`;
}

export function nav(active: string): string {
  const items = [
    ['map', '地图', iconMap()],
    ['draw', '抽卡', iconDraw()],
    ['album', '相册', iconAlbum()],
    ['parent', '家长', iconParent()],
  ];
  const dot = ownedCount() > game.albumSeen;
  return `<nav class="nav">${items
    .map(([id, label, ico]) => {
      const badge = id === 'album' && dot ? '<i class="dot"></i>' : '';
      return `<button type="button" class="nav-btn${active === id ? ' active' : ''}" data-action="nav" data-to="${id}">${ico}<span>${label}</span>${badge}</button>`;
    })
    .join('')}</nav>`;
}

export function speakerBtn(): string {
  return `<button type="button" class="speaker" data-action="speak" aria-label="听一听">
    <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#fff"/><path d="M14 20h6l8-6v20l-8-6h-6z" fill="#7a5cff"/><path d="M32 18a10 10 0 0 1 0 12" fill="none" stroke="#7a5cff" stroke-width="3" stroke-linecap="round"/></svg>
  </button>`;
}

export function turtleBtn(): string {
  return `<button type="button" class="turtle" data-action="turtle" aria-label="慢一点">慢</button>`;
}

export function backBtn(): string {
  return `<button type="button" class="back-btn" data-action="back" aria-label="返回"><span class="back-ico" aria-hidden="true">‹</span>返回</button>`;
}

export function toastHtml(message: string): string {
  return `<div class="toast${message ? ' show' : ''}">${esc(message)}</div>`;
}

export function actionFrom(event: Event): HTMLElement | null {
  const raw = event.target;
  const target = raw instanceof Element ? raw : raw instanceof Node ? raw.parentElement : null;
  if (!target) return null;
  const el = target.closest('[data-action]');
  return el instanceof HTMLElement ? el : null;
}

/** Identity of the control a press already handled, so the follow-up click can be told apart. */
export function pressKey(el: HTMLElement): string {
  const d = el.dataset;
  return [d.action, d.to, d.id, d.unit, d.level].map((part) => part ?? '').join('|');
}

/**
 * Pointerdown already ran the action. The click that belongs to that same press
 * must not run it again. A click on a different control — for example 返回 right
 * after 下一张 replaced the card — still has to run.
 */
export function shouldIgnoreFollowUpClick(armedKey: string | null, clickKey: string | null, now: number, until: number): boolean {
  if (armedKey === null || now >= until) return false;
  return clickKey === null || clickKey === armedKey;
}

/**
 * Letter tiles are tapped faster than Safari emits a click. A new touchstart
 * cancels a click that has not been dispatched yet, so the letter is dropped.
 * Commit on pointerdown. Swallow only the click that belongs to that same press.
 */
export function bindPress(root: HTMLElement, handle: (el: HTMLElement) => void): () => void {
  let armed: { key: string; until: number } | null = null;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const el = actionFrom(event);
    if (!el || el.hasAttribute('disabled')) return;
    if (event.cancelable) event.preventDefault();
    armed = { key: pressKey(el), until: performance.now() + 500 };
    handle(el);
  };

  const onClick = (event: MouseEvent) => {
    const el = actionFrom(event);
    const key = el ? pressKey(el) : null;
    const now = performance.now();
    if (armed && shouldIgnoreFollowUpClick(armed.key, key, now, armed.until)) {
      armed = null;
      event.preventDefault();
      return;
    }
    armed = null;
    if (!el || el.hasAttribute('disabled')) return;
    handle(el);
  };

  root.addEventListener('pointerdown', onPointerDown, { passive: false });
  root.addEventListener('click', onClick);
  return () => {
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('click', onClick);
  };
}
