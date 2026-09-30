import { asset, esc } from './util';

/** Word files that still have a picture. Abstract words are text cards and are not listed. */
export const WORD_ART_IDS = [
  'u1_w01',
  'u1_w03',
  'u1_w05',
  'u1_w06',
  'u1_w10',
  'u1_w12',
  'u2_w01',
  'u2_w02',
  'u2_w03',
  'u2_w04',
  'u2_w05',
  'u2_w06',
  'u2_w07',
  'u2_w08',
  'u2_w09',
  'u2_w11',
  'u3_w02',
  'u3_w03',
  'u3_w04',
  'u3_w05',
  'u3_w06',
  'u3_w07',
  'u3_w08',
  'u3_w09',
  'u3_w12',
  'u4_w03',
  'u4_w04',
  'u4_w05',
  'u4_w06',
  'u4_w07',
  'u4_w08',
  'u4_w12',
  'u4_w17',
  'u5_w01',
  'u5_w02',
  'u5_w03',
  'u5_w04',
  'u6_w01',
  'u6_w02',
  'u6_w03',
  'u6_w04',
  'u6_w05',
  'u6_w06',
  'u6_w11',
] as const;

export const FACE_ART_IDS = ['taotao', 'duoduo', 'toby', 'emma', 'girl', 'boy', 'littlegirl'] as const;

const BALLOON_COLORS = ['#ff5d7a', '#ff9a3c', '#ffd24a', '#3dce6e', '#3aa0ff', '#8b6cff', '#ff7eb3'];

function balloon(x: number, y: number, color: string, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="0" rx="16" ry="20" fill="${color}"/>
    <ellipse cx="-5" cy="-6" rx="5" ry="7" fill="#fff" opacity=".55"/>
    <path d="M-3 18 h6 l-3 6 z" fill="${color}"/>
    <path d="M0 24 q 5 8 -1 12" fill="none" stroke="#6b4423" stroke-width="1.6"/>
  </g>`;
}

function slotsFor(n: number): { x: number; y: number; s: number }[] {
  const row = (xs: number[], y: number, s: number) => xs.map((x) => ({ x, y, s }));
  if (n === 1) return row([180], 70, 1.15);
  if (n === 2) return row([120, 240], 70, 1.05);
  if (n === 3) return row([70, 180, 290], 70, 0.95);
  if (n === 4) return row([55, 135, 215, 305], 72, 0.85);
  if (n === 5) return row([40, 110, 180, 250, 320], 74, 0.72);
  if (n === 6) return [...row([70, 180, 290], 48, 0.7), ...row([70, 180, 290], 118, 0.7)];
  return [...row([48, 126, 204, 282], 46, 0.62), ...row([86, 180, 274], 118, 0.62)];
}

function balloonSvg(n: number): string {
  const bodies = slotsFor(n)
    .map((p, i) => balloon(p.x, p.y, BALLOON_COLORS[i % BALLOON_COLORS.length], p.s))
    .join('');
  return `<svg class="count-svg" viewBox="0 0 360 168" aria-hidden="true">${bodies}</svg>`;
}

export function countArt(n: number, showNumber: boolean, key: string): string {
  const numeral = showNumber ? `<b class="count-num">${n}</b>` : '';
  return `<div class="art count-art" data-k="${key}">${numeral}${balloonSvg(n)}</div>`;
}

const wordImages = new Map<string, string>();
const wordLabels = new Map<string, { en: string; zh: string }>();

/** Picture paths come from each unit JSON `image` field (relative to public/content/). */
export function registerWordImages(words: { id: string; image?: string; en?: string; zhShort?: string }[]): void {
  wordImages.clear();
  wordLabels.clear();
  for (const word of words) {
    if (word.image) wordImages.set(word.id, word.image);
    if (word.en && word.zhShort) wordLabels.set(word.id, { en: word.en, zh: word.zhShort });
  }
}

function textCard(id: string, showZh: boolean): string {
  const label = wordLabels.get(id);
  if (!label) return `<div class="art text-card"><b>?</b></div>`;
  const zh = showZh ? `<span>${esc(label.zh)}</span>` : '';
  return `<div class="art text-card"><b>${esc(label.en)}</b>${zh}</div>`;
}

/** `prompt` hides the Chinese gloss so a meaning question is not spoiled. */
export function wordArt(id: string, mode: 'card' | 'prompt' = 'card'): string {
  const rel = wordImages.get(id);
  if (rel) return `<img class="art word-art" src="${asset(`content/${rel}`)}" alt="" />`;
  return textCard(id, mode === 'card');
}

export function portrait(face: string): string {
  const id = (FACE_ART_IDS as readonly string[]).includes(face) ? face : 'taotao';
  return `<img class="portrait-svg face-art" src="${asset(`content/words/face-${id}.webp`)}" alt="" />`;
}

export function mascotSvg(): string {
  return `<img class="mascot-svg" src="${asset('content/cards/images/mascot.webp')}" alt="" />`;
}

export function dragonSvg(): string {
  return `<img class="dragon-svg" src="${asset('content/cards/images/map-dragon.webp')}" alt="" />`;
}
