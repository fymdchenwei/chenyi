import { readFileSync, existsSync } from 'node:fs';
import { FACE_ART_IDS, WORD_ART_IDS } from './art';
import { normalizeUnit } from './content';
import { makeQuestions, levelPlan, PICTORIAL, TEXT_ONLY, showHintButton, wrongHint, type Question } from './questions';
import { tapSpell, undoSpell, type SpellBoard } from './spell';
import { migrateOwned, nextCardLevel } from './state';
import { shouldIgnoreFollowUpClick } from './ui';
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
  for (const word of unit.words) {
    if (TEXT_ONLY.has(word.id)) {
      if (word.image) problems.push(`abstract word still has image ${word.id}`);
      continue;
    }
    if (!word.image) {
      problems.push(`missing image ${word.id}`);
      continue;
    }
    if (!word.image.startsWith('words/') || word.image.includes('..')) problems.push(`bad image path ${word.id}`);
    if (!existsSync(`public/content/${word.image}`)) problems.push(`missing image file ${word.image}`);
  }
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
  if (levelPlan(1)[2]?.title !== '谁说的' || levelPlan(3)[2]?.title !== '谁说的') problems.push('level 3 who');
  if (levelPlan(2)[2]?.kind !== 'listen') problems.push('unit 2 level 3');
  const scene = makeQuestions(unit, 'scene', 9);
  if (unit.unit === 1 && !scene.some((q) => q.type === 'pic-zh')) problems.push('unit 1 scene missing');
  const who = makeQuestions(unit, 'who', 42);
  if ((unit.unit === 1 || unit.unit === 3 || unit.unit >= 4) && !who.some((q) => q.type === 'who')) {
    problems.push(`unit ${unit.unit} who missing`);
  }
  if (unit.unit >= 4) {
    const plan = levelPlan(unit.unit);
    if (plan[0]?.kind !== 'learn' || plan[1]?.kind !== 'listen' || plan[2]?.kind !== 'who') {
      problems.push(`unit ${unit.unit} level plan`);
    }
    const listen = makeQuestions(unit, 'listen', 5);
    if (!listen.length || listen.some((q) => q.type !== 'listen-picture')) problems.push(`unit ${unit.unit} listen missing`);
    if (who.some((q) => q.type !== 'who')) problems.push(`unit ${unit.unit} who fell back`);
  }
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
    for (const option of q.options) {
      if (TEXT_ONLY.has(option.wordId)) problems.push(`abstract picture option ${option.wordId} ${where}`);
      const pictured = unit.words.find((w) => w.id === option.wordId);
      if (!pictured?.image) problems.push(`pic-zh without picture ${option.wordId} ${where}`);
    }
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
  const hint = wrongHint(q);
  if (q.type === 'order') {
    if (hint !== '再想一想顺序') problems.push(`order hint ${hint}`);
  } else if (q.type === 'dictation') {
    if (hint !== `再听一次，开头是 ${q.answer[0]}`) problems.push(`dictation hint ${hint}`);
  } else {
    const listen = q.type === 'listen-picture' || q.type === 'pic-zh' || q.type === 'who' || q.type === 'count-hear';
    const expect = listen ? '再听一听，再试一次' : '再看一看，再试一次';
    if (hint !== expect) problems.push(`choice hint ${q.type} ${hint}`);
    const secret = answerText(q);
    if (secret.length > 1 && hint.includes(secret)) problems.push(`hint leaks ${q.type} ${secret}`);
  }
}

if (showHintButton(2) || !showHintButton(0) || !showHintButton(1) || !showHintButton(3) || !showHintButton(4) || !showHintButton(5)) {
  problems.push('hint button only hidden on level index 2');
}
checkSpellBurst();

function checkSpellBurst() {
  const answer = 'elephant';
  const tiles = [...answer, 'q', 'z'].map((ch, i) => ({ id: `t${i}`, ch, used: false }));
  const board: SpellBoard = { tiles, slots: answer.split('').map(() => null), answer };
  const first = tapSpell(board, 't0');
  const again = tapSpell(board, 't0');
  if (!first.ok || first.done || again.ok) problems.push('double tap on the same letter must land once');
  if (board.slots.filter(Boolean).length !== 1) problems.push('double tap filled more than one slot');
  let lastStep: ReturnType<typeof tapSpell> = first;
  for (let i = 1; i < answer.length; i++) {
    lastStep = tapSpell(board, `t${i}`);
    if (!lastStep.ok) problems.push(`dropped spell tap ${i}`);
    if (i < answer.length - 1 && lastStep.ok && lastStep.done) problems.push('spell finished early');
  }
  const filled = board.slots.filter(Boolean).length;
  if (filled !== answer.length) problems.push(`spell burst filled ${filled}`);
  if (!lastStep.ok || !lastStep.done || !lastStep.correct) problems.push('spell burst should complete elephant');
  if (!undoSpell(board)) problems.push('undo');
  if (board.slots[answer.length - 1] !== null || board.tiles[answer.length - 1].used) problems.push('undo did not clear last letter');
  const miss = tapSpell(board, 't8');
  if (!miss.ok || !miss.done || miss.correct) problems.push('decoy letter should finish wrong');
}

function answerText(q: Question): string {
  if (q.type === 'meaning-en-zh' || q.type === 'meaning-zh-en') return q.options[q.answer]?.label ?? '';
  if (q.type === 'fill') return q.options[q.answer] ?? '';
  if (q.type === 'who') return q.options[q.answer]?.name ?? '';
  if (q.type === 'pic-zh') return q.options[q.answer]?.zh ?? '';
  if (q.type === 'count-see') return q.options[q.answer]?.label ?? '';
  return '';
}

const pictureCss = readFileSync('src/style.css', 'utf8');
const playSource = readFileSync('src/screens/play.ts', 'utf8');
const pictureRules = [
  '.learn-card .art-wrap .word-art',
  'grid-template-columns: 1.65fr .7fr',
  "height: 40.71cqh",
  '.quiz[data-q=\'count-see\'] .prompt-card .count-svg',
  'height: 53.44cqh',
  '.quiz[data-q=\'listen-picture\'] .pic-card',
  'width: 23.24cqw',
  'height: 53.44cqh',
  '.quiz[data-q=\'count-hear\'] .pic-card .count-svg',
  'width: 35.21cqw',
  'height: 33.59cqh',
  '.who-layout .face-art',
  'object-fit: cover',
  'white-space: normal',
  'overflow: visible',
];
for (const rule of pictureRules) {
  if (!pictureCss.includes(rule)) problems.push(`picture size rule missing: ${rule}`);
}
if (!playSource.includes('class="scene-bar"')) problems.push('pic-zh should keep the mascot in the top bar');
if (/放大|preview|zoom/.test(playSource)) problems.push('picture preview must stay off');
if (showHintButton(2)) problems.push('level 3 must hide the hint button');

const now = 1_000;
if (!shouldIgnoreFollowUpClick('next|', 'next|', now, now + 500)) problems.push('same-control click should be ignored');
if (shouldIgnoreFollowUpClick('next|', 'back|', now, now + 500)) problems.push('back click after next must not be ignored');
if (shouldIgnoreFollowUpClick('next|', 'back|', now + 500, now + 500)) problems.push('expired window must not ignore a different control');
if (!shouldIgnoreFollowUpClick('next|', null, now, now + 500)) problems.push('click on empty space should be ignored');

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`ok questions=${questions} types=${[...types].sort().join(',')}`);
