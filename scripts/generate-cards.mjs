import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

if (process.env.REGENERATE_PLACEHOLDERS !== '1') {
  console.log(
    'Card art is the committed WebP in public/content/cards/images/. Set REGENERATE_PLACEHOLDERS=1 to overwrite those with the old geometric SVG placeholders.',
  );
  process.exit(0);
}

const OUT = 'public/content/cards/images';

function stars(id, n, seed) {
  let s = seed;
  const rand = () => {
    s = (s * 16807 + 7) % 2147483647;
    return s / 2147483647;
  };
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = 24 + rand() * 352;
    const y = 20 + rand() * 470;
    const r = 2 + rand() * 4;
    const o = 0.35 + rand() * 0.55;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff" opacity="${o.toFixed(2)}"/>`;
  }
  return out;
}

function wrap(id, bg1, bg2, body, sparkle) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520">
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg1}"/>
      <stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
    <radialGradient id="gl${id}" cx="50%" cy="40%" r="55%">
      <stop offset="0" stop-color="#fff" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="400" height="520" rx="36" fill="url(#bg${id})"/>
  <rect width="400" height="520" rx="36" fill="url(#gl${id})"/>
  ${stars(id, sparkle, id.length * 97 + sparkle * 13)}
  <ellipse cx="200" cy="470" rx="110" ry="18" fill="rgba(40,24,16,.16)"/>
  ${body}
</svg>`;
}

function eyes(cx, cy, gap = 16) {
  return `
    <ellipse cx="${cx - gap}" cy="${cy}" rx="7" ry="8" fill="#2c241c"/>
    <ellipse cx="${cx + gap}" cy="${cy}" rx="7" ry="8" fill="#2c241c"/>
    <circle cx="${cx - gap + 2}" cy="${cy - 2}" r="2.4" fill="#fff"/>
    <circle cx="${cx + gap + 2}" cy="${cy - 2}" r="2.4" fill="#fff"/>
  `;
}

function smile(cx, cy, w = 16) {
  return `<path d="M${cx - w} ${cy} q ${w} ${w} ${w * 2} 0" fill="none" stroke="#c25858" stroke-width="3.5" stroke-linecap="round"/>`;
}

function blush(cx, cy, gap = 28) {
  return `
    <ellipse cx="${cx - gap}" cy="${cy}" rx="8" ry="4.5" fill="#ff9eb5" opacity=".75"/>
    <ellipse cx="${cx + gap}" cy="${cy}" rx="8" ry="4.5" fill="#ff9eb5" opacity=".75"/>
  `;
}

function hero(spec) {
  const { skin = '#ffd2ad', shirt = '#3d7dff', pants = '#2c4ea8', hair = '#5a371f', hat = 'none', prop = 'none', cape = '' } = spec;
  const cx = 200;
  let capeSvg = '';
  if (cape) {
    capeSvg = `<path d="M150 250 q -30 80 10 150 q 40 -40 40 -10 q 0 -70 20 -140 z" fill="${cape}"/>`;
  }
  let hatSvg = '';
  if (hat === 'crown') hatSvg = `<path d="M158 168 l12 22 h20 l12 -22 l12 22 h20 l12 -22 v28 h-88 z" fill="#ffd24a" stroke="#e0a000" stroke-width="3"/>`;
  if (hat === 'helmet') hatSvg = `<path d="M160 190 q 40 -70 80 0 v16 h-80 z" fill="#d5dbe6" stroke="#8aa" stroke-width="3"/>`;
  if (hat === 'hood') hatSvg = `<path d="M150 200 q 50 -90 100 0 q -10 30 -50 26 q -40 4 -50 -26 z" fill="${shirt}"/>`;
  if (hat === 'monk') hatSvg = `<ellipse cx="200" cy="176" rx="46" ry="16" fill="#f3e2b0" stroke="#d7b56a" stroke-width="3"/>`;
  if (hat === 'band') hatSvg = `<rect x="156" y="178" width="88" height="14" rx="6" fill="#e23b3b"/><circle cx="200" cy="185" r="7" fill="#ffd24a"/>`;
  if (hat === 'bow') hatSvg = `<circle cx="232" cy="170" r="10" fill="#ff7eae"/><circle cx="246" cy="164" r="8" fill="#ffb3d0"/>`;
  if (hat === 'bun') hatSvg = `<circle cx="200" cy="162" r="16" fill="${hair}"/><circle cx="176" cy="176" r="12" fill="${hair}"/>`;
  let propSvg = '';
  if (prop === 'shield') propSvg = `<g transform="translate(300 300)"><path d="M0 -36 q 34 10 34 40 v20 q 0 36 -34 52 q -34 -16 -34 -52 v-20 q 0 -30 34 -40 z" fill="#ffd24a" stroke="#e09a00" stroke-width="4"/><path d="M0 -10 l8 14 h-16 z" fill="#fff"/></g>`;
  if (prop === 'bow') propSvg = `<path d="M300 250 q 40 40 0 90" fill="none" stroke="#8a5a2a" stroke-width="6" stroke-linecap="round"/><path d="M300 250 l0 90" stroke="#f4e2b0" stroke-width="2"/>`;
  if (prop === 'staff') propSvg = `<rect x="292" y="230" width="8" height="150" rx="4" fill="#c48a48"/><circle cx="296" cy="220" r="16" fill="#ffd24a"/><circle cx="296" cy="220" r="8" fill="#fff6c8"/>`;
  if (prop === 'fan') propSvg = `<path d="M300 280 q 50 -70 70 10 q -40 10 -70 20 z" fill="#7dcea0" stroke="#1e8a5a" stroke-width="3"/>`;
  if (prop === 'sword') propSvg = `<rect x="300" y="250" width="8" height="90" rx="3" fill="#d9e4ef"/><rect x="290" y="330" width="28" height="8" rx="3" fill="#e0b15a"/>`;
  const hairSvg =
    hat === 'hood'
      ? ''
      : `<path d="M158 210 q 4 -60 42 -68 q 46 -8 52 62 q -8 -28 -46 -24 q -40 -2 -48 30 z" fill="${hair}"/>`;
  return `
    ${capeSvg}
    ${propSvg}
    <path d="M168 360 q 6 48 18 52 q 8 2 14 -36" fill="${pants}"/>
    <path d="M214 372 q 10 40 24 44 q 8 0 8 -40" fill="${pants}"/>
    <rect x="156" y="248" width="88" height="120" rx="36" fill="${shirt}"/>
    <ellipse cx="156" cy="300" rx="18" ry="28" fill="${shirt}"/>
    <ellipse cx="246" cy="300" rx="18" ry="28" fill="${shirt}"/>
    <circle cx="200" cy="214" r="52" fill="${skin}"/>
    ${hairSvg}
    ${hatSvg}
    ${eyes(200, 214, 16)}
    ${blush(200, 230, 30)}
    ${smile(200, 232, 14)}
  `;
}

function beast(spec) {
  const {
    body = '#f6c453',
    belly = '#fff1c4',
    ear = 'round',
    marks = 'none',
    horn = false,
    tail = true,
    snout = 18,
  } = spec;
  let ears = '';
  if (ear === 'round') {
    ears = `<circle cx="150" cy="200" r="28" fill="${body}"/><circle cx="250" cy="200" r="28" fill="${body}"/>
            <circle cx="150" cy="200" r="14" fill="${belly}"/><circle cx="250" cy="200" r="14" fill="${belly}"/>`;
  } else if (ear === 'tall') {
    ears = `<ellipse cx="150" cy="170" rx="18" ry="48" fill="${body}"/><ellipse cx="250" cy="170" rx="18" ry="48" fill="${body}"/>
            <ellipse cx="150" cy="176" rx="9" ry="28" fill="#ffb7c8"/><ellipse cx="250" cy="176" rx="9" ry="28" fill="#ffb7c8"/>`;
  } else if (ear === 'monkey') {
    ears = `<circle cx="132" cy="230" r="26" fill="${body}" stroke="#c48a2a" stroke-width="4"/><circle cx="268" cy="230" r="26" fill="${body}" stroke="#c48a2a" stroke-width="4"/>`;
  } else if (ear === 'pig') {
    ears = `<ellipse cx="140" cy="190" rx="26" ry="34" fill="#f2a3b5"/><ellipse cx="260" cy="190" rx="26" ry="34" fill="#f2a3b5"/>`;
  } else if (ear === 'floppy') {
    ears = `<ellipse cx="128" cy="240" rx="22" ry="40" fill="${body}" transform="rotate(-18 128 240)"/><ellipse cx="272" cy="240" rx="22" ry="40" fill="${body}" transform="rotate(18 272 240)"/>`;
  } else if (ear === 'horn') {
    ears = `<path d="M160 190 l-10 -50 28 36 z" fill="#f4e2b0"/><path d="M240 190 l10 -50 -28 36 z" fill="#f4e2b0"/>`;
  } else if (ear === 'cat') {
    ears = `<path d="M150 210 l-8 -48 40 28 z" fill="${body}"/><path d="M250 210 l8 -48 -40 28 z" fill="${body}"/>`;
  }
  let markSvg = '';
  if (marks === 'stripes') {
    markSvg = `<path d="M150 250 q 20 10 0 24" stroke="#e07a1a" stroke-width="6" fill="none"/><path d="M250 250 q -20 10 0 24" stroke="#e07a1a" stroke-width="6" fill="none"/><path d="M170 300 q 30 8 60 0" stroke="#e07a1a" stroke-width="6" fill="none"/>`;
  }
  if (marks === 'spots') {
    markSvg = `<circle cx="160" cy="280" r="10" fill="#fff" opacity=".8"/><circle cx="230" cy="300" r="12" fill="#fff" opacity=".75"/><circle cx="180" cy="330" r="8" fill="#fff" opacity=".7"/>`;
  }
  const hornSvg = horn ? `<path d="M200 150 l10 -46 10 46 z" fill="#ffe08a" stroke="#e0a020" stroke-width="3"/>` : '';
  const tailSvg = tail ? `<path d="M300 340 q 50 -20 30 40" fill="none" stroke="${body}" stroke-width="14" stroke-linecap="round"/>` : '';
  return `
    ${tailSvg}
    ${ears}
    <ellipse cx="200" cy="320" rx="100" ry="90" fill="${body}"/>
    <ellipse cx="200" cy="336" rx="62" ry="58" fill="${belly}"/>
    ${markSvg}
    ${hornSvg}
    <ellipse cx="200" cy="300" rx="${snout + 10}" ry="${snout}" fill="${belly}" stroke="${body}" stroke-width="4"/>
    <circle cx="190" cy="300" r="4" fill="#5a3a32"/><circle cx="210" cy="300" r="4" fill="#5a3a32"/>
    ${eyes(200, 250, 22)}
    ${blush(200, 274, 40)}
    ${smile(200, 268, 12)}
  `;
}

function dragon(spec) {
  const { body = '#5ec8ff', belly = '#e7f8ff', mane = '#ffd24a', fire = false } = spec;
  const fireSvg = fire
    ? `<path d="M300 250 q 40 -30 20 -10 q 30 -20 10 10 q 28 0 0 16 q -20 8 -30 0 z" fill="#ffb703"/>`
    : '';
  return `
    <path d="M70 360 q 40 -30 70 -10 q 40 20 70 -10 q 50 30 80 -20 q 40 -40 40 -10" fill="none" stroke="${body}" stroke-width="46" stroke-linecap="round"/>
    <path d="M90 366 q 40 -20 60 0 q 40 16 60 -6 q 40 20 70 -16" fill="none" stroke="${belly}" stroke-width="16" stroke-linecap="round"/>
    <circle cx="292" cy="250" r="48" fill="${body}"/>
    <path d="M250 230 q 20 -50 46 -20 q 10 -40 30 0 q -10 16 -20 10 q -16 20 -40 16 z" fill="${mane}"/>
    <path d="M270 214 l6 -28 10 24 z" fill="#ffe08a"/>
    ${eyes(292, 250, 12)}
    ${smile(292, 266, 10)}
    ${fireSvg}
    <path d="M250 300 q -20 40 -40 20" fill="none" stroke="${body}" stroke-width="10" stroke-linecap="round"/>
  `;
}

function bird(spec) {
  const { body = '#ffd24a', wing = '#ff8a3d', beak = '#ff7a3c', crest = '#ff5a7a' } = spec;
  return `
    <ellipse cx="150" cy="320" rx="70" ry="36" fill="${wing}" transform="rotate(-16 150 320)"/>
    <ellipse cx="250" cy="320" rx="70" ry="36" fill="${wing}" transform="rotate(16 250 320)"/>
    <ellipse cx="200" cy="330" rx="78" ry="70" fill="${body}"/>
    <circle cx="200" cy="250" r="48" fill="${body}"/>
    <path d="M180 214 l20 -40 20 40 z" fill="${crest}"/>
    ${eyes(200, 250, 14)}
    <path d="M214 262 l28 6 l-28 8 z" fill="${beak}"/>
    ${blush(188, 266, 0)}
  `;
}

function cloudBuddy(spec) {
  const { body = '#ffffff', accent = '#7ecbff' } = spec;
  return `
    <ellipse cx="200" cy="300" rx="120" ry="70" fill="${body}"/>
    <circle cx="140" cy="280" r="48" fill="${body}"/>
    <circle cx="210" cy="250" r="60" fill="${body}"/>
    <circle cx="270" cy="285" r="44" fill="${body}"/>
    ${eyes(200, 290, 22)}
    ${smile(200, 310, 16)}
    <ellipse cx="120" cy="360" rx="28" ry="10" fill="${accent}" opacity=".4"/>
    <ellipse cx="280" cy="370" rx="36" ry="12" fill="${accent}" opacity=".35"/>
  `;
}

function drawCard(card) {
  const sparkle = card.rarity === 'legendary' ? 28 : card.rarity === 'epic' ? 18 : card.rarity === 'rare' ? 12 : 8;
  let body = '';
  if (card.kind === 'hero') body = hero(card);
  else if (card.kind === 'beast') body = beast(card);
  else if (card.kind === 'dragon') body = dragon(card);
  else if (card.kind === 'bird') body = bird(card);
  else body = cloudBuddy(card);
  const id = card.id.replace(/[^a-z0-9]/gi, '');
  return wrap(id, card.bg[0], card.bg[1], body, sparkle);
}

const series = [
  {
    id: 'heroes',
    name: '英雄战士',
    icon: '🛡️',
    color: '#4C8DFF',
    cards: [
      { id: 'star-knight', name: '星盾骑士', rarity: 'common', emoji: '🛡️', blurb: '举着星星盾的小骑士', kind: 'hero', bg: ['#cfe6ff', '#7eb6ff'], shirt: '#3d7dff', pants: '#244a9a', hair: '#6b4423', hat: 'helmet', prop: 'shield' },
      { id: 'leaf-archer', name: '林叶弓手', rarity: 'common', emoji: '🏹', blurb: '会跟树叶打招呼的弓手', kind: 'hero', bg: ['#d9ffd0', '#7dcea0'], shirt: '#2eae6a', pants: '#1d6b45', hair: '#3d6b32', hat: 'hood', prop: 'bow', cape: '#1d6b45' },
      { id: 'spark-mage', name: '火花法师', rarity: 'rare', emoji: '✨', blurb: '法杖顶端亮着一颗小太阳', kind: 'hero', bg: ['#ffe7fb', '#c9a6ff'], shirt: '#8d6bff', pants: '#5136a8', hair: '#f2d27a', hat: 'crown', prop: 'staff' },
      { id: 'tide-guard', name: '浪花卫士', rarity: 'common', emoji: '🌊', blurb: '站在浪尖上的卫士', kind: 'hero', bg: ['#d7f6ff', '#5ec8ff'], shirt: '#1aa3d6', pants: '#0d6d94', hair: '#204056', hat: 'helmet', prop: 'sword' },
      { id: 'sun-healer', name: '阳光牧师', rarity: 'rare', emoji: '💛', blurb: '把阳光分给小朋友', kind: 'hero', bg: ['#fff4c8', '#ffd56a'], shirt: '#ffb703', pants: '#e07a00', hair: '#f6e27a', hat: 'bun', prop: 'staff', skin: '#ffd8b8' },
      { id: 'rock-guard', name: '岩甲守卫', rarity: 'epic', emoji: '🪨', blurb: '盔甲像小山一样稳', kind: 'hero', bg: ['#efe6da', '#b9a48a'], shirt: '#8d7560', pants: '#5c4636', hair: '#3a2a22', hat: 'helmet', prop: 'shield', cape: '#6b5344' },
      { id: 'moon-ninja', name: '月羽侠客', rarity: 'epic', emoji: '🌙', blurb: '月光下轻轻落地', kind: 'hero', bg: ['#e4e0ff', '#8f86e8'], shirt: '#3a356b', pants: '#241f4a', hair: '#d9def5', hat: 'hood', prop: 'sword', cape: '#2a2558' },
      { id: 'drake-heart', name: '龙心勇者', rarity: 'legendary', emoji: '🐉', blurb: '心口有一颗小小的龙鳞', kind: 'hero', bg: ['#ffe29a', '#ff8a3d'], shirt: '#e23b3b', pants: '#8a1f1f', hair: '#ffd36a', hat: 'crown', prop: 'sword', cape: '#ff5a3c' },
    ],
  },
  {
    id: 'journey',
    name: '西游记',
    icon: '☁️',
    color: '#FF9F43',
    cards: [
      { id: 'wukong', name: '齐天小圣', rarity: 'legendary', emoji: '🐵', blurb: '金箍棒还没自己高', kind: 'beast', bg: ['#ffe29a', '#ffb703'], body: '#f0b429', belly: '#ffe7a8', ear: 'monkey', horn: false, tail: true, snout: 14 },
      { id: 'bajie', name: '天蓬元帅', rarity: 'epic', emoji: '🐷', blurb: '最爱睡觉也最讲义气', kind: 'beast', bg: ['#ffd0e0', '#ff8fb1'], body: '#f7b4c4', belly: '#ffe4ec', ear: 'pig', tail: false, snout: 26 },
      { id: 'wujing', name: '流沙大将', rarity: 'rare', emoji: '📿', blurb: '脖子上挂着一串闪亮的珠子', kind: 'hero', bg: ['#ffe8c8', '#e0a060'], shirt: '#c47a3a', pants: '#8a4e22', hair: '#2a2118', hat: 'monk', skin: '#e8b48a' },
      { id: 'tangseng', name: '取经师父', rarity: 'epic', emoji: '🙏', blurb: '一路说“谢谢”的师父', kind: 'hero', bg: ['#fff6d8', '#f0d59a'], shirt: '#f4e2b0', pants: '#d7b56a', hair: '#2a2118', hat: 'monk', skin: '#ffd8b8' },
      { id: 'bailong', name: '小白龙', rarity: 'rare', emoji: '🐲', blurb: '会变成一朵小白云', kind: 'dragon', bg: ['#e7fbff', '#b9ecff'], body: '#f7fbff', belly: '#d5e9f5', mane: '#cfefff' },
      { id: 'bajiao', name: '芭蕉小仙', rarity: 'common', emoji: '🍃', blurb: '扇子一挥就起微风', kind: 'hero', bg: ['#e4ffe8', '#8ee0a8'], shirt: '#5dca86', pants: '#1f8a52', hair: '#214c32', hat: 'bow', prop: 'fan' },
      { id: 'honghai', name: '火焰小童', rarity: 'rare', emoji: '🔥', blurb: '脾气热热的小火苗', kind: 'hero', bg: ['#ffd0b8', '#ff7a4a'], shirt: '#ff5a3c', pants: '#b3261e', hair: '#ffb703', hat: 'crown', cape: '#ff8a3d' },
      { id: 'jindou', name: '筋斗云', rarity: 'common', emoji: '☁️', blurb: '一朵爱翻跟斗的云', kind: 'cloud', bg: ['#e7f4ff', '#9fd4ff'], body: '#ffffff', accent: '#7ecbff' },
    ],
  },
  {
    id: 'digibeasts',
    name: '数码神兽',
    icon: '💠',
    color: '#3DDC97',
    cards: [
      { id: 'spark-mouse', name: '闪闪鼠', rarity: 'common', emoji: '🐭', blurb: '尾巴会一闪一闪', kind: 'beast', bg: ['#ffe7f6', '#d7b0ff'], body: '#d9c4f2', belly: '#fff', ear: 'round', tail: true, snout: 12 },
      { id: 'bubble-beast', name: '泡泡兽', rarity: 'common', emoji: '🫧', blurb: '走路会冒出泡泡', kind: 'beast', bg: ['#dff6ff', '#8fd4ff'], body: '#7ecbff', belly: '#e7f7ff', ear: 'round', tail: false, snout: 16 },
      { id: 'leaf-drake', name: '叶叶龙', rarity: 'rare', emoji: '🍃', blurb: '鳞片像新叶子', kind: 'dragon', bg: ['#e5ffd8', '#7dce8a'], body: '#5dca6a', belly: '#e7ffd4', mane: '#b6f2a0' },
      { id: 'zap-bunny', name: '电电兔', rarity: 'rare', emoji: '🐰', blurb: '耳朵里藏着小闪电', kind: 'beast', bg: ['#fff4c2', '#ffe07a'], body: '#fff6d0', belly: '#fff', ear: 'tall', tail: true, snout: 10 },
      { id: 'boulder-bear', name: '岩岩熊', rarity: 'epic', emoji: '🐻', blurb: '拥抱像一块暖和的石头', kind: 'beast', bg: ['#f0e2d2', '#c4a484'], body: '#c49a6c', belly: '#f3ddc4', ear: 'round', tail: false, snout: 20 },
      { id: 'flame-fox', name: '焰尾狐', rarity: 'epic', emoji: '🦊', blurb: '尾巴是一小簇火焰', kind: 'beast', bg: ['#ffd8c2', '#ff8a4a'], body: '#ff9a3c', belly: '#fff1d6', ear: 'cat', tail: true, snout: 12 },
      { id: 'star-whale', name: '星空鲸', rarity: 'rare', emoji: '🐋', blurb: '肚皮上有星星的小鲸鱼', kind: 'dragon', bg: ['#1b2a6b', '#6d74d6'], body: '#6f7cff', belly: '#d7dcff', mane: '#fff4b0' },
      { id: 'glow-phoenix', name: '光羽凤', rarity: 'legendary', emoji: '🔆', blurb: '羽毛会发光，不是任何电视里的角色', kind: 'bird', bg: ['#fff0c8', '#ffb703'], body: '#ffd56a', wing: '#ff7a3c', crest: '#ff5a8a', beak: '#ff8a3d' },
    ],
  },
  {
    id: 'zodiac',
    name: '十二生肖',
    icon: '🐾',
    color: '#F2B705',
    cards: [
      { id: 'rat', name: '机灵鼠', rarity: 'common', emoji: '🐭', blurb: '生肖 · 鼠', kind: 'beast', bg: ['#f3f0ea', '#d9d3c7'], body: '#b7b1a8', belly: '#fff', ear: 'round', tail: true, snout: 10 },
      { id: 'ox', name: '踏实牛', rarity: 'common', emoji: '🐮', blurb: '生肖 · 牛', kind: 'beast', bg: ['#f7efe2', '#e0c39a'], body: '#c48a4a', belly: '#f6e2c4', ear: 'horn', tail: true, snout: 22 },
      { id: 'tiger', name: '山中虎', rarity: 'epic', emoji: '🐯', blurb: '生肖 · 虎', kind: 'beast', bg: ['#ffe0b8', '#ffb15a'], body: '#ff9a2e', belly: '#fff', ear: 'cat', marks: 'stripes', tail: true, snout: 14 },
      { id: 'rabbit', name: '月牙兔', rarity: 'rare', emoji: '🐰', blurb: '生肖 · 兔', kind: 'beast', bg: ['#ffe4f1', '#ffb3d4'], body: '#fff', belly: '#ffe4f1', ear: 'tall', tail: true, snout: 10 },
      { id: 'dragon', name: '祥云龙', rarity: 'legendary', emoji: '🐲', blurb: '生肖 · 龙', kind: 'dragon', bg: ['#d8fff4', '#46d6b0'], body: '#2fbf8f', belly: '#e7fff6', mane: '#ffd24a', fire: true },
      { id: 'snake', name: '灵巧蛇', rarity: 'rare', emoji: '🐍', blurb: '生肖 · 蛇', kind: 'dragon', bg: ['#e7ffe4', '#8ddeaf'], body: '#3cb371', belly: '#e9ffe4', mane: '#7dffb3' },
      { id: 'horse', name: '奔腾马', rarity: 'common', emoji: '🐴', blurb: '生肖 · 马', kind: 'beast', bg: ['#fff1d6', '#f0c27a'], body: '#c68642', belly: '#fff', ear: 'tall', tail: true, snout: 16 },
      { id: 'goat', name: '软软羊', rarity: 'common', emoji: '🐑', blurb: '生肖 · 羊', kind: 'beast', bg: ['#f4f7ff', '#d5def0'], body: '#f7f7f7', belly: '#fff', ear: 'floppy', tail: false, snout: 12, marks: 'spots' },
      { id: 'monkey', name: '蹦蹦猴', rarity: 'rare', emoji: '🐒', blurb: '生肖 · 猴', kind: 'beast', bg: ['#ffe7c2', '#f0b45a'], body: '#e0a050', belly: '#ffe7c2', ear: 'monkey', tail: true, snout: 12 },
      { id: 'rooster', name: '报晓鸡', rarity: 'common', emoji: '🐔', blurb: '生肖 · 鸡', kind: 'bird', bg: ['#fff6d0', '#ffd56a'], body: '#fff', wing: '#ff8a3d', crest: '#ff4d6d', beak: '#ffb703' },
      { id: 'dog', name: '忠诚狗', rarity: 'rare', emoji: '🐶', blurb: '生肖 · 狗', kind: 'beast', bg: ['#ffe8c8', '#f0b080'], body: '#e8b48a', belly: '#fff6ea', ear: 'floppy', tail: true, snout: 16 },
      { id: 'pig', name: '圆圆猪', rarity: 'epic', emoji: '🐷', blurb: '生肖 · 猪', kind: 'beast', bg: ['#ffd6e4', '#ff9ec2'], body: '#f7b4c8', belly: '#ffe4ee', ear: 'pig', tail: false, snout: 24 },
    ],
  },
];

// fix accidental expression leftovers by validating colors
function assertColor(value, where) {
  if (typeof value === 'string' && value.startsWith('#') && !/^#[0-9a-fA-F]{3,8}$/.test(value)) {
    throw new Error(`Bad color ${value} at ${where}`);
  }
}

const manifest = {
  drawCost: 20,
  pityEpic: 10,
  pityLegendary: 30,
  seriesReward: 40,
  duplicateRefund: { common: 3, rare: 8, epic: 20, legendary: 40 },
  weights: { common: 60, rare: 28, epic: 10, legendary: 2 },
  cardBack: 'card-back.svg',
  series: series.map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    color: s.color,
    cards: s.cards.map((c) => ({
      id: c.id,
      name: c.name,
      rarity: c.rarity,
      image: `${s.id}/${c.id}.svg`,
      emoji: c.emoji,
      blurb: c.blurb,
    })),
  })),
};

for (const s of series) {
  for (const c of s.cards) {
    for (const [k, v] of Object.entries(c)) assertColor(v, `${s.id}/${c.id}.${k}`);
    const svg = drawCard(c);
    const path = join(OUT, s.id, `${c.id}.svg`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, svg);
  }
}

writeFileSync(
  join(OUT, 'card-back.svg'),
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520">
  <defs>
    <linearGradient id="cb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6a4cff"/>
      <stop offset="1" stop-color="#241456"/>
    </linearGradient>
  </defs>
  <rect width="400" height="520" rx="36" fill="url(#cb)"/>
  <rect x="18" y="18" width="364" height="484" rx="28" fill="none" stroke="#ffd76a" stroke-width="6"/>
  <path d="M200 150 l28 62 68 8 -50 46 14 66 -60 -34 -60 34 14 -66 -50 -46 68 -8 z" fill="#ffd76a"/>
  <circle cx="200" cy="250" r="18" fill="#fff6c8"/>
</svg>`,
);

writeFileSync('public/content/cards/manifest.json', JSON.stringify(manifest, null, 2));
console.log(
  'cards',
  manifest.series.reduce((n, s) => n + s.cards.length, 0),
);
