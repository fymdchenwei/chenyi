export interface WordStat {
  learned: boolean;
  correct: number;
  attempts: number;
}

export interface LevelStat {
  stars: number;
  clears: number;
}

export interface Settings {
  dailyMin: number;
  muteSfx: boolean;
  muteSpeech: boolean;
}

export interface Save {
  v: 1;
  stars: number;
  totalEarned: number;
  levels: Record<string, LevelStat>;
  words: Record<string, WordStat>;
  owned: Record<string, number>;
  pity: { epic: number; legendary: number };
  claimed: Record<string, boolean>;
  settings: Settings;
  usage: Record<string, number>;
  introSeen: boolean;
  albumSeen: number;
}

const KEY = 'chenyi.v1';

function defaultSave(): Save {
  return {
    v: 1,
    stars: 0,
    totalEarned: 0,
    levels: {},
    words: {},
    owned: {},
    pity: { epic: 0, legendary: 0 },
    claimed: {},
    settings: { dailyMin: 20, muteSfx: false, muteSpeech: false },
    usage: {},
    introSeen: false,
    albumSeen: 0,
  };
}

function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Save;
    if (!parsed || parsed.v !== 1) return defaultSave();
    return { ...defaultSave(), ...parsed, settings: { ...defaultSave().settings, ...parsed.settings }, pity: { ...defaultSave().pity, ...parsed.pity } };
  } catch {
    return defaultSave();
  }
}

export let game: Save = load();

export function persist(): void {
  localStorage.setItem(KEY, JSON.stringify(game));
}

export function levelKey(unit: number, index: number): string {
  return `u${unit}-l${index}`;
}

export function isCleared(unit: number, index: number): boolean {
  return (game.levels[levelKey(unit, index)]?.clears ?? 0) > 0;
}

export function levelStars(unit: number, index: number): number {
  return game.levels[levelKey(unit, index)]?.stars ?? 0;
}

export function isLevelUnlocked(unit: number, index: number, playable: boolean): boolean {
  if (!playable) return false;
  if (unit === 1 && index === 0) return true;
  if (index === 0) return isCleared(unit - 1, 6);
  return isCleared(unit, index - 1);
}

export function awardLevel(unit: number, index: number, stars: number): { gained: number; first: boolean } {
  const id = levelKey(unit, index);
  const prev = game.levels[id]?.stars ?? 0;
  const clears = (game.levels[id]?.clears ?? 0) + 1;
  const replay = prev >= 3 ? 2 : 0;
  const gained = Math.max(0, stars - prev) + replay;
  game.levels[id] = { stars: Math.max(prev, stars), clears };
  game.stars += gained;
  game.totalEarned += gained;
  persist();
  return { gained, first: clears === 1 };
}

export function markLearned(wordId: string): void {
  const w = game.words[wordId] ?? { learned: false, correct: 0, attempts: 0 };
  w.learned = true;
  game.words[wordId] = w;
  persist();
}

export function recordAttempt(wordId: string | undefined, correct: boolean): void {
  if (!wordId) return;
  const w = game.words[wordId] ?? { learned: false, correct: 0, attempts: 0 };
  w.attempts += 1;
  if (correct) {
    w.correct += 1;
    w.learned = true;
  }
  game.words[wordId] = w;
  persist();
}

export function ownedCount(): number {
  return Object.values(game.owned).filter((n) => n > 0).length;
}

export function giveCard(id: string, refund: number): { isNew: boolean } {
  const prev = game.owned[id] ?? 0;
  game.owned[id] = prev + 1;
  if (prev > 0) {
    game.stars += refund;
    game.totalEarned += refund;
  }
  persist();
  return { isNew: prev === 0 };
}

export function spendStars(n: number): boolean {
  if (game.stars < n) return false;
  game.stars -= n;
  persist();
  return true;
}

export function setPity(pity: { epic: number; legendary: number }): void {
  game.pity = pity;
  persist();
}

export function claimSeries(id: string, reward: number): boolean {
  if (game.claimed[id]) return false;
  game.claimed[id] = true;
  game.stars += reward;
  game.totalEarned += reward;
  persist();
  return true;
}

export function todayKey(d = new Date()): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function usageToday(): number {
  return game.usage[todayKey()] ?? 0;
}

export function addUsage(seconds: number): void {
  const key = todayKey();
  game.usage[key] = (game.usage[key] ?? 0) + seconds;
  const keys = Object.keys(game.usage).sort();
  while (keys.length > 14) {
    const drop = keys.shift();
    if (drop) delete game.usage[drop];
  }
  persist();
}

export function timeUp(): boolean {
  const limit = game.settings.dailyMin;
  if (limit <= 0) return false;
  return usageToday() >= limit * 60;
}

export function resetProgress(): void {
  const settings = { ...game.settings };
  game = defaultSave();
  game.settings = settings;
  persist();
}

export function seeAlbum(count: number): void {
  game.albumSeen = count;
  persist();
}

export function seeIntro(): void {
  game.introSeen = true;
  persist();
}

export function setDailyMin(min: number): void {
  game.settings.dailyMin = min;
  persist();
}

export function toggleSfx(): void {
  game.settings.muteSfx = !game.settings.muteSfx;
  persist();
}

export function toggleSpeech(): void {
  game.settings.muteSpeech = !game.settings.muteSpeech;
  persist();
}
