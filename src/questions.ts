import type { NormUnit, Word } from './types';
import { escapeReg, rng, shuffle } from './util';

export type Kind = 'learn' | 'listen' | 'scene' | 'who' | 'meaning' | 'fill-order' | 'dictation' | 'count' | 'boss';

export interface LevelPlan {
  title: string;
  kind: Kind;
  boss?: boolean;
}

const PLANS: Record<number, LevelPlan[]> = {
  1: [
    { title: '认识新词', kind: 'learn' },
    { title: '听音选意', kind: 'scene' },
    { title: '谁说的', kind: 'who' },
    { title: '中英互译', kind: 'meaning' },
    { title: '句子填空', kind: 'fill-order' },
    { title: '听写挑战', kind: 'dictation' },
    { title: 'Boss 挑战', kind: 'boss', boss: true },
  ],
  2: [
    { title: '认识数字', kind: 'learn' },
    { title: '数一数', kind: 'count' },
    { title: '听音选图', kind: 'listen' },
    { title: '中英互译', kind: 'meaning' },
    { title: '儿歌故事', kind: 'fill-order' },
    { title: '听写挑战', kind: 'dictation' },
    { title: 'Boss 挑战', kind: 'boss', boss: true },
  ],
  3: [
    { title: '认识家人', kind: 'learn' },
    { title: '听音选图', kind: 'listen' },
    { title: '谁说的', kind: 'who' },
    { title: '中英互译', kind: 'meaning' },
    { title: '句子填空', kind: 'fill-order' },
    { title: '听写挑战', kind: 'dictation' },
    { title: 'Boss 挑战', kind: 'boss', boss: true },
  ],
};

export function levelPlan(unit: number): LevelPlan[] {
  return (
    PLANS[unit] ??
    Array.from({ length: 7 }, (_, i) => ({
      title: i === 6 ? 'Boss' : `第 ${i + 1} 关`,
      kind: 'learn' as Kind,
      boss: i === 6,
    }))
  );
}

export const FACE_NAME: Record<string, string> = {
  taotao: '淘淘',
  duoduo: '多多',
  toby: '托比',
  emma: '埃玛',
  littlegirl: '小女孩',
  girl: '女孩',
  boy: '男孩',
};

export type Question =
  | { type: 'dictation'; wordId: string; speak: string; answer: string }
  | { type: 'meaning-en-zh'; wordId: string; en: string; speak: string; options: { label: string }[]; answer: number }
  | { type: 'meaning-zh-en'; wordId: string; zh: string; options: { label: string }[]; answer: number }
  | { type: 'listen-picture'; wordId: string; speak: string; options: { wordId: string }[]; answer: number }
  | { type: 'pic-zh'; wordId: string; speak: string; options: { wordId: string; zh: string }[]; answer: number }
  | { type: 'who'; speak: string; en: string; zh: string; options: { face: string; name: string }[]; answer: number }
  | { type: 'order'; lines: { en: string; zh: string }[]; answer: number[] }
  | { type: 'fill'; before: string; after: string; zh: string; options: string[]; answer: number; wordId: string }
  | { type: 'count-see'; n: number; wordId: string; options: { label: string; wordId: string }[]; answer: number }
  | { type: 'count-hear'; n: number; wordId: string; speak: string; options: { n: number }[]; answer: number };

const NUMBER_EN = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];

export function makeQuestions(unit: NormUnit, kind: Kind, seed: number): Question[] {
  const rand = rng(seed);
  if (kind === 'learn') return [];
  if (kind === 'listen') return take(listenPool(unit, rand), 5, rand);
  if (kind === 'scene') return take(scenePool(unit, rand), 5, rand);
  if (kind === 'who') {
    const who = whoPool(unit, rand);
    if (who.length >= 3) return take(who, 4, rand);
    return take([...who, ...listenPool(unit, rand)], 4, rand);
  }
  if (kind === 'meaning') return mixMeanings(unit, rand, 3, 3);
  if (kind === 'dictation') return take(dictationPool(unit, rand), 4, rand);
  if (kind === 'count') return take(countPool(unit, rand), 5, rand);
  if (kind === 'boss') {
    const dict = take(dictationPool(unit, rand), 3, rand);
    const mean = mixMeanings(unit, rand, 2, 1);
    return shuffle([...dict, ...mean], rand);
  }
  const fills = take(fillPool(unit, rand), 3, rand);
  const orders = take(orderPool(unit, rand), 2, rand);
  let out: Question[] = shuffle([...fills, ...orders], rand);
  if (out.length < 5) out = take([...out, ...fillPool(unit, rand), ...meaningList(unit, rand), ...listenPool(unit, rand)], 5, rand);
  return out.slice(0, 5);
}

function take(pool: Question[], n: number, rand: () => number): Question[] {
  if (pool.length === 0) return [];
  const out: Question[] = [];
  let guard = 0;
  while (out.length < n && guard < 40) {
    guard += 1;
    for (const item of shuffle(pool, rand)) {
      if (out.length >= n) break;
      out.push(item);
    }
  }
  return out.slice(0, n);
}

function canDistract(a: Word, b: Word): boolean {
  return a.id !== b.id && a.zhShort !== b.zhShort && a.group !== b.group;
}

function distractors(words: Word[], answer: Word, n: number, rand: () => number): Word[] {
  let pool = words.filter((w) => canDistract(answer, w));
  if (pool.length < n) pool = words.filter((w) => w.id !== answer.id && w.zhShort !== answer.zhShort);
  return shuffle(pool, rand).slice(0, n);
}

function dictationPool(unit: NormUnit, rand: () => number): Question[] {
  return shuffle(
    unit.words.filter((w) => w.dictatable),
    rand,
  ).map((w) => ({ type: 'dictation' as const, wordId: w.id, speak: w.en, answer: w.spell }));
}

function uniqueOthers(words: Word[], answer: Word, n: number, rand: () => number, key: (w: Word) => string): Word[] {
  const pool = shuffle(words.filter((w) => canDistract(answer, w)), rand);
  const chosen: Word[] = [];
  const seen = new Set<string>([key(answer)]);
  for (const w of pool) {
    const k = key(w);
    if (seen.has(k)) continue;
    seen.add(k);
    chosen.push(w);
    if (chosen.length >= n) break;
  }
  return chosen;
}

function meaningList(unit: NormUnit, rand: () => number): Question[] {
  const out: Question[] = [];
  for (const w of unit.words) {
    const opts = uniqueOthers(unit.words, w, 3, rand, (x) => `${x.zhShort}|${x.en}`);
    if (opts.length < 3) continue;
    const zhLabels = shuffle([w, ...opts], rand).map((x) => ({ label: x.zhShort }));
    out.push({
      type: 'meaning-en-zh',
      wordId: w.id,
      en: w.en,
      speak: w.en,
      options: zhLabels,
      answer: zhLabels.findIndex((o) => o.label === w.zhShort),
    });
    const enLabels = shuffle([w, ...opts], rand).map((x) => ({ label: x.en }));
    out.push({
      type: 'meaning-zh-en',
      wordId: w.id,
      zh: w.zhShort,
      options: enLabels,
      answer: enLabels.findIndex((o) => o.label === w.en),
    });
  }
  return out;
}

function mixMeanings(unit: NormUnit, rand: () => number, en: number, zh: number): Question[] {
  const all = meaningList(unit, rand);
  const a = take(all.filter((q) => q.type === 'meaning-en-zh'), en, rand);
  const b = take(all.filter((q) => q.type === 'meaning-zh-en'), zh, rand);
  return shuffle([...a, ...b], rand);
}

/** Abstract words use a word + Chinese card and never appear as picture choices. */
export const TEXT_ONLY = new Set([
  'u1_w02',
  'u1_w04',
  'u1_w07',
  'u1_w08',
  'u1_w09',
  'u1_w11',
  'u2_w10',
  'u3_w01',
  'u3_w10',
  'u3_w11',
  'u3_w13',
]);

/**
 * Words a child can tell apart from the picture alone.
 * Balloon stays off listen-only choices because the number scenes are also balloons.
 */
export const PICTORIAL = new Set([
  'u2_w01',
  'u2_w02',
  'u2_w03',
  'u2_w04',
  'u2_w05',
  'u2_w06',
  'u2_w07',
  'u3_w02',
  'u3_w03',
  'u3_w04',
  'u3_w05',
  'u3_w06',
  'u3_w07',
  'u3_w09',
  'u3_w12',
]);

function scenePool(unit: NormUnit, rand: () => number): Question[] {
  const source = unit.words.filter((w) => Boolean(w.image) && !TEXT_ONLY.has(w.id));
  const out: Question[] = [];
  for (const w of source) {
    const opts = uniqueOthers(source, w, 3, rand, (x) => x.zhShort);
    if (opts.length < 3) continue;
    const options = shuffle([w, ...opts], rand).map((x) => ({ wordId: x.id, zh: x.zhShort }));
    out.push({
      type: 'pic-zh',
      wordId: w.id,
      speak: w.en,
      options,
      answer: options.findIndex((o) => o.wordId === w.id),
    });
  }
  return shuffle(out, rand);
}

function listenPool(unit: NormUnit, rand: () => number): Question[] {
  const source = unit.words.filter((w) => PICTORIAL.has(w.id));
  const out: Question[] = [];
  for (const w of source) {
    const opts = uniqueOthers(source, w, 3, rand, (x) => x.id);
    if (opts.length < 3) continue;
    const options = shuffle([w, ...opts], rand).map((x) => ({ wordId: x.id }));
    out.push({
      type: 'listen-picture',
      wordId: w.id,
      speak: w.en,
      options,
      answer: options.findIndex((o) => o.wordId === w.id),
    });
  }
  return shuffle(out, rand);
}

function speakerId(speaker: string): string | null {
  const s = speaker.toLowerCase();
  if (s.includes('&') || s.includes(',') || s.includes('narrator')) return null;
  if (s.includes('taotao')) return 'taotao';
  if (s.includes('duoduo')) return 'duoduo';
  if (s.includes('toby')) return 'toby';
  if (s.includes('emma')) return 'emma';
  if (s.includes('little girl')) return 'littlegirl';
  if (s.includes('girl')) return 'girl';
  if (s.includes('boy')) return 'boy';
  return null;
}

function normText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function whoPool(unit: NormUnit, rand: () => number): Question[] {
  const bad = new Set(unit.sentences.filter((s) => s.uncertain).map((s) => normText(s.en)));
  const lines: { face: string; en: string; zh: string }[] = [];
  for (const d of unit.dialogues) {
    if (d.uncertain) continue;
    for (const line of d.lines) {
      if (line.uncertain) continue;
      if (bad.has(normText(line.en))) continue;
      const face = speakerId(line.speaker);
      if (!face || !FACE_NAME[face]) continue;
      lines.push({ face, en: line.en, zh: line.zh });
    }
  }
  const grouped = new Map<string, { face: string; en: string; zh: string }[]>();
  for (const line of lines) {
    const key = normText(line.en);
    const arr = grouped.get(key) ?? [];
    arr.push(line);
    grouped.set(key, arr);
  }
  const unique = [...grouped.values()].filter((arr) => new Set(arr.map((a) => a.face)).size === 1).map((arr) => arr[0]);
  const cast = [...new Set(lines.map((line) => line.face))];
  const mains = ['taotao', 'duoduo', 'toby', 'emma'];
  return shuffle(unique, rand).map((line) => {
    const ranked = [...new Set([...cast, ...mains, ...Object.keys(FACE_NAME)])].filter((face) => face !== line.face);
    const others = ranked.slice(0, 3);
    const options = shuffle([line.face, ...others], rand).map((face) => ({ face, name: FACE_NAME[face] }));
    return {
      type: 'who' as const,
      speak: line.en,
      en: line.en,
      zh: line.zh,
      options,
      answer: options.findIndex((o) => o.face === line.face),
    };
  });
}

function orderPool(unit: NormUnit, rand: () => number): Question[] {
  const bad = new Set(unit.sentences.filter((s) => s.uncertain).map((s) => normText(s.en)));
  const out: Question[] = [];
  for (const d of unit.dialogues) {
    const lines = d.lines.filter((line) => !line.uncertain && !bad.has(normText(line.en)) && line.en.trim().length > 0);
    if (lines.length < 3) continue;
    for (let i = 0; i + 3 <= lines.length; i++) {
      const window = lines.slice(i, i + 3).map((line) => ({ en: line.en, zh: line.zh }));
      const order = window.map((_, idx) => idx);
      const shown = shuffle(order, rand);
      const linesShown = shown.map((idx) => window[idx]);
      const answer = order.map((original) => shown.indexOf(original));
      out.push({ type: 'order', lines: linesShown, answer });
    }
  }
  return shuffle(out, rand);
}

function fillPool(unit: NormUnit, rand: () => number): Question[] {
  const sources = [
    ...unit.songLines,
    ...unit.sentences.filter((s) => !s.uncertain && !s.en.includes('/') && s.en.length <= 48),
  ];
  const out: Question[] = [];
  const seen = new Set<string>();
  for (const src of sources) {
    const hits: { start: number; end: number; word: Word; sample: string }[] = [];
    for (const w of unit.words) {
      if (w.en.length < 3) continue;
      const re = new RegExp(`(^|[^A-Za-z'])(${escapeReg(w.en)})([^A-Za-z']|$)`, 'i');
      const m = re.exec(src.en);
      if (!m) continue;
      const start = m.index + m[1].length;
      const end = start + m[2].length;
      hits.push({ start, end, word: w, sample: m[2] });
    }
    if (!hits.length) continue;
    const hit = hits[Math.floor(rand() * hits.length)];
    const cased = (word: string) => {
      if (hit.sample[0] && hit.sample[0] === hit.sample[0].toUpperCase() && hit.sample[0] !== hit.sample[0].toLowerCase()) {
        return word.slice(0, 1).toUpperCase() + word.slice(1);
      }
      return word;
    };
    const answerLabel = cased(hit.word.en);
    const key = `${src.en}|${hit.word.id}|${hit.start}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const others = distractors(unit.words, hit.word, 3, rand).filter((w) => w.en.length >= 2);
    if (others.length < 3) continue;
    const options = shuffle([answerLabel, ...others.map((w) => cased(w.en))], rand);
    if (new Set(options.map((o) => o.toLowerCase())).size < options.length) continue;
    out.push({
      type: 'fill',
      before: src.en.slice(0, hit.start),
      after: src.en.slice(hit.end),
      zh: src.zh,
      options,
      answer: options.findIndex((o) => o.toLowerCase() === answerLabel.toLowerCase()),
      wordId: hit.word.id,
    });
  }
  return shuffle(out, rand);
}

function countPool(unit: NormUnit, rand: () => number): Question[] {
  const nums = NUMBER_EN.map((en, i) => ({ n: i + 1, word: unit.words.find((w) => w.en === en) })).filter(
    (x): x is { n: number; word: Word } => Boolean(x.word),
  );
  if (nums.length < 4) return [];
  const out: Question[] = [];
  for (const item of nums) {
    const options = shuffle(nums, rand).slice(0, 4);
    if (!options.some((o) => o.n === item.n)) options[0] = item;
    const see = shuffle(options, rand);
    out.push({
      type: 'count-see',
      n: item.n,
      wordId: item.word.id,
      options: see.map((o) => ({ label: o.word.en, wordId: o.word.id })),
      answer: see.findIndex((o) => o.n === item.n),
    });
    const hearOpts = shuffle(nums.filter((n) => n.n !== item.n), rand).slice(0, 3);
    const hear = shuffle([item, ...hearOpts], rand);
    out.push({
      type: 'count-hear',
      n: item.n,
      wordId: item.word.id,
      speak: item.word.en,
      options: hear.map((o) => ({ n: o.n })),
      answer: hear.findIndex((o) => o.n === item.n),
    });
  }
  return shuffle(out, rand);
}

export function starsFor(wrongs: number, hints: number): number {
  const score = wrongs + hints;
  if (score <= 0) return 3;
  if (score === 1) return 2;
  return 1;
}

/** Third map node of each unit (谁说的 / 听音选图). Other levels keep 提示. */
export function showHintButton(levelIndex: number): boolean {
  return levelIndex !== 2;
}

/** Short kid-facing line after a miss. Does not reveal the answer or change scoring. */
export function wrongHint(q: Question): string {
  switch (q.type) {
    case 'dictation':
      return `再听一次，开头是 ${q.answer[0] ?? ''}`;
    case 'order':
      return '再想一想顺序';
    case 'listen-picture':
    case 'pic-zh':
    case 'who':
    case 'count-hear':
      return '再听一听，再试一次';
    case 'meaning-en-zh':
    case 'meaning-zh-en':
    case 'fill':
    case 'count-see':
      return '再看一看，再试一次';
    default: {
      const exhaustive: never = q;
      return exhaustive;
    }
  }
}

export function questionWordId(q: Question): string | undefined {
  if (q.type === 'order' || q.type === 'who') return undefined;
  return q.wordId;
}
