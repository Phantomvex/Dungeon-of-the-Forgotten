import { boosts, dungeons, emptyBoosts, type BoostState, type DungeonId } from './game/content';
import { freshHero, grantExperience, normalizeHero, type HeroProgressMap } from './progression';

export type CharacterId = 'knight' | 'rogue' | 'mage' | 'paladin' | 'frost' | 'ranger' | 'berserker' | 'storm' | 'plague' | 'reaper' | 'warden' | 'monk' | 'oracle' | 'phantom' | 'killison' | 'tidecaller' | 'duneblade' | 'frostguard' | 'seraph' | 'malachar';
export type Action = 'up' | 'down' | 'left' | 'right' | 'attack' | 'special' | 'dodge' | 'interact' | 'map' | 'sprint' | 'extra1' | 'extra2' | 'extra3' | 'extra4' | 'seal' | 'inventory';
export type AttackStyle = 'slash' | 'daggers' | 'fire' | 'ice' | 'arrow' | 'lightning' | 'poison' | 'fists' | 'arcane' | 'shadow';

export interface Character {
  id: CharacterId; name: string; short: string; role: string; color: string; image: string; portrait?: number;
  hp: number; stamina: number; speed: number; damage: number; cooldown: number; attackRate: number;
  style: AttackStyle; price: number; armor: number; description: string;
  passive: string; passiveText: string; attack: string; attackText: string; special: string; specialText: string;
  weapon: string; weaponType: string; attributes: number[];
}

export interface Settings {
  sound: boolean;
  music: number;
  sfx: number;
  chiptune: boolean;
  scanlines: boolean;
  crt: boolean;
  shake: number;
  bindings: Record<Action, string>;
}

export const defaultSettings: Settings = {
  sound: true, music: 35, sfx: 65, chiptune: false,
  scanlines: true, crt: false, shake: 55,
  bindings: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', attack: 'KeyJ', special: 'KeyQ', dodge: 'Space', interact: 'KeyE', map: 'KeyM', sprint: 'ShiftLeft', extra1: 'KeyR', extra2: 'KeyF', extra3: 'KeyC', extra4: 'KeyX', seal: 'KeyV', inventory: 'KeyB' },
};

export const characters: Character[] = [
  {
    id: 'knight' as const, name: 'The Iron Knight', short: 'Iron Knight', role: 'TANK / MELEE', color: '#d5aa62',
    image: '/images/iron-knight.png', hp: 120, speed: 78, damage: 28, cooldown: 6,
    stamina: 110, attackRate: .42, style: 'slash', price: 0, armor: .15,
    description: 'An unbroken oath. An unyielding blade. Stand your ground when the darkness closes in.',
    passive: 'Heavy Armor', passiveText: 'Take 15% less physical damage. Some burdens are worth carrying.',
    attack: 'Broadsword Slash', attackText: 'A sweeping melee arc that drives nearby enemies back.',
    special: 'Shield Bash', specialText: 'Charge forward, smash barricades, and stun enemies for 2 seconds.',
    weapon: 'Oathkeeper', weaponType: 'BROADSWORD',
    attributes: [5, 2, 4],
  },
  {
    id: 'rogue' as const, name: 'The Shadow Blade', short: 'Shadow Blade', role: 'AGILITY / ASSASSIN', color: '#b09bcf',
    image: '/images/shadow-blade.png', hp: 85, speed: 93.6, damage: 19, cooldown: 4.5,
    stamina: 120, attackRate: .2, style: 'daggers', price: 0, armor: 0,
    description: 'A whisper in the dark. A flash of cold steel. They will never hear you coming.',
    passive: 'Fleet Footed', passiveText: 'Move 20% faster. Your footsteps make no sound.',
    attack: 'Twin Daggers', attackText: 'Lightning-fast dual strikes with a 30% critical hit chance.',
    special: 'Shadow Step', specialText: 'Blink behind your target. Your next attack deals double damage.',
    weapon: 'Whisper & Wraith', weaponType: 'TWIN DAGGERS',
    attributes: [2, 5, 4],
  },
  {
    id: 'mage' as const, name: 'The Flame Weaver', short: 'Flame Weaver', role: 'RANGED / MAGE', color: '#e18b53',
    image: '/images/flame-weaver.png', hp: 80, speed: 78, damage: 23, cooldown: 7,
    stamina: 100, attackRate: .35, style: 'fire', price: 0, armor: 0,
    description: 'The last light in a forgotten world. Let the old darkness learn to fear the flame.',
    passive: 'Arcane Resonance', passiveText: 'Slain enemies release mana embers that recharge your special ability.',
    attack: 'Firebolt', attackText: 'Hurl a piercing fireball that sets enemies ablaze.',
    special: 'Flame Nova', specialText: 'An expanding ring of fire knocks enemies back and destroys hostile projectiles.',
    weapon: 'Cinderbranch', weaponType: 'EMBER STAFF',
    attributes: [2, 3, 5],
  },
  { id: 'paladin', name: 'The Sun Paladin', short: 'Sun Paladin', role: 'TANK / HOLY', color: '#e1cd87', image: '/images/hero-atlas.png', portrait: 0, hp: 140, stamina: 105, speed: 75, damage: 31, cooldown: 8, attackRate: .46, style: 'slash', price: 45, armor: .2,
    description: 'A sacred oath carried into an unholy place.', passive: 'Blessed Steel', passiveText: '20% physical damage resistance. Every kill restores 3 health.', attack: 'Dawnblade', attackText: 'A broad, radiant sword sweep that drives the darkness back.', special: 'Consecration', specialText: 'Smite nearby enemies for 85 damage and restore 35 health.', weapon: 'Dawnbringer', weaponType: 'HOLY BLADE', attributes: [5, 2, 4] },
  { id: 'frost', name: 'The Frost Witch', short: 'Frost Witch', role: 'RANGED / FROST', color: '#9bcbe5', image: '/images/hero-atlas.png', portrait: 1, hp: 85, stamina: 120, speed: 80, damage: 25, cooldown: 7, attackRate: .42, style: 'ice', price: 55, armor: 0,
    description: 'Her winter has no end. Neither does her resolve.', passive: 'Permafrost', passiveText: 'Every ice shard chills its target, slowing movement by 45%.', attack: 'Ice Shard', attackText: 'A piercing lance of ice that chills enemies in its path.', special: 'Deep Freeze', specialText: 'Freeze surrounding enemies for 3 seconds and shatter them for 65 damage.', weapon: 'Winterthorn', weaponType: 'FROST STAFF', attributes: [2, 3, 5] },
  { id: 'ranger', name: 'The Wild Ranger', short: 'Wild Ranger', role: 'RANGED / PRECISION', color: '#acc783', image: '/images/hero-atlas.png', portrait: 2, hp: 95, stamina: 130, speed: 90, damage: 29, cooldown: 5, attackRate: .34, style: 'arrow', price: 50, armor: 0,
    description: 'No trail is too dark. No target is too far.', passive: "Hunter's Instinct", passiveText: 'Arrows have a 25% critical chance. Your torch reveals more of the dungeon.', attack: 'Longbow Shot', attackText: 'A fast, long-range arrow that pierces two enemies.', special: 'Thorn Volley', specialText: 'Release seven piercing arrows in a wide fan.', weapon: 'Wildsong', weaponType: 'LONGBOW', attributes: [3, 4, 4] },
  { id: 'berserker', name: 'The Blood Berserker', short: 'Berserker', role: 'MELEE / FURY', color: '#d9937b', image: '/images/hero-atlas.png', portrait: 3, hp: 145, stamina: 110, speed: 83, damage: 39, cooldown: 8, attackRate: .45, style: 'slash', price: 65, armor: .05,
    description: 'The only way out is through everything in his path.', passive: 'Blood Fury', passiveText: 'Below half health, primary attacks deal 50% more damage.', attack: 'Twin Axe Cleave', attackText: 'A brutal, wide cleave with heavy knockback.', special: 'Bloodrage', specialText: 'For 6 seconds, attack twice as fast and ignore incoming damage.', weapon: 'Ruin & Reckoning', weaponType: 'TWIN AXES', attributes: [4, 3, 5] },
  { id: 'storm', name: 'The Storm Caller', short: 'Storm Caller', role: 'RANGED / LIGHTNING', color: '#93c5e9', image: '/images/hero-atlas.png', portrait: 4, hp: 85, stamina: 115, speed: 85, damage: 26, cooldown: 7, attackRate: .4, style: 'lightning', price: 75, armor: 0,
    description: 'Thunder does not ask permission to enter.', passive: 'Static Conduit', passiveText: 'Lightning jumps from its first target to up to two nearby foes.', attack: 'Chain Spark', attackText: 'Fire a swift bolt of chaining lightning.', special: 'Tempest', specialText: 'Call down lightning on every nearby enemy for 95 damage and a brief stun.', weapon: 'Skybreaker', weaponType: 'STORM STAFF', attributes: [2, 4, 5] },
  { id: 'plague', name: 'The Plague Doctor', short: 'Plague Doctor', role: 'RANGED / ALCHEMY', color: '#b6c37b', image: '/images/hero-atlas.png', portrait: 5, hp: 100, stamina: 110, speed: 80, damage: 21, cooldown: 7, attackRate: .36, style: 'poison', price: 70, armor: .05,
    description: 'A cure for the living. A reckoning for the rest.', passive: 'Toxic Immunity', passiveText: 'Immune to poison pools and venom slow. Poison attacks linger for 5 seconds.', attack: 'Venom Flask', attackText: 'A piercing vial that poisons enemies for lingering damage.', special: 'Miasma', specialText: 'Create a 5-second toxic cloud that repeatedly damages and slows enemies.', weapon: 'Last Remedy', weaponType: 'ALCHEMIST VIAL', attributes: [3, 3, 4] },
  { id: 'reaper', name: 'The Blood Reaper', short: 'Blood Reaper', role: 'MELEE / VAMPIRIC', color: '#cd8495', image: '/images/hero-atlas.png', portrait: 6, hp: 110, stamina: 115, speed: 87, damage: 35, cooldown: 6, attackRate: .38, style: 'slash', price: 90, armor: .05,
    description: 'He does not fear the end. He carries it.', passive: 'Soul Drinker', passiveText: 'Dealing direct damage restores 8% of damage dealt as health.', attack: 'Crimson Harvest', attackText: 'A sweeping scythe strike with exceptional reach.', special: 'Reap', specialText: 'Drain enemies around you for 100 damage. Heal for each enemy struck.', weapon: 'Red Oblivion', weaponType: 'BLOOD SCYTHE', attributes: [4, 4, 5] },
  { id: 'warden', name: 'The Stone Warden', short: 'Stone Warden', role: 'TANK / EARTH', color: '#b4b58d', image: '/images/hero-atlas.png', portrait: 7, hp: 180, stamina: 130, speed: 68, damage: 44, cooldown: 8, attackRate: .6, style: 'slash', price: 80, armor: .3,
    description: 'Mountains fall. The Warden remains.', passive: 'Living Granite', passiveText: 'Take 30% less physical damage. The heaviest armor in the mortal roster.', attack: 'Granite Hammer', attackText: 'A crushing hammer swing that sends enemies reeling.', special: 'Earthshatter', specialText: 'A devastating ground slam deals 125 damage, stuns foes, and breaks barricades.', weapon: 'Worldweight', weaponType: 'STONE HAMMER', attributes: [5, 1, 5] },
  { id: 'monk', name: 'The Jade Monk', short: 'Jade Monk', role: 'AGILITY / MARTIAL', color: '#a4d1ac', image: '/images/hero-atlas.png', portrait: 8, hp: 105, stamina: 150, speed: 95, damage: 18, cooldown: 4.5, attackRate: .17, style: 'fists', price: 60, armor: .1,
    description: 'Stillness in the heart. A storm in the hands.', passive: 'Inner Balance', passiveText: 'Stamina regenerates 50% faster. Dodging costs only 12 stamina.', attack: 'Jade Fists', attackText: 'Rapid, close-range strikes with a 20% critical chance.', special: 'Dragon Rush', specialText: 'Charge through foes, striking and stunning everything in your path.', weapon: 'Hands of Heaven', weaponType: 'JADE GAUNTLETS', attributes: [3, 5, 4] },
  { id: 'oracle', name: 'The Astral Oracle', short: 'Astral Oracle', role: 'RANGED / COSMIC', color: '#c9a4e1', image: '/images/hero-atlas.png', portrait: 9, hp: 90, stamina: 140, speed: 84, damage: 32, cooldown: 8, attackRate: .48, style: 'arcane', price: 110, armor: 0,
    description: 'She has seen your ending. She would like to change it.', passive: 'Astral Echo', passiveText: 'Every primary attack releases two piercing cosmic bolts.', attack: 'Starfall', attackText: 'Twin arcs of astral energy pierce the darkness.', special: 'Gravity Well', specialText: 'A 5-second singularity pulls enemies inward and repeatedly damages them.', weapon: 'The Ninth Star', weaponType: 'ASTRAL ORB', attributes: [2, 4, 5] },
  { id: 'phantom', name: 'The Phantom', short: 'The Phantom', role: 'ADMIN / SHADOW SOVEREIGN', color: '#c5a2ff', image: '/images/phantom.png', hp: 3000, stamina: 9999, speed: 150, damage: 350, cooldown: 2, attackRate: .16, style: 'shadow', price: -1, armor: .95,
    description: 'Not a hero. The reason the darkness is afraid. A smaller vessel. The same impossible power.', passive: 'Beyond Mortality', passiveText: '3,000 base HP. 95% damage resistance, infinite stamina, rapid regeneration, and shadow afterimages.', attack: 'Void Reap', attackText: 'Three enormous piercing shadow blades. 350 damage each. No mercy.', special: 'Shadow Rift', specialText: 'Tear open the void: 1,200 area damage, a 4-second stun, and total projectile annihilation.', weapon: 'The End of Everything', weaponType: 'VOID SCYTHE', attributes: [5, 5, 5] },
  { id: 'killison', name: 'Killison', short: 'Killison', role: 'MYTHIC / RITUAL DEMON', color: '#e49c97', image: '/images/killison.png', hp: 260, stamina: 150, speed: 96, damage: 72, cooldown: 8, attackRate: .35, style: 'slash', price: 10000, armor: .35,
    description: 'The altar was never empty. It was waiting for him. Blood is the price. Ruin is the answer.', passive: 'Demonic Hunger', passiveText: '35% physical resistance. Direct attacks steal 15% life. Ritual powers consume your health instead of Mana.', attack: 'Hellglaive', attackText: 'A savage, long-reaching glaive combo. The third strike erupts in crimson flame.', special: 'Sacrificial Ascendance', specialText: 'Offer 12% maximum HP. Gain triple damage for 6 seconds and unleash a crimson shockwave.', weapon: 'The Blood Testament', weaponType: 'INFERNAL GLAIVE', attributes: [5, 4, 5] },
  { id: 'tidecaller', name: 'The Tidecaller', short: 'Tidecaller', role: 'EPIC / OCEAN MAGE', color: '#89cfd2', image: '/images/awakened-heroes.svg', portrait: 0, hp: 150, stamina: 140, speed: 88, damage: 43, cooldown: 7, attackRate: .34, style: 'ice', price: 3800, armor: .1,
    description: 'The sea remembers every soul. She calls them home.', passive: 'Tideborn', passiveText: 'Water and ice do not slow you. Piercing tidal bolts chill enemies.', attack: 'Tidal Lance', attackText: 'A swift piercing lance of seawater chills targets.', special: 'Undertow', specialText: 'A six-second whirlpool pulls enemies inward and crushes them repeatedly.', weapon: 'Pearl of the Deep', weaponType: 'TIDAL TRIDENT', attributes: [3, 4, 5] },
  { id: 'duneblade', name: 'The Dune Blade', short: 'Dune Blade', role: 'EPIC / DESERT DUELIST', color: '#ddbb88', image: '/images/awakened-heroes.svg', portrait: 1, hp: 130, stamina: 160, speed: 105, damage: 46, cooldown: 5, attackRate: .25, style: 'daggers', price: 4500, armor: .12,
    description: 'One grain of sand. One thousand cuts.', passive: 'Sandstrider', passiveText: 'Ignore quicksand slowing. Dodging costs only 12 stamina. 30% critical-hit chance.', attack: 'Crescent Blades', attackText: 'Twin scimitars carve rapid, alternating critical strikes.', special: 'Mirage Dance', specialText: 'Become untouchable for three seconds and empower your next strike.', weapon: 'Sun & Sirocco', weaponType: 'TWIN SCIMITARS', attributes: [3, 5, 5] },
  { id: 'frostguard', name: 'The Glacier Sentinel', short: 'Glacier Sentinel', role: 'LEGENDARY / ICE TANK', color: '#addce9', image: '/images/awakened-heroes.svg', portrait: 2, hp: 240, stamina: 165, speed: 76, damage: 60, cooldown: 8, attackRate: .48, style: 'slash', price: 7200, armor: .4,
    description: 'A winter fortress with a heartbeat.', passive: 'Glacial Plate', passiveText: '40% physical resistance. Immune to ice slowing. Every hammer hit briefly chills enemies.', attack: 'Icebreaker', attackText: 'A heavy hammer combo with a crushing third strike.', special: 'Avalanche', specialText: 'Smash the ground for 180 damage and freeze nearby enemies for three seconds.', weapon: 'Winter\'s Verdict', weaponType: 'GLACIAL HAMMER', attributes: [5, 2, 5] },
  { id: 'seraph', name: 'The Fallen Seraph', short: 'Fallen Seraph', role: 'MYTHIC / CELESTIAL', color: '#d9c2ee', image: '/images/awakened-heroes.svg', portrait: 3, hp: 520, stamina: 195, speed: 106, damage: 144, cooldown: 7, attackRate: .3, style: 'arcane', price: 18000, armor: .4,
    description: 'Cast out of heaven. Nothing below can hold her.', passive: 'Divine Remnant', passiveText: 'Twice Killison\'s base HP and damage. Twin astral bolts. Defeating enemies restores 10 health.', attack: 'Fallen Stars', attackText: 'Two piercing lances of starlight tear through the battlefield.', special: 'Heavenfall', specialText: 'Smite the chamber for 350 damage, briefly stun foes, and heal 15% maximum HP.', weapon: 'The Broken Halo', weaponType: 'CELESTIAL BLADE', attributes: [5, 5, 5] },
  { id: 'malachar', name: 'Malachar, World Eater', short: 'Malachar', role: 'MYTHIC / ABYSSAL GOD', color: '#e5a28e', image: '/images/awakened-heroes.svg', portrait: 4, hp: 780, stamina: 240, speed: 110, damage: 216, cooldown: 7, attackRate: .32, style: 'slash', price: 30000, armor: .5,
    description: 'Killison learned the ritual. Malachar wrote it.', passive: 'World Eater', passiveText: 'Three times Killison\'s base HP and damage. 50% physical resistance. Direct hits steal 18% life.', attack: 'Ruin Cleaver', attackText: 'An enormous cleaver sweeps through enemies. The finishing strike ignites them.', special: 'Crimson Eclipse', specialText: 'Offer 12% maximum HP. Gain triple damage for six seconds and erupt for 510 area damage.', weapon: 'The Last Horizon', weaponType: 'ABYSSAL CLEAVER', attributes: [5, 5, 5] },
];

const recruitmentPrices: Partial<Record<CharacterId, number>> = { paladin: 450, frost: 650, ranger: 500, berserker: 850, storm: 1200, plague: 1000, reaper: 1800, warden: 1500, monk: 750, oracle: 2700 };
characters.forEach(hero => { hero.price = recruitmentPrices[hero.id] ?? hero.price; });

export interface RunRecord {
  id: string;
  character: CharacterId;
  floor: number;
  kills: number;
  gold: number;
  seconds: number;
  outcome: 'fallen' | 'retreated';
  date: string;
  dungeon?: DungeonId;
  shards?: number;
  chests?: number;
  heroLevel?: number;
  xpEarned?: number;
  bosses?: number;
}

export interface Progress {
  version: 5;
  runs: RunRecord[];
  artifact: string | null;
  gold: number;
  shards: number;
  unlockedHeroes: CharacterId[];
  inventory: BoostState;
  activeBoosts: BoostState;
  heroes: HeroProgressMap;
  clearedBiomes: DungeonId[];
}

export const freshHeroMap = (): HeroProgressMap => Object.fromEntries(characters.map(hero => [hero.id, freshHero()])) as HeroProgressMap;
export const freshProgress = (): Progress => ({ version: 5, runs: [], artifact: null, gold: 0, shards: 0, unlockedHeroes: ['knight', 'rogue', 'mage'], inventory: emptyBoosts(), activeBoosts: emptyBoosts(), heroes: freshHeroMap(), clearedBiomes: [] });
export const ownsHero = (progress: Progress, hero: Character, admin = false) => hero.id === 'phantom' ? admin : hero.price === 0 || progress.unlockedHeroes.includes(hero.id);

export const artifacts = [
  { id: 'emberheart', name: 'Emberheart', type: 'ANCIENT RELIC', icon: 'heart' as const, color: '#d89057', description: 'A coal that never cools, taken from the heart of a forgotten furnace. Begin each descent with 20 additional health.', effect: '+20 MAX HEALTH', requirement: 'Complete your first run', unlocked: (p: Progress) => p.runs.length >= 1 },
  { id: 'iron-sigil', name: 'Iron Sigil', type: 'FORGED TALISMAN', icon: 'shield' as const, color: '#b9bdac', description: 'The mark of a warrior who would not fall. All primary attacks deal 15% more damage.', effect: '+15% ATTACK DAMAGE', requirement: 'Defeat 20 enemies across your runs', unlocked: (p: Progress) => p.runs.reduce((n, r) => n + r.kills, 0) >= 20 },
  { id: 'lost-crown', name: 'Crown of the Lost', type: 'FORGOTTEN HEIRLOOM', icon: 'crown' as const, color: '#c7a65c', description: 'Its kingdom is dust, but its power remains. Your special ability recharges 25% faster.', effect: '-25% SPECIAL COOLDOWN', requirement: 'Reach the fifth floor', unlocked: (p: Progress) => p.runs.some(r => r.floor >= 5) },
];

export function normalizeSettings(value: unknown): Settings {
  const defaults = structuredClone(defaultSettings);
  try {
    const saved = value as Partial<Settings>;
    if (!saved || typeof saved !== 'object') return defaults;
    for (const key of ['sound', 'chiptune', 'scanlines', 'crt'] as const) if (typeof saved[key] === 'boolean') defaults[key] = saved[key];
    for (const key of ['music', 'sfx', 'shake'] as const) {
      const value = saved[key];
      if (typeof value === 'number' && Number.isFinite(value)) defaults[key] = Math.round(Math.max(0, Math.min(100, value)));
    }
    const actions = Object.keys(defaults.bindings) as Action[];
    const bindings = {} as Record<Action, string>;
    const used = new Set<string>();
    for (const action of actions) {
      const code = saved.bindings?.[action];
      if (typeof code === 'string' && code.length > 0 && code.length < 32 && !['Escape', 'Tab'].includes(code) && !used.has(code)) { bindings[action] = code; used.add(code); }
    }
    // Preserve older custom bindings when the new sprint or Phantom keys would collide.
    const fallbackKeys = Array.from({ length: 26 }, (_, index) => `Key${String.fromCharCode(65 + index)}`);
    for (const action of actions) if (!bindings[action]) {
      const code = !used.has(defaults.bindings[action]) ? defaults.bindings[action] : fallbackKeys.find(key => !used.has(key))!;
      bindings[action] = code; used.add(code);
    }
    defaults.bindings = bindings;
    return defaults;
  } catch { return defaults; }
}

export function loadSettings(): Settings {
  try { return normalizeSettings(JSON.parse(localStorage.getItem('forgotten-settings') || '{}')); }
  catch { return structuredClone(defaultSettings); }
}

export function migrateProgress(value: unknown): Progress {
  try {
    const saved = value as Partial<Omit<Progress, 'version'>> & { version?: number };
    if (!saved || typeof saved !== 'object') return freshProgress();
    const runs: RunRecord[] = Array.isArray(saved.runs) ? saved.runs.filter((entry: unknown): entry is RunRecord => {
      if (!entry || typeof entry !== 'object') return false;
      const run = entry as Partial<RunRecord>;
      return typeof run.id === 'string' && characters.some(c => c.id === run.character)
        && ['fallen', 'retreated'].includes(run.outcome || '')
        && [run.floor, run.kills, run.gold, run.seconds].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)
        && (run.floor || 0) >= 1 && typeof run.date === 'string' && Number.isFinite(Date.parse(run.date));
    }) : [];
    const safeNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value))) : 0;
    const inventory = emptyBoosts(), activeBoosts = emptyBoosts();
    boosts.forEach(boost => { inventory[boost.id] = Math.min(999, safeNumber(saved.inventory?.[boost.id])); activeBoosts[boost.id] = Math.min(18000, safeNumber(saved.activeBoosts?.[boost.id])); });
    const unlockedHeroes = characters.filter(c => c.price === 0 || (c.price > 0 && Array.isArray(saved.unlockedHeroes) && saved.unlockedHeroes.includes(c.id))).map(c => c.id);
    // Old saves had lifetime gold but no wallet. Credit that gold exactly once during migration.
    const gold = (saved.version || 0) >= 2 ? safeNumber(saved.gold) : runs.reduce((sum: number, run: RunRecord) => sum + run.gold, 0);
    const heroes = freshHeroMap();
    characters.forEach(hero => {
      if (saved.heroes?.[hero.id]) heroes[hero.id] = normalizeHero(saved.heroes[hero.id]);
      else if ((saved.version || 0) < 3) {
        const oldXp = runs.filter((run: RunRecord) => run.character === hero.id).reduce((sum: number, run: RunRecord) => sum + run.kills * 12 + Math.max(0, run.floor - 1) * 50, 0);
        heroes[hero.id] = grantExperience(heroes[hero.id], oldXp);
      }
    });
    const clearedBiomes = dungeons.filter(dungeon => Array.isArray(saved.clearedBiomes) && saved.clearedBiomes.includes(dungeon.id) || (saved.version || 0) < 5 && runs.some(run => run.dungeon === dungeon.id && ((run.bosses || 0) > 0 || run.floor > 3))).map(dungeon => dungeon.id);
    return { version: 5, runs, gold, shards: safeNumber(saved.shards), unlockedHeroes, inventory, activeBoosts, heroes, clearedBiomes, artifact: typeof saved.artifact === 'string' && artifacts.some(a => a.id === saved.artifact) ? saved.artifact : null };
  } catch { return freshProgress(); }
}

export function loadProgress(): Progress {
  for (const key of ['forgotten-progress', 'forgotten-manual-save', 'forgotten-progress-backup']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const saved = JSON.parse(raw);
      const progress = saved?.progress || saved;
      if (progress && typeof progress === 'object' && Array.isArray(progress.runs)) return migrateProgress(progress);
    } catch { /* A valid manual or rolling backup can recover a damaged autosave. */ }
  }
  return freshProgress();
}

export function keyLabel(code: string) {
  return code.replace('Key', '').replace('Digit', '').replace('Arrow', '').replace('Space', 'SPACE').replace('ShiftLeft', 'L SHIFT').replace('ShiftRight', 'R SHIFT');
}

export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}