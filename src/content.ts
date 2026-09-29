import type { CardExtra, GameData, NormUnit, Word } from './types';
import { asset, escapeReg } from './util';

interface UnitMeta {
  unit: number;
  title_en: string;
  title_zh: string;
  file: string | null;
  playable: boolean;
}

interface UnitIndex {
  book: string;
  units: UnitMeta[];
}

interface RawWord {
  id: string;
  en: string;
  zh: string;
  emoji_hint?: string;
  image?: string;
}

interface RawLine {
  speaker?: string;
  en: string;
  zh: string;
  uncertain?: boolean;
}

interface RawUnit {
  unit: number;
  title_en: string;
  title_zh: string;
  words?: RawWord[];
  sentences?: { id?: string; en: string; zh: string; uncertain?: boolean }[];
  song?: { lines?: { en: string; zh: string }[] };
  dialogues?: { id: string; uncertain?: boolean; lines?: RawLine[] }[];
}

const ZH_SHORT: Record<string, string> = {
  u1_w01: '你好',
  u1_w02: '令人愉快的',
  u1_w03: '认识',
  u1_w04: '你',
  u1_w05: '让我们',
  u1_w06: '玩',
  u1_w07: '我',
  u1_w08: '是',
  u1_w09: '也',
  u1_w10: '照片',
  u1_w11: '怎样',
  u1_w12: '说',
  u2_w01: '一',
  u2_w02: '二',
  u2_w03: '三',
  u2_w04: '四',
  u2_w05: '五',
  u2_w06: '六',
  u2_w07: '七',
  u2_w08: '气球',
  u2_w09: '谢谢',
  u2_w10: '请',
  u2_w11: '数字',
  u3_w01: '我的',
  u3_w02: '家庭',
  u3_w03: '妈妈',
  u3_w04: '爸爸',
  u3_w05: '爷爷/外公',
  u3_w06: '奶奶/外婆',
  u3_w07: '姐姐/妹妹',
  u3_w08: '和',
  u3_w09: '哥哥/弟弟',
  u3_w10: '这个',
  u3_w11: '是',
  u3_w12: '爱',
  u3_w13: '我',
};

/** Words that share a meaning must never be offered as each other's distractors. */
const GROUP: Record<string, string> = {
  u1_w07: 'wo',
  u3_w13: 'wo',
  u1_w08: 'be',
  u3_w11: 'be',
};

export function displayEn(en: string): string {
  let s = en.split('=')[0].trim();
  s = s.replace(/\(.*/, '').trim();
  return s;
}

export function normalizeUnit(raw: RawUnit, meta?: Partial<UnitMeta>): NormUnit {
  const sentences = (raw.sentences ?? []).map((s) => ({
    en: s.en,
    zh: s.zh,
    uncertain: Boolean(s.uncertain),
  }));
  const words: Word[] = (raw.words ?? []).map((w) => {
    const en = displayEn(w.en);
    const spell = en.toLowerCase().replace(/[^a-z]/g, '');
    const zhShort = ZH_SHORT[w.id] ?? w.zh;
    const example = findExample(en, sentences);
    const note = w.en.includes("I'm") ? "I'm = I am" : undefined;
    return {
      id: w.id,
      en,
      bookEn: w.en,
      spell,
      zh: w.zh,
      zhShort,
      group: GROUP[w.id] ?? w.id,
      emoji: w.emoji_hint ?? '⭐',
      dictatable: spell.length >= 3 && spell.length <= 10 && spell === en.toLowerCase(),
      note,
      example,
      image: w.image,
    };
  });
  return {
    unit: raw.unit,
    titleEn: raw.title_en,
    titleZh: raw.title_zh,
    playable: meta?.playable ?? true,
    words,
    songLines: raw.song?.lines ?? [],
    dialogues: (raw.dialogues ?? []).map((d) => ({
      id: d.id,
      uncertain: d.uncertain,
      lines: (d.lines ?? []).map((line) => ({
        speaker: line.speaker ?? '',
        en: line.en,
        zh: line.zh,
        uncertain: line.uncertain,
      })),
    })),
    sentences,
  };
}

function findExample(en: string, sentences: { en: string; zh: string; uncertain?: boolean }[]) {
  if (en.length < 2) return undefined;
  const re = new RegExp(`(^|[^A-Za-z'])${escapeReg(en)}([^A-Za-z']|$)`, 'i');
  const hit = sentences.find((s) => !s.uncertain && !s.en.includes('/') && re.test(s.en) && s.en.length <= 48);
  return hit ? { en: hit.en, zh: hit.zh } : undefined;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`无法读取 ${url}`);
  return (await res.json()) as T;
}

export async function loadAll(): Promise<GameData> {
  const index = await getJson<UnitIndex>(asset('content/units.json'));
  const units: NormUnit[] = [];
  for (const meta of index.units) {
    if (meta.file && meta.playable) {
      const raw = await getJson<RawUnit>(asset(`content/${meta.file}`));
      units.push(normalizeUnit(raw, meta));
    } else {
      units.push({
        unit: meta.unit,
        titleEn: meta.title_en,
        titleZh: meta.title_zh,
        playable: false,
        words: [],
        songLines: [],
        dialogues: [],
        sentences: [],
      });
    }
  }
  const cards = await getJson<GameData['cards']>(asset('content/cards/manifest.json'));
  const lore = await getJson<Record<string, CardExtra>>(asset('content/cards/lore.json'));
  return { book: index.book, units, cards, lore };
}

export function unitByNumber(data: GameData, n: number): NormUnit {
  const unit = data.units.find((u) => u.unit === n);
  if (!unit) throw new Error(`missing unit ${n}`);
  return unit;
}
