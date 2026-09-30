export interface SpellTile {
  id: string;
  ch: string;
  used: boolean;
}

export interface SpellBoard {
  tiles: SpellTile[];
  slots: (string | null)[];
  answer: string;
}

export type SpellResult = { ok: false } | { ok: true; done: false } | { ok: true; done: true; correct: boolean };

/** Place one letter. A second tap on the same tile is ignored. */
export function tapSpell(board: SpellBoard, id: string): SpellResult {
  const tile = board.tiles.find((t) => t.id === id);
  const empty = board.slots.findIndex((s) => s === null);
  if (!tile || tile.used || empty < 0) return { ok: false };
  tile.used = true;
  board.slots[empty] = tile.id;
  if (!board.slots.every((s) => s !== null)) return { ok: true, done: false };
  const spelled = board.slots.map((tid) => board.tiles.find((t) => t.id === tid)?.ch ?? '').join('');
  return { ok: true, done: true, correct: spelled === board.answer };
}

export function undoSpell(board: SpellBoard): boolean {
  for (let i = board.slots.length - 1; i >= 0; i--) {
    const id = board.slots[i];
    if (!id) continue;
    const tile = board.tiles.find((t) => t.id === id);
    if (tile) tile.used = false;
    board.slots[i] = null;
    return true;
  }
  return false;
}
