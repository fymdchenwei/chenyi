export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Word {
  id: string;
  en: string;
  bookEn: string;
  spell: string;
  zh: string;
  zhShort: string;
  group: string;
  emoji: string;
  dictatable: boolean;
  note?: string;
  example?: { en: string; zh: string };
}

export interface DialogueLine {
  speaker: string;
  en: string;
  zh: string;
  uncertain?: boolean;
}

export interface NormUnit {
  unit: number;
  titleEn: string;
  titleZh: string;
  playable: boolean;
  words: Word[];
  songLines: { en: string; zh: string }[];
  dialogues: { id: string; uncertain?: boolean; lines: DialogueLine[] }[];
  sentences: { en: string; zh: string; uncertain?: boolean }[];
}

export interface CardDef {
  id: string;
  name: string;
  rarity: Rarity;
  image: string;
  emoji: string;
  blurb: string;
}

export interface CardSeries {
  id: string;
  name: string;
  icon: string;
  color: string;
  cards: CardDef[];
}

export interface CardManifest {
  drawCost: number;
  tenDrawCost: number;
  pityEpic: number;
  pityLegendary: number;
  seriesReward: number;
  maxLevel: number;
  maxRefund: number;
  weights: Record<Rarity, number>;
  cardBack: string;
  series: CardSeries[];
}

export interface CardExtra {
  hint: string;
  lore: string;
  word?: { en: string; zh: string };
}

export interface GameData {
  book: string;
  units: NormUnit[];
  cards: CardManifest;
  lore: Record<string, CardExtra>;
}

export interface DrawHit {
  cardId: string;
  isNew: boolean;
  level: number;
  refund: number;
  maxed: boolean;
}

export type Screen =
  | { name: 'map' }
  | { name: 'learn'; unit: number; index: number }
  | { name: 'quiz'; unit: number; index: number }
  | { name: 'result'; unit: number; index: number; stars: number; gained: number; first: boolean }
  | { name: 'draw' }
  | { name: 'reveal'; cardId: string; isNew: boolean; level: number; refund: number; maxed: boolean }
  | { name: 'ten'; hits: DrawHit[] }
  | { name: 'album' }
  | { name: 'parent-gate' }
  | { name: 'parent' }
  | { name: 'timeup' };

export interface AppCtx {
  data: GameData;
  goto: (screen: Screen) => void;
}
