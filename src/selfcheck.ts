import { readFileSync, existsSync } from 'node:fs';
import { FACE_ART_IDS, WORD_ART_IDS } from './art';
import { normalizeUnit } from './content';
import { makeQuestions, levelPlan, PICTORIAL, type Question } from './questions';
import { migrateOwned, nextCardLevel } from './state';
import type { NormUnit } from './types';

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const index = readJson('public/content/units.json') as {
  units: { unit: number; file: string | null; playable: boolean; title_en: string; title_zh: string }[];
};
const manifest = readJson('public/content/cards/manifest.json') as {
  cardBack: string;
  drawCost: number;
  tenDrawCost: number;
  pityEpic: number;
  pityLegendary: number;
  maxLevel: number;
  maxRefund: number;
  seriesReward: number;
  series: { id: string; cards: { id: string; image: string; rarity: string }[] }[];
};
const lore = readJson('public/content/cards/lore.json') as Record<string, { hint?: string; lore?: string; word?: { en?: string; zh?: string } }>;

const problems: string[] = [];
let questions = 0;
const types = new Set<string>();

for (const meta of index.units) {
  if (!meta.playable) {
    if (meta.file) problems.push(`locked unit ${meta.unit} should not have a file in v1`);
    continue;
  }
  const raw = readJson(`public/content/${meta.file}`);
  const unit = normalizeUnit(raw, meta) as NormUnit;
  if (unit.words.length < 8) problems.push(`unit ${unit.unit} has too few words`);
  const grandpa = unit.words.find((w) => w.en === 'grandpa');
  if (grandpa && grandpa.zhShort !== '爷爷/外公') problems.push('grandpa display');
  const sister = unit.words.find((w) => w.en === 'sister');
  if (sister && sister.zhShort.includes('；')) problems.push('sister meanings should be combined');
  for (const level of levelPlan(unit.unit)) {
    if (level.kind === 'learn') continue;
    for (let seed = 1; seed <= 6; seed++) {
      const qs = makeQuestions(unit, level.kind, seed * 1000 + unit.unit * 17 + seed);
      if (qs.length === 0) problems.push(`empty ${unit.unit} ${level.kind} seed ${seed}`);
      if (level.kind === 'boss' && qs.some((q) => q.type !== 'dictation' && !q.type.startsWith('meaning'))) {
        problems.push(`boss leaked ${unit.unit}`);
      }
      for (const q of qs) checkQuestion(q, unit, `${unit.unit}:${level.kind}`);
      questions += qs.length;
    }
  }
  if (unit.unit === 1 && levelPlan(1)[1]?.kind !== 'scene') problems.push('unit 1 level 2 should be scene');
  const scene = makeQuestions(unit, 'scene', 9);
  if (unit.unit === 1 && !scene.some((q) => q.type === 'pic-zh')) problems.push('unit 1 scene missing');
  const who = makeQuestions(unit, 'who', 42);
  if ((unit.unit === 1 || unit.unit === 3) && !who.some((q) => q.type === 'who')) problems.push(`unit ${unit.unit} who missing`);
  const meaning = makeQuestions(unit, 'meaning', 7);
  if (!meaning.some((q) => q.type === 'meaning-en-zh') || !meaning.some((q) => q.type === 'meaning-zh-en')) {
    problems.push(`unit ${unit.unit} missing a meaning direction`);
  }
  if (unit.unit === 2 && !makeQuestions(unit, 'count', 3).some((q) => q.type === 'count-see' || q.type === 'count-hear')) {
    problems.push('unit 2 count missing');
  }
}

for (const series of manifest.series) {
  if (series.cards.length < 6 || series.cards.length > 12) problems.push(`series size ${series.id}`);
  for (const card of series.cards) {
    const path = `public/content/cards/images/${card.image}`;
    if (!existsSync(path)) problems.push(`missing art ${path}`);
  }
}
if (!existsSync(`public/content/cards/images/${manifest.cardBack}`)) problems.push('missing card back');
if (manifest.series.length !== 4) problems.push('expected 4 series');
if (manifest.drawCost !== 2) problems.push('drawCost');
if (manifest.tenDrawCost !== 18) problems.push('tenDrawCost');
if (manifest.maxLevel !== 10 || manifest.maxRefund !== 1) problems.push('card level economy');
if (manifest.pityEpic > manifest.pityLegendary) problems.push('pity order');
for (const id of WORD_ART_IDS) {
  if (!existsSync(`public/content/words/${id}.webp`)) problems.push(`missing word art ${id}`);
}
for (const id of FACE_ART_IDS) {
  if (!existsSync(`public/content/words/face-${id}.webp`)) problems.push(`missing face ${id}`);
}
const oldOwned = migrateOwned({ 'star-knight': 4, 'rat': 0, nope: -1 }, false);
if (oldOwned['star-knight'] !== 1 || oldOwned.rat || oldOwned.nope) problems.push('migrate copies to level 1');
const kept = migrateOwned({ 'star-knight': 7, bajie: 12 }, true, 10);
if (kept['star-knight'] !== 7 || kept.bajie !== 10) problems.push('keep card levels');
const fresh = nextCardLevel(0, 10, 1);
const up = nextCardLevel(3, 10, 1);
const maxed = nextCardLevel(10, 10, 1);
if (!fresh.isNew || fresh.level !== 1 || fresh.refund !== 0) problems.push('new card level');
if (up.isNew || up.level !== 4 || up.refund !== 0 || up.maxed) problems.push('upgrade level');
if (!maxed.maxed || maxed.level !== 10 || maxed.refund !== 1) problems.push('max refund');
for (const series of manifest.series) {
  for (const card of series.cards) {
    const extra = lore[card.id];
    if (!extra?.hint || extra.hint.length < 4) problems.push(`hint ${card.id}`);
    if (!extra?.lore || extra.lore.length < 20) problems.push(`lore ${card.id}`);
    if (!extra?.word?.en || !extra.word.zh) problems.push(`word ${card.id}`);
  }
}

function checkQuestion(q: Question, unit: NormUnit, where: string) {
  types.add(q.type);
  if (q.type === 'dictation') {
    if (!/^[a-z]{3,10}$/.test(q.answer)) problems.push(`bad spell ${q.answer} ${where}`);
    const word = unit.words.find((w) => w.id === q.wordId);
    if (!word || word.spell !== q.answer) problems.push(`dictation mismatch ${where}`);
  }
  if (q.type === 'meaning-en-zh' || q.type === 'meaning-zh-en') {
    if (q.options.length !== 4) problems.push(`meaning options ${where}`);
    const labels = q.options.map((o) => o.label);
    if (new Set(labels).size !== labels.length) problems.push(`duplicate meaning label ${where} ${labels.join('|')}`);
    if (q.answer < 0 || q.answer > 3) problems.push(`bad meaning index ${where}`);
    const word = unit.words.find((w) => w.id === q.wordId);
    if (!word) problems.push(`missing word ${where}`);
    if (word && (q.wordId === 'u1_w07' || q.wordId === 'u3_w13')) {
      const other = q.wordId === 'u1_w07' ? 'u3_w13' : 'u1_w07';
      if (labels.includes(unit.words.find((w) => w.id === other)?.zhShort ?? '___no')) {
        /* same short text is 我; ensure the other word is not a separate competing option by id.
           Labels can both be 我 only if both words are present. They must not both appear. */
      }
    }
    if (word) {
      const ids = unit.words.filter((w) => labels.includes(w.zhShort) || labels.includes(w.en)).map((w) => w.id);
      if (ids.includes('u1_w07') && ids.includes('u3_w13')) problems.push('I and me compete');
      if (ids.includes('u1_w08') && ids.includes('u3_w11')) problems.push('am and is compete');
    }
    if (labels.some((l) => l === '祖父' || l === '外祖父' || l === '姐姐' || l === '妹妹')) {
      problems.push(`split meaning used as option ${labels.join(',')}`);
    }
  }
  if (q.type === 'listen-picture' || q.type === 'pic-zh' || q.type === 'who' || q.type === 'count-see' || q.type === 'count-hear') {
    if (q.options.length !== 4) problems.push(`${q.type} options ${where}`);
    if (q.answer < 0 || q.answer > 3) problems.push(`${q.type} answer ${where}`);
  }
  if (q.type === 'listen-picture') {
    for (const option of q.options) {
      if (!PICTORIAL.has(option.wordId)) problems.push(`abstract picture option ${option.wordId} ${where}`);
    }
  }
  if (q.type === 'pic-zh') {
    const labels = q.options.map((o) => o.zh);
    if (new Set(labels).size !== labels.length) problems.push(`pic-zh labels ${where}`);
    if (!q.options[q.answer] || q.options[q.answer].wordId !== q.wordId) problems.push(`pic-zh answer ${where}`);
  }
  if (q.type === 'who') {
    const faces = q.options.map((o) => o.face);
    if (new Set(faces).size !== faces.length) problems.push('duplicate faces');
  }
  if (q.type === 'order') {
    if (q.lines.length !== 3 || q.answer.length !== 3) problems.push('order size');
    const set = new Set(q.answer);
    if (set.size !== 3) problems.push('order not permutation');
  }
  if (q.type === 'fill') {
    if (!q.options[q.answer]) problems.push('fill answer');
    if (new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length) problems.push('fill dup');
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`ok questions=${questions} types=${[...types].sort().join(',')}`);
