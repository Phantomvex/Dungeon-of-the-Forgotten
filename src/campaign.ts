import { dungeons, type DungeonId } from './game/content';
import type { Progress } from './data';

export function isBiomeUnlocked(progress: Pick<Progress, 'clearedBiomes'>, id: DungeonId) {
  const index = dungeons.findIndex(dungeon => dungeon.id === id);
  return index >= 0 && dungeons.slice(0, index).every(dungeon => progress.clearedBiomes.includes(dungeon.id));
}
export function nextBiome(id: DungeonId) { return dungeons[dungeons.findIndex(dungeon => dungeon.id === id) + 1] || null; }
export function recordBiomeClear(progress: Progress, id: DungeonId): Progress {
  if (!isBiomeUnlocked(progress, id) || progress.clearedBiomes.includes(id)) return progress;
  return { ...progress, clearedBiomes: [...progress.clearedBiomes, id] };
}