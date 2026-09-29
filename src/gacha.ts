import type { CardDef, CardManifest, Rarity } from './types';

export const RARITY_META: Record<Rarity, { zh: string; stars: number }> = {
  common: { zh: '普通', stars: 1 },
  rare: { zh: '稀有', stars: 2 },
  epic: { zh: '史诗', stars: 3 },
  legendary: { zh: '传说', stars: 5 },
};

export function allCards(manifest: CardManifest): CardDef[] {
  return manifest.series.flatMap((s) => s.cards);
}

export function findCard(manifest: CardManifest, id: string): { card: CardDef; seriesId: string } | undefined {
  for (const series of manifest.series) {
    const card = series.cards.find((c) => c.id === id);
    if (card) return { card, seriesId: series.id };
  }
  return undefined;
}

export function seriesOwned(manifest: CardManifest, seriesId: string, owned: Record<string, number>): { have: number; total: number } {
  const series = manifest.series.find((s) => s.id === seriesId);
  if (!series) return { have: 0, total: 0 };
  const have = series.cards.filter((c) => (owned[c.id] ?? 0) > 0).length;
  return { have, total: series.cards.length };
}

export function rollCard(
  manifest: CardManifest,
  pity: { epic: number; legendary: number },
  rand: () => number,
): { card: CardDef; pity: { epic: number; legendary: number } } {
  const next = { epic: pity.epic + 1, legendary: pity.legendary + 1 };
  let rarity: Rarity;
  if (next.legendary >= manifest.pityLegendary) {
    rarity = 'legendary';
  } else {
    const w = manifest.weights;
    const total = w.common + w.rare + w.epic + w.legendary;
    let x = rand() * total;
    if ((x -= w.legendary) < 0) rarity = 'legendary';
    else if ((x -= w.epic) < 0) rarity = 'epic';
    else if ((x -= w.rare) < 0) rarity = 'rare';
    else rarity = 'common';
    if (next.epic >= manifest.pityEpic && (rarity === 'common' || rarity === 'rare')) rarity = 'epic';
  }
  if (rarity === 'legendary') {
    next.legendary = 0;
    next.epic = 0;
  } else if (rarity === 'epic') {
    next.epic = 0;
  }
  const pool = allCards(manifest).filter((c) => c.rarity === rarity);
  const fallback = allCards(manifest);
  const card = pool[Math.floor(rand() * Math.max(1, pool.length))] ?? fallback[0];
  if (!card) throw new Error('卡池是空的');
  return { card, pity: next };
}
