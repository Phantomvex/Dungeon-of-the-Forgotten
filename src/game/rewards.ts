import { boosts, chestRarities, type BoostId, type DungeonId, type Rarity } from './content';

export const BOSS_INTERVAL = 3;
export const isBossFloor = (floor: number) => floor > 0 && floor % BOSS_INTERVAL === 0;
export const nextBossFloor = (floor: number, defeated = false) => Math.ceil((floor + (defeated && isBossFloor(floor) ? 1 : 0)) / BOSS_INTERVAL) * BOSS_INTERVAL;
export type CharmId = 'fang' | 'lantern' | 'pearl';
export const runCharms: Record<CharmId, { name: string; description: string; color: string }> = {
  fang: { name: 'Fang of Ruin', description: '+10% damage for this run. Stacks up to three times.', color: '#d9ad86' },
  lantern: { name: 'Soul Lantern', description: '+20% resource regeneration for this run. Stacks up to three times.', color: '#b0a4d9' },
  pearl: { name: 'Tide Pearl', description: '10% less incoming damage for this run. Stacks up to three times.', color: '#98cdc7' },
};
export interface ChestReward { gold: number; shards: number; heal: number; energy: boolean; xp: number; points: number; boost?: BoostId; buff: boolean; charm?: CharmId; }
const integer = (min: number, max: number, random: () => number) => min + Math.floor(random() * (max - min + 1));

export function rollChestReward(rarity: Rarity, random: () => number = Math.random): ChestReward {
  const tier = ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(rarity);
  const definition = chestRarities[rarity];
  const reward: ChestReward = { gold: 0, shards: 0, heal: 0, energy: false, xp: 0, points: 0, buff: false };
  const roll = random();
  if (roll < .38) {
    reward.gold = integer(...definition.gold, random);
    if (tier >= 2 && random() < .6) reward.shards = integer(...definition.shards, random);
  } else if (roll < .61) {
    reward.heal = definition.heal; reward.energy = true;
    if (tier >= 2 && random() < .5) reward.boost = boosts[integer(0, boosts.length - 1, random)].id;
  } else if (roll < .84) {
    reward.xp = 18 + tier * 22; reward.points = tier >= 2 && random() < (tier === 4 ? .2 : .08) ? 1 : 0;
  } else {
    reward.buff = true;
    if (tier >= 2) reward.charm = (['fang', 'lantern', 'pearl'] as CharmId[])[integer(0, 2, random)];
  }
  if (tier === 4 && random() < .5) reward.shards = Math.max(reward.shards, integer(...definition.shards, random));
  reward.shards = Math.round(reward.shards * 1.1);
  return reward;
}

export type SealKind = 'ash' | 'forge' | 'spore' | 'tide' | 'frost' | 'sand' | 'astral';
export interface BossSeal { id: string; kind: SealKind; tier: number; floor: number; }
export const sealDefinitions: Record<SealKind, { name: string; power: string; description: string; color: string; cost: number; cooldown: number }> = {
  ash: { name: 'Seal of the Sovereign', power: 'Crown of Ash', description: 'Steal the Sovereign\'s ultimate: three radial waves of piercing soul-flame.', color: '#e4ad7b', cost: 50, cooldown: 22 },
  forge: { name: 'Seal of the Iron Tyrant', power: 'Worldforge', description: 'An expanding molten faultline crushes enemies and burns the ground.', color: '#ee9c64', cost: 55, cooldown: 24 },
  spore: { name: 'Seal of the Bloom', power: 'Deathblossom', description: 'Release poisonous spore rings and a lingering field that drains nearby enemies.', color: '#a2d3a3', cost: 45, cooldown: 22 },
  tide: { name: 'Seal of the Drowned', power: 'Leviathan\'s Wake', description: 'A colossal whirlpool drags enemies inward, followed by a crushing tidal nova.', color: '#91d5df', cost: 55, cooldown: 24 },
  frost: { name: 'Seal of Eternal Winter', power: 'Glacial Cataclysm', description: 'A ring of piercing ice lances freezes the chamber, followed by a freezing shockwave.', color: '#b4e6f0', cost: 50, cooldown: 23 },
  sand: { name: 'Seal of the Buried Sun', power: 'Dynasty\'s End', description: 'A golden sandstorm hurls piercing shards and drags enemies into a crushing vortex.', color: '#dfbd83', cost: 50, cooldown: 24 },
  astral: { name: 'Seal of the Starless', power: 'Event Horizon', description: 'An astral singularity pulls everything inward as stellar bolts sweep the chamber.', color: '#c6acf0', cost: 60, cooldown: 26 },
};
export interface BossProfile { name: string; seal: SealKind; color: string; arena: string; epithet: string; warning: string; dialogue: string[]; }
export const bossProfiles: Record<DungeonId, BossProfile> = {
  crypt: { name: 'The Ashen Sovereign', seal: 'ash', color: '#dcb17b', arena: 'The Throne of Forgotten Names', epithet: 'THE KING WHO WOULD NOT DIE', warning: 'Beyond this portal, the Sovereign waits.', dialogue: ['Another flame at my doorstep. Another name the stone will swallow.', 'I kept this kingdom alive when even the gods abandoned it. You call that a curse.', 'Then come, little light. Let us see which of us the darkness remembers.'] },
  foundry: { name: 'The Iron Tyrant', seal: 'forge', color: '#e59c66', arena: 'The Heartforge', epithet: 'MASTER OF THE LAST FURNACE', warning: 'The forge falls silent. Its master has noticed you.', dialogue: ['I hear every blade that breaks in my halls. Yours has not broken. Yet.', 'This furnace forged a thousand kings. Their crowns became my chains.', 'Step closer. I have a place for you in the fire.'] },
  hollows: { name: 'The Hollow Bloom', seal: 'spore', color: '#a6d3a2', arena: 'The Garden Beneath All Things', epithet: 'THE ROOT THAT DREAMS', warning: 'The spores draw back. Something ancient is waking.', dialogue: ['You tread so loudly for something so brief.', 'Every fallen hero feeds the roots. Nothing is ever truly lost here.', 'Be still, little wanderer. Let the garden grow through you.'] },
  drowned: { name: 'The Drowned Regent', seal: 'tide', color: '#8dcedb', arena: 'The Tidal Court', epithet: 'SOVEREIGN OF THE SUNKEN CHOIR', warning: 'The tide reverses. A drowned crown awaits you.', dialogue: ['Do you hear the choir? They sang as the water rose.', 'I promised them a kingdom without an end. The sea was the only god that answered.', 'Breathe while you can. The next verse belongs to me.'] },
  frostkeep: { name: 'The Frostbound Queen', seal: 'frost', color: '#b4e6f0', arena: 'The Palace of Still Hours', epithet: 'SHE WHO FROZE THE DAWN', warning: 'The frost forms a crown. Her court has opened.', dialogue: ['Warmth. I had almost forgotten its arrogance.', 'I froze one moment to save the people I loved. A thousand winters followed.', 'You would break my stillness? Then shatter with it.'] },
  dynasty: { name: 'The Sun-Eaten Pharaoh', seal: 'sand', color: '#dfbd83', arena: 'The Sepulchre of the Buried Sun', epithet: 'THE LAST NAME OF THE DYNASTY', warning: 'The tomb exhales. The buried king demands an audience.', dialogue: ['You carry no tribute. Only a weapon and a borrowed name.', 'My priests buried the sun to grant me eternity. Even the sand learned to kneel.', 'Kneel with it. Or become the dust beneath my throne.'] },
  astral: { name: 'The Starless Oracle', seal: 'astral', color: '#c6acf0', arena: 'The Observatory at the End', epithet: 'WITNESS TO THE FINAL SKY', warning: 'Every star goes still. Your future has been seen.', dialogue: ['I have watched this meeting end a thousand different ways.', 'In every sky, a hero reaches for the last star. In every sky, the star reaches back.', 'Show me something I have not foreseen.'] },
};
export const sealDropChance = (floor: number) => Math.min(.12, .06 + Math.max(0, Math.floor(floor / 3) - 1) * .005);
export function rollBossReward(floor: number, random: () => number = Math.random) {
  const tier = Math.max(1, Math.floor(floor / 3));
  return { tier, gold: integer(25, 45, random) + Math.min(160, tier * 10), shards: integer(70, 110, random) + Math.min(400, tier * 30), xp: 130 + Math.min(360, tier * 45), points: random() < .15 ? 1 : 0, seal: random() < sealDropChance(floor), charm: (['fang', 'lantern', 'pearl'] as CharmId[])[integer(0, 2, random)] };
}