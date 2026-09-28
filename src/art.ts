function sticker(key: string, bg1: string, bg2: string, inner: string): string {
  const id = key.replace(/[^a-z0-9]/gi, '') || 'a';
  return `<svg class="art" viewBox="0 0 200 160" aria-hidden="true">
    <defs>
      <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${bg1}"/>
        <stop offset="1" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="200" height="160" rx="28" fill="url(#bg${id})"/>
    ${inner}
  </svg>`;
}

function balloon(x: number, y: number, color: string, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="0" rx="16" ry="20" fill="${color}"/>
    <ellipse cx="-5" cy="-6" rx="5" ry="7" fill="#fff" opacity=".45"/>
    <path d="M-3 18 h6 l-3 6 z" fill="${color}"/>
    <path d="M0 24 q 6 10 -1 16" fill="none" stroke="#6b4423" stroke-width="1.4"/>
  </g>`;
}

function eyes(cx: number, cy: number, gap = 8): string {
  return `<circle cx="${cx - gap}" cy="${cy}" r="3.2" fill="#2c241c"/>
    <circle cx="${cx + gap}" cy="${cy}" r="3.2" fill="#2c241c"/>
    <circle cx="${cx - gap + 1}" cy="${cy - 1}" r="1.1" fill="#fff"/>
    <circle cx="${cx + gap + 1}" cy="${cy - 1}" r="1.1" fill="#fff"/>`;
}

function smile(cx: number, cy: number): string {
  return `<path d="M${cx - 7} ${cy} q 7 7 14 0" fill="none" stroke="#e07070" stroke-width="2" stroke-linecap="round"/>`;
}

type Hair = 'short' | 'long' | 'pigtail' | 'grey' | 'blonde' | 'bun' | 'pony';

function person(x: number, y: number, shirt: string, hair: string, kind: Hair, scale = 1): string {
  const hairSvg =
    kind === 'long'
      ? `<path d="M-16 -6 q 2 36 16 40 q 14 -4 16 -40 q -6 -28 -16 -30 q -12 0 -16 30 z" fill="${hair}"/>`
      : kind === 'pigtail'
        ? `<circle cx="-18" cy="8" r="7" fill="${hair}"/><circle cx="18" cy="8" r="7" fill="${hair}"/>
           <path d="M-14 -18 q 14 -16 28 0 q -4 8 -14 6 q -8 2 -14 -6 z" fill="${hair}"/>
           <circle cx="-18" cy="8" r="2.4" fill="#ff7eae"/><circle cx="18" cy="8" r="2.4" fill="#ff7eae"/>`
        : kind === 'grey'
          ? `<path d="M-16 -8 q 16 -22 32 0 v8 h-32 z" fill="#d9dde3"/><rect x="-10" y="-2" width="20" height="3" rx="1" fill="#8aa" opacity=".7"/>`
          : kind === 'bun'
            ? `<circle cx="0" cy="-22" r="8" fill="${hair}"/><path d="M-15 -6 q 15 -18 30 0 v6 h-30 z" fill="${hair}"/>`
            : kind === 'blonde'
              ? `<path d="M-16 -4 q 4 -26 16 -28 q 14 0 16 26 q -8 -8 -16 -6 q -10 -2 -16 8 z" fill="${hair}"/>`
              : kind === 'pony'
                ? `<path d="M-14 -8 q 16 -20 30 2 q -8 6 -16 4 q -8 0 -14 -6 z" fill="${hair}"/>
                   <ellipse cx="18" cy="2" rx="6" ry="12" fill="${hair}"/>`
                : `<path d="M-15 -4 q 6 -24 15 -26 q 12 0 16 24 q -6 -8 -16 -6 q -8 -1 -15 8 z" fill="${hair}"/>`;
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <ellipse cx="0" cy="48" rx="18" ry="6" fill="rgba(40,24,16,.12)"/>
    <path d="M-10 18 q 2 22 8 24 q 8 0 10 -24 z" fill="#3d4f86"/>
    <rect x="-16" y="8" width="32" height="28" rx="12" fill="${shirt}"/>
    <circle cx="0" cy="0" r="16" fill="#ffd2ad"/>
    ${hairSvg}
    ${eyes(0, 1, 6)}
    ${smile(0, 8)}
  </g>`;
}

export function countArt(n: number, showNumber: boolean, key: string): string {
  const colors = ['#ff5d7a', '#ffd24a', '#62c7ff', '#b48bff', '#6ad18a', '#ff9a3c', '#ff8fb8'];
  const pos = [
    [100, 78],
    [62, 86],
    [138, 86],
    [44, 62],
    [156, 62],
    [78, 48],
    [122, 46],
  ];
  let inner = '';
  for (let i = 0; i < n; i++) {
    const [x, y] = pos[i];
    inner += balloon(x, y, colors[i % colors.length], 0.85);
  }
  if (showNumber) {
    inner += `<text x="100" y="148" text-anchor="middle" font-size="28" font-family="Fredoka, sans-serif" fill="#fff" stroke="#5a3b1e" stroke-width="5" paint-order="stroke">${n}</text>`;
  }
  return sticker(key + n + (showNumber ? 'y' : 'n'), '#e7f7ff', '#b7e6ff', inner);
}

const NUM: Record<string, number> = {
  u2_w01: 1,
  u2_w02: 2,
  u2_w03: 3,
  u2_w04: 4,
  u2_w05: 5,
  u2_w06: 6,
  u2_w07: 7,
};

export function wordArt(id: string): string {
  if (NUM[id]) return countArt(NUM[id], true, id);
  switch (id) {
    case 'u1_w01':
      return sticker(id, '#fff4c8', '#ffe08a', `${person(70, 70, '#4aa8ff', '#5c3a24', 'short', 1)}${person(130, 74, '#ff8fb8', '#3a2a22', 'pigtail', 1)}<text x="100" y="28" text-anchor="middle" font-size="22">👋</text>`);
    case 'u1_w02':
      return sticker(id, '#ffe7f4', '#ffc2dd', `<circle cx="100" cy="78" r="36" fill="#ffd2ad"/>${eyes(100, 74, 12)}${smile(100, 88)}<text x="40" y="40" font-size="20">✨</text><text x="150" y="46" font-size="18">✨</text>`);
    case 'u1_w03':
      return sticker(id, '#e7ffe8', '#b6f2c4', `<ellipse cx="78" cy="90" rx="22" ry="16" fill="#ffd2ad"/><ellipse cx="122" cy="90" rx="22" ry="16" fill="#ffd2ad"/><rect x="92" y="78" width="16" height="22" rx="8" fill="#f3b48a"/>`);
    case 'u1_w04':
      return sticker(id, '#e7f4ff', '#b7dcff', `<path d="M70 110 q 20 -70 60 -20" fill="#ffd2ad" stroke="#e0a070" stroke-width="3"/><circle cx="128" cy="78" r="14" fill="#ffd2ad"/>`);
    case 'u1_w05':
      return sticker(id, '#fff0d8', '#ffd59a', `${person(50, 78, '#4aa8ff', '#5c3a24', 'short', 0.8)}${person(100, 74, '#ff8fb8', '#3a2a22', 'pigtail', 0.85)}${person(150, 78, '#7dce8a', '#f0d060', 'blonde', 0.8)}`);
    case 'u1_w06':
      return sticker(id, '#e7fff2', '#b6f0d0', `${person(78, 78, '#3d7dff', '#5c3a24', 'short')}<circle cx="132" cy="108" r="16" fill="#fff"/><path d="M132 92 a16 16 0 0 1 0 32 a16 16 0 0 1 0 -32" fill="#4aa8ff"/><path d="M116 108 h32 M132 92 v32" stroke="#fff" stroke-width="3"/>`);
    case 'u1_w07':
      return sticker(id, '#e7f1ff', '#c5dcff', person(100, 62, '#3d7dff', '#5c3a24', 'short', 1.15));
    case 'u1_w08':
      return sticker(id, '#fff6d8', '#ffe08a', `<rect x="40" y="40" width="120" height="80" rx="20" fill="#fff" stroke="#ffd24a" stroke-width="4"/><text x="100" y="90" text-anchor="middle" font-size="28" font-family="Fredoka, sans-serif" fill="#5a3b1e">I'm</text>`);
    case 'u1_w09':
      return sticker(id, '#f3e9ff', '#ddc8ff', `<circle cx="70" cy="80" r="24" fill="#ffd2ad"/>${eyes(70, 78, 7)}${smile(70, 88)}<circle cx="130" cy="80" r="24" fill="#ffd8b8"/>${eyes(130, 78, 7)}${smile(130, 88)}<text x="100" y="40" text-anchor="middle" font-size="22" fill="#8b7cff">+</text>`);
    case 'u1_w10':
      return sticker(id, '#ffe9f6', '#ffc2e0', `<rect x="48" y="28" width="104" height="108" rx="12" fill="#fff" stroke="#ff8fb8" stroke-width="6"/>${person(100, 70, '#ffb3d0', '#6b4423', 'pony', 0.7)}`);
    case 'u1_w11':
      return sticker(id, '#e9f4ff', '#c5e4ff', `<text x="100" y="100" text-anchor="middle" font-size="72" font-family="Fredoka, sans-serif" fill="#fff" stroke="#4aa8ff" stroke-width="8" paint-order="stroke">?</text>`);
    case 'u1_w12':
      return sticker(id, '#fff1e4', '#ffd0b0', `<ellipse cx="100" cy="84" rx="40" ry="28" fill="#ff8a6a"/><path d="M128 96 l22 14 l-18 2 z" fill="#ff8a6a"/><ellipse cx="100" cy="86" rx="22" ry="12" fill="#5a2a2a"/>`);
    case 'u2_w08':
      return sticker(id, '#e7f7ff', '#d0ecff', [0, 1, 2, 3, 4].map((i) => balloon(50 + i * 26, 70 + (i % 2) * 16, ['#ff5d7a', '#ffd24a', '#62c7ff', '#b48bff', '#6ad18a'][i], 0.9)).join(''));
    case 'u2_w09':
      return sticker(id, '#fff4d8', '#ffe08a', `${person(90, 70, '#ff8fb8', '#3a2a22', 'pigtail')}${balloon(140, 60, '#ff5d7a', 0.8)}`);
    case 'u2_w10':
      return sticker(id, '#e9fff4', '#c6f5de', `${person(100, 68, '#7dce8a', '#6b4423', 'long')}<text x="150" y="48" font-size="22">✋</text>`);
    case 'u2_w11':
      return sticker(id, '#fff6e4', '#ffd59a', `<text x="100" y="96" text-anchor="middle" font-size="36" font-family="Fredoka, sans-serif" fill="#fff" stroke="#e09a00" stroke-width="6" paint-order="stroke">123</text>`);
    case 'u3_w01':
      return sticker(id, '#e7f4ff', '#c5e2ff', `<rect x="55" y="36" width="90" height="70" rx="10" fill="#fff" stroke="#4aa8ff" stroke-width="4"/>${person(100, 62, '#ff8fb8', '#5c3a24', 'short', 0.55)}<text x="100" y="132" text-anchor="middle" font-size="18" font-family="Fredoka, sans-serif" fill="#3a5a88">my</text>`);
    case 'u3_w02':
      return sticker(id, '#fff0f6', '#ffd0e4', `${person(48, 78, '#8d7560', '#d9dde3', 'grey', 0.7)}${person(84, 74, '#4aa8ff', '#5c3a24', 'short', 0.75)}${person(118, 74, '#ff8fb8', '#6b4423', 'long', 0.75)}${person(152, 80, '#ffd56a', '#3a2a22', 'short', 0.65)}`);
    case 'u3_w03':
      return sticker(id, '#ffe4f1', '#ffb3d4', person(100, 58, '#ff8fb8', '#3a2a22', 'long', 1.2));
    case 'u3_w04':
      return sticker(id, '#e7f1ff', '#b7d6ff', person(100, 58, '#3d7dff', '#3a2a22', 'short', 1.2));
    case 'u3_w05':
      return sticker(id, '#f4f1ea', '#e0d3c0', person(100, 58, '#f4e2b0', '#d9dde3', 'grey', 1.2));
    case 'u3_w06':
      return sticker(id, '#fff0e8', '#ffd2c2', person(100, 58, '#ffb08a', '#c9ced6', 'bun', 1.2));
    case 'u3_w07':
      return sticker(id, '#fff4d8', '#ffe08a', person(100, 58, '#ffd56a', '#3a2a22', 'pigtail', 1.2));
    case 'u3_w08':
      return sticker(id, '#e9fff6', '#c8f6e4', `${person(70, 68, '#ffd56a', '#3a2a22', 'pigtail', 0.9)}${person(130, 68, '#7ecbff', '#5c3a24', 'short', 0.9)}<text x="100" y="36" text-anchor="middle" font-size="20" fill="#1f9a48" font-family="Fredoka, sans-serif">&amp;</text>`);
    case 'u3_w09':
      return sticker(id, '#e7ffe8', '#c6f2c8', person(100, 58, '#6ad18a', '#5c3a24', 'short', 1.2));
    case 'u3_w10':
      return sticker(id, '#fff6e8', '#ffd7a8', `${person(78, 72, '#ff8fb8', '#6b4423', 'pony')}<path d="M120 90 q 16 -40 36 -8" fill="#ffd2ad" stroke="#e0a070" stroke-width="2"/>`);
    case 'u3_w11':
      return sticker(id, '#f3f6ff', '#d5def8', `<text x="100" y="96" text-anchor="middle" font-size="42" font-family="Fredoka, sans-serif" fill="#fff" stroke="#8b7cff" stroke-width="6" paint-order="stroke">is</text>`);
    case 'u3_w12':
      return sticker(id, '#ffe4ee', '#ffb3cc', `<path d="M100 118 l-32 -30 a20 20 0 0 1 32 -22 a20 20 0 0 1 32 22 z" fill="#ff5d7a"/>`);
    case 'u3_w13':
      return sticker(id, '#e8fff8', '#c6f5e6', person(100, 58, '#7ecbff', '#6b4423', 'short', 1.2));
    default:
      return sticker(id, '#fff6d0', '#ffe08a', `<text x="100" y="96" text-anchor="middle" font-size="48">⭐</text>`);
  }
}

const FACES: Record<string, { shirt: string; hair: string; kind: Hair; bg: string; extra?: string }> = {
  taotao: { shirt: '#3d7dff', hair: '#5c3a24', kind: 'short', bg: '#fff6df' },
  duoduo: { shirt: '#ff8fb8', hair: '#3a2a22', kind: 'pigtail', bg: '#e9ffe8' },
  toby: {
    shirt: '#4aa8ff',
    hair: '#f0d060',
    kind: 'blonde',
    bg: '#e7f4ff',
    extra: `<rect x="70" y="128" width="20" height="12" rx="3" fill="#e23b3b"/><circle cx="74" cy="142" r="3" fill="#333"/><circle cx="86" cy="142" r="3" fill="#333"/>`,
  },
  emma: { shirt: '#c9a6ff', hair: '#6b4423', kind: 'pony', bg: '#f6e9ff' },
  girl: { shirt: '#ffd56a', hair: '#3a2a22', kind: 'long', bg: '#fff4d8' },
  boy: { shirt: '#6ad18a', hair: '#3a2a22', kind: 'short', bg: '#e9fff2' },
  littlegirl: { shirt: '#b48bff', hair: '#5c3a24', kind: 'pigtail', bg: '#f3e9ff', extra: balloon(126, 70, '#ff5d7a', 0.55) },
};

export function portrait(face: string): string {
  const p = FACES[face] ?? FACES.taotao;
  return `<svg class="portrait-svg" viewBox="0 0 160 180" aria-hidden="true">
    <rect width="160" height="180" rx="24" fill="${p.bg}"/>
    ${person(80, 70, p.shirt, p.hair, p.kind, 1.35)}
    ${p.extra ?? ''}
  </svg>`;
}

export function mascotSvg(): string {
  return `<svg class="mascot-svg" viewBox="0 0 160 210" aria-hidden="true">
    <ellipse cx="80" cy="198" rx="36" ry="8" fill="rgba(40,24,16,.15)"/>
    <path d="M48 96 q-20 30 4 70 q 18 -16 22 -4 q 4 -36 10 -66 z" fill="#e23b3b"/>
    <path d="M58 150 q 8 28 16 30 q 10 0 12 -28" fill="#2450b8"/>
    <path d="M96 154 q 10 26 20 24 q 6 -2 4 -26" fill="#2450b8"/>
    <rect x="52" y="108" width="58" height="52" rx="18" fill="#f0b429" stroke="#d89a12" stroke-width="3"/>
    <path d="M54 118 h54" stroke="#e23b3b" stroke-width="8"/>
    <circle cx="46" cy="128" r="12" fill="#f0b429"/>
    <circle cx="118" cy="100" r="12" fill="#ffd2ad"/>
    <circle cx="80" cy="78" r="36" fill="#f6c453"/>
    <circle cx="40" cy="78" r="14" fill="#f0b429" stroke="#d89a12" stroke-width="3"/>
    <circle cx="120" cy="78" r="14" fill="#f0b429" stroke="#d89a12" stroke-width="3"/>
    <path d="M52 70 q 28 -40 56 0 v10 h-56 z" fill="#f6c453"/>
    <rect x="50" y="62" width="60" height="12" rx="6" fill="#e23b3b"/>
    <circle cx="80" cy="68" r="6" fill="#ffd24a" stroke="#e09a00" stroke-width="2"/>
    ${eyes(80, 80, 12)}
    <ellipse cx="80" cy="96" rx="8" ry="5" fill="#c47a3a"/>
    ${smile(80, 100)}
    <ellipse cx="58" cy="92" rx="6" ry="3" fill="#ff9eb5" opacity=".8"/>
    <ellipse cx="102" cy="92" rx="6" ry="3" fill="#ff9eb5" opacity=".8"/>
  </svg>`;
}

export function dragonSvg(): string {
  return `<svg class="dragon-svg" viewBox="0 0 150 90" aria-hidden="true">
    <path d="M16 58 q 24 -28 40 -8 q 18 16 34 -6 q 20 18 30 -8" fill="none" stroke="#b48bff" stroke-width="16" stroke-linecap="round"/>
    <path d="M20 60 q 24 -18 36 0 q 16 12 30 -4" fill="none" stroke="#efe4ff" stroke-width="6" stroke-linecap="round"/>
    <circle cx="112" cy="36" r="18" fill="#c9b6ff"/>
    <path d="M98 28 q 10 -22 20 -6 q 8 -16 14 0 q -8 8 -16 6 q -8 8 -18 0 z" fill="#ffd24a"/>
    ${eyes(112, 36, 5)}
    <path d="M108 44 q 6 5 12 0" fill="none" stroke="#e07070" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M128 34 q 16 -8 10 4 q 10 -4 4 6 q -8 2 -14 -2 z" fill="#ffb703"/>
  </svg>`;
}
