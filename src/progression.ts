import type { Character, CharacterId } from './data';

export const MAX_HERO_LEVEL = 15;
export const ABILITY_LEVELS = [1, 3, 5, 8, 11, 15] as const;
export type Attribute = 'vitality' | 'endurance' | 'power';
export interface HeroProgress { level: number; xp: number; points: number; bonusPoints: number; attributes: Record<Attribute, number> }
export type HeroProgressMap = Record<CharacterId, HeroProgress>;
export const freshHero = (): HeroProgress => ({ level: 1, xp: 0, points: 0, bonusPoints: 0, attributes: { vitality: 0, endurance: 0, power: 0 } });
export const xpToNext = (level: number) => level >= MAX_HERO_LEVEL ? 0 : 80 + (level - 1) * 55 + (level - 1) ** 2 * 5;
export const attributeCost = (rank: number) => 1 + Math.floor(rank / 3);
export const attributeRankCap = (level: number) => Math.min(15, Math.max(1, Math.ceil(level / 2)));
export const attributeBudget = (level: number, bonus: number) => Math.floor(level / 2) + Math.min(4, bonus);
const spentPoints = (attributes: Record<Attribute, number>) => Object.values(attributes).reduce((sum, rank) => sum + Array.from({ length: rank }, (_, index) => attributeCost(index)).reduce((a, b) => a + b, 0), 0);
export const attributeNames: Record<Attribute, string> = { vitality: 'Vitality', endurance: 'Endurance', power: 'Power' };
export const attributeEffects: Record<Attribute, string> = { vitality: '+6 maximum health', endurance: '+5 stamina and ability energy', power: '+2% attack and ability damage' };

export function normalizeHero(value: unknown): HeroProgress {
  const state = value && typeof value === 'object' ? value as Partial<HeroProgress> : {};
  const bounded = (n: unknown, max: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(max, Math.floor(n))) : 0;
  const level = Math.max(1, bounded(state.level, MAX_HERO_LEVEL));
  const attributes = { vitality: bounded(state.attributes?.vitality, 15), endurance: bounded(state.attributes?.endurance, 15), power: bounded(state.attributes?.power, 15) };
  const bonusPoints = bounded(state.bonusPoints, 4);
  return { level, xp: level === MAX_HERO_LEVEL ? 0 : bounded(state.xp, xpToNext(level) - 1), points: Math.min(bounded(state.points, 999), Math.max(0, attributeBudget(level, bonusPoints) - spentPoints(attributes))), bonusPoints, attributes };
}

export function grantExperience(current: HeroProgress, xp: number, points = 0): HeroProgress {
  const next = { ...current, attributes: { ...current.attributes }, xp: current.xp + Math.max(0, Math.floor(xp)), bonusPoints: Math.min(4, (current.bonusPoints || 0) + Math.max(0, Math.floor(points))) };
  const oldBudget = attributeBudget(current.level, current.bonusPoints || 0);
  while (next.level < MAX_HERO_LEVEL && next.xp >= xpToNext(next.level)) {
    next.xp -= xpToNext(next.level); next.level++;
  }
  if (next.level === MAX_HERO_LEVEL) next.xp = 0;
  next.points = Math.min(Math.max(0, attributeBudget(next.level, next.bonusPoints) - spentPoints(next.attributes)), current.points + Math.max(0, attributeBudget(next.level, next.bonusPoints) - oldBudget));
  return next;
}

export function heroStats(hero: Character, progress: HeroProgress) {
  return {
    hp: Math.round(hero.hp * (1 + (progress.level - 1) * .04) + progress.attributes.vitality * 6),
    stamina: hero.stamina + (progress.level - 1) * 3 + progress.attributes.endurance * 5,
    damage: Math.round(hero.damage * (1 + (progress.level - 1) * .025 + progress.attributes.power * .02)),
    energy: 100 + (progress.level - 1) * 3 + progress.attributes.endurance * 5,
    multiplier: 1 + (progress.level - 1) * .025 + progress.attributes.power * .02,
  };
}

export interface ResourceProfile { kind: 'stamina' | 'mana' | 'focus' | 'fury' | 'souls' | 'blood'; name: string; short: string; color: string; regen: number; description: string }
export function resourceFor(hero: Character): ResourceProfile {
  if (hero.id === 'killison' || hero.id === 'malachar') return { kind: 'blood', name: 'Blood Ritual', short: '% HP', color: '#e39891', regen: 0, description: 'Powers sacrifice a percentage of maximum health. A ritual cannot reduce you below 1 HP. Direct hits steal life.' };
  if (hero.id === 'berserker') return { kind: 'fury', name: 'Fury', short: 'FURY', color: '#e19b78', regen: 3, description: 'Build Fury by landing attacks and taking damage. Regenerates slowly between fights.' };
  if (['rogue', 'ranger', 'monk', 'duneblade'].includes(hero.id)) return { kind: 'focus', name: 'Focus', short: 'FOC', color: '#c9c07f', regen: 9, description: 'Focus fuels precision abilities. Attacks restore a little Focus; it also regenerates over time.' };
  if (['reaper', 'phantom'].includes(hero.id)) return { kind: 'souls', name: 'Soul Energy', short: 'SOUL', color: '#c6a7e3', regen: hero.id === 'phantom' ? 35 : 6, description: 'Harvest energy from fallen enemies. Powers spend Soul Energy, not your movement stamina.' };
  if (['mage', 'frost', 'storm', 'plague', 'oracle', 'paladin', 'tidecaller', 'seraph'].includes(hero.id)) return { kind: 'mana', name: 'Mana', short: 'MP', color: '#8ebee3', regen: 8, description: 'Magic consumes Mana. It regenerates steadily; rare draughts refill it instantly.' };
  return { kind: 'stamina', name: 'Stamina', short: 'STA', color: '#adbd87', regen: 22, description: 'Combat powers, sprinting, and dodging share the same stamina pool.' };
}