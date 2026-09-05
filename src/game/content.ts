import type { HeroProgress } from '../progression';

export type DungeonId = 'crypt' | 'foundry' | 'hollows' | 'drowned' | 'frostkeep' | 'dynasty' | 'astral';
export type EnemyKind = 'skeleton' | 'wraith' | 'brute' | 'bat' | 'slime' | 'goblin' | 'spider' | 'archer' | 'imp' | 'shroom' | 'sentinel' | 'boss';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type BoostId = 'vigor' | 'endless' | 'renewal' | 'fortune' | 'haste' | 'ironhide' | 'clarity' | 'fervor' | 'scholar' | 'magnet';
export type BoostState = Record<BoostId, number>;

export const emptyBoosts = (): BoostState => ({ vigor: 0, endless: 0, renewal: 0, fortune: 0, haste: 0, ironhide: 0, clarity: 0, fervor: 0, scholar: 0, magnet: 0 });
export const boosts = [
  { id: 'vigor' as const, name: 'Vigor Tonic', price: 90, color: '#9ebd70', icon: 'bolt' as const, duration: 300, description: '+50% maximum stamina and double stamina regeneration.', effect: 'MORE STAMINA' },
  { id: 'endless' as const, name: 'Endless Breath', price: 220, color: '#86cfc0', icon: 'infinity' as const, duration: 300, description: 'Unlimited movement stamina. Mana and ritual health costs still apply.', effect: 'INFINITE STAMINA' },
  { id: 'renewal' as const, name: 'Bloodroot Elixir', price: 140, color: '#d68d78', icon: 'heart' as const, duration: 300, description: 'Regenerate 2 health every second, even during combat.', effect: 'HEALTH REGENERATION' },
  { id: 'fortune' as const, name: "Prospector's Luck", price: 180, color: '#d7b469', icon: 'coin' as const, duration: 300, description: 'Double collected gold. Does not affect Soul Shards or rare-drop chances.', effect: 'DOUBLE GOLD' },
  { id: 'haste' as const, name: 'Windrunner Oil', price: 120, color: '#9ecfc3', icon: 'sprint' as const, duration: 300, description: 'Move 20% faster and recover your dodge 25% sooner.', effect: 'SPEED & EVASION' },
  { id: 'ironhide' as const, name: 'Ironhide Draught', price: 175, color: '#bdbba4', icon: 'shield' as const, duration: 300, description: 'Reduce incoming attack and trap damage by 20%. Ritual offerings are unchanged.', effect: 'DAMAGE RESISTANCE' },
  { id: 'clarity' as const, name: 'Moonwell Essence', price: 150, color: '#a9bce2', icon: 'gem' as const, duration: 300, description: 'Double Mana, Focus, Fury, and Soul Energy regeneration. No effect on blood costs.', effect: 'ENERGY RECOVERY' },
  { id: 'fervor' as const, name: 'Battle Fervor', price: 240, color: '#dca082', icon: 'sword' as const, duration: 300, description: 'Primary attacks are 20% faster and all outgoing damage increases by 20%.', effect: 'ATTACK SPEED & POWER' },
  { id: 'scholar' as const, name: 'Sage\'s Ink', price: 200, color: '#c1a9d6', icon: 'crown' as const, duration: 300, description: 'Earn 35% more hero XP from combat, exploration, and mastery caches.', effect: 'BONUS EXPERIENCE' },
  { id: 'magnet' as const, name: 'Wayfinder Lantern', price: 75, color: '#d5c392', icon: 'flame' as const, duration: 300, description: 'A wider torchlight and more than twice the coin-pickup radius. No extra currency is created.', effect: 'LIGHT & LOOT REACH' },
];

export const chestRarities: Record<Rarity, { name: string; color: string; dark: string; gold: [number, number]; shards: [number, number]; heal: number; weight: number; reward: string }> = {
  common: { name: 'Common', color: '#aaa899', dark: '#594b36', gold: [3, 12], shards: [0, 0], heal: 12, weight: 50, reward: 'A handful of gold OR supplies OR a little hero experience.' },
  uncommon: { name: 'Uncommon', color: '#94c177', dark: '#344a2e', gold: [10, 24], shards: [0, 0], heal: 20, weight: 29, reward: 'Modest gold, healing, or hero mastery. Currency is not guaranteed.' },
  rare: { name: 'Rare', color: '#76b5e3', dark: '#263e5a', gold: [22, 45], shards: [15, 40], heal: 35, weight: 15, reward: 'A chance at Soul Shards, attribute points, boosts, or a run-only charm.' },
  epic: { name: 'Epic', color: '#bc8aec', dark: '#48305c', gold: [45, 80], shards: [60, 140], heal: 60, weight: 5, reward: 'Rare mastery, powerful supplies, temporary relics, or a cache of Soul Shards.' },
  legendary: { name: 'Legendary', color: '#f4bd5f', dark: '#75502a', gold: [90, 160], shards: [240, 500], heal: 9999, weight: 1, reward: 'The best chance at large shard drops. May instead contain mastery or rare supplies.' },
};

export function rollRarity(random = Math.random()): Rarity {
  let threshold = random * 100;
  for (const rarity of Object.keys(chestRarities) as Rarity[]) {
    threshold -= chestRarities[rarity].weight;
    if (threshold < 0) return rarity;
  }
  return 'legendary';
}

export const enemies: Record<EnemyKind, { name: string; hp: number; speed: number; damage: number; color: string; gold: number; behavior: string }> = {
  skeleton: { name: 'Bonewalker', hp: 42, speed: 34, damage: 9, color: '#bab398', gold: 5, behavior: 'A relentless melee pursuer.' },
  wraith: { name: 'Hollow Wraith', hp: 37, speed: 31, damage: 9, color: '#85bcaf', gold: 7, behavior: 'Keeps its distance and hurls soul bolts.' },
  brute: { name: 'Crypt Brute', hp: 90, speed: 25, damage: 16, color: '#a5a486', gold: 11, behavior: 'Slow, heavily armored, and hard to push back.' },
  bat: { name: 'Gloom Bat', hp: 20, speed: 65, damage: 5, color: '#b89acc', gold: 3, behavior: 'Swoops in irregular arcs and ignores ground hazards.' },
  slime: { name: 'Mire Slime', hp: 48, speed: 24, damage: 7, color: '#99c865', gold: 5, behavior: 'Hops forward and splits into two small slimes.' },
  goblin: { name: 'Dagger Goblin', hp: 32, speed: 52, damage: 8, color: '#a9b978', gold: 8, behavior: 'Circles its prey before a quick dagger lunge.' },
  spider: { name: 'Venom Widow', hp: 29, speed: 48, damage: 6, color: '#b5a778', gold: 5, behavior: 'Spits venom that slows your movement.' },
  archer: { name: 'Hollow Archer', hp: 33, speed: 30, damage: 11, color: '#bca777', gold: 7, behavior: 'Retreats, takes aim, and releases a fast arrow.' },
  imp: { name: 'Cinder Imp', hp: 30, speed: 43, damage: 8, color: '#e69b59', gold: 6, behavior: 'Fires a three-bolt fan and thrives in lava.' },
  shroom: { name: 'Sporeling', hp: 44, speed: 20, damage: 7, color: '#7fcfb3', gold: 6, behavior: 'Releases a ring of toxic spores when threatened.' },
  sentinel: { name: 'Basalt Sentinel', hp: 105, speed: 23, damage: 18, color: '#d08d58', gold: 14, behavior: 'Telegraphs a crushing charge. Dodge out of its path.' },
  boss: { name: 'Dungeon Guardian', hp: 480, speed: 30, damage: 23, color: '#d18b57', gold: 35, behavior: 'A two-phase guardian every third floor. Rare loot is guaranteed; a seal is not.' },
};

export interface Dungeon {
  id: DungeonId; name: string; subtitle: string; description: string; image: string; color: string;
  roster: EnemyKind[]; floors: string[]; hazard: 'lava' | 'poison' | 'water' | 'ice' | 'sand' | 'void';
  palette: { floor: string[]; seam: string; edge: string; wall: string; wallTop: string; moss: string; torch: string; torchCore: string; light: string; ambient: string; hazard: string[] };
}

export const dungeons: Dungeon[] = [
  { id: 'crypt', name: 'The Forsaken Halls', subtitle: 'THE ORIGINAL DESCENT', description: 'Ancient stone, restless bones, and things that stir between the torchlights.', image: '/images/dungeon-gate.png', color: '#c9ab73', roster: ['skeleton', 'bat', 'goblin', 'slime', 'archer', 'spider', 'wraith', 'brute'], floors: ['The Forsaken Halls', 'The Hollow Crypts', 'The Bone Reliquary', 'The Sunken Sanctum', 'The Throne of Ash'], hazard: 'lava', palette: { floor: ['#292b24', '#242820', '#2d2d26', '#272b24'], seam: '#171e1b', edge: '#383a2d', wall: '#45443a', wallTop: '#66604a', moss: '#465032', torch: '#e4973b', torchCore: '#ffe9a3', light: 'rgba(217,116,31,0.14)', ambient: 'rgba(3,8,6,0.78)', hazard: ['#9e3b16', '#d56722', '#f0aa38', '#ffc25a'] } },
  { id: 'foundry', name: 'The Ember Foundry', subtitle: 'ASH, IRON & LIVING FIRE', description: 'Cross molten channels, dodge roaring vents, and break the forge-born ranks.', image: '/images/ember-foundry.png', color: '#e59c66', roster: ['imp', 'goblin', 'bat', 'sentinel', 'archer', 'skeleton', 'brute'], floors: ['The Ember Foundry', 'The Cinderworks', 'The Molten Veins', 'The Black Anvil', 'The Throne of Ash'], hazard: 'lava', palette: { floor: ['#322824', '#2c2221', '#382a26', '#302724'], seam: '#1b1516', edge: '#514035', wall: '#514039', wallTop: '#775343', moss: '#764737', torch: '#f47e37', torchCore: '#ffe0a0', light: 'rgba(247,90,24,0.2)', ambient: 'rgba(13,4,4,0.72)', hazard: ['#b33318', '#e26623', '#ffb542', '#ffdb70'] } },
  { id: 'hollows', name: 'The Mycelium Hollows', subtitle: 'SOMETHING BELOW IS GROWING', description: 'Follow the glow of living spores through poisonous pools and overgrown ruins.', image: '/images/mycelium-hollows.png', color: '#89c6ae', roster: ['shroom', 'slime', 'spider', 'bat', 'goblin', 'wraith', 'archer'], floors: ['The Mycelium Hollows', 'The Spore Gardens', 'The Drowned Roots', 'The Verdant Sepulchre', 'The Throne of Ash'], hazard: 'poison', palette: { floor: ['#20352b', '#23362e', '#20312c', '#283c32'], seam: '#10201b', edge: '#3c5541', wall: '#355044', wallTop: '#527b60', moss: '#69a16a', torch: '#58c6a4', torchCore: '#c9ffca', light: 'rgba(48,214,151,0.17)', ambient: 'rgba(2,13,10,0.73)', hazard: ['#245d35', '#388247', '#85c464', '#b7dc82'] } },
  { id: 'drowned', name: 'The Drowned Abbey', subtitle: 'THE DEPTHS HAVE TEETH', description: 'Shark breaches, crushing currents, and whirlpools haunt a cathedral beneath the tide.', image: '/images/drowned-abbey.png', color: '#8bc9d6', roster: ['wraith', 'slime', 'goblin', 'archer', 'spider', 'brute'], floors: ['The Drowned Abbey', 'The Saltwater Nave', 'The Leviathan Choir', 'The Undertow Cloister', 'The Sunken Crown'], hazard: 'water', palette: { floor: ['#23333c', '#263842', '#20323b', '#293f46'], seam: '#13212b', edge: '#405a64', wall: '#405965', wallTop: '#62848d', moss: '#457f75', torch: '#64c7db', torchCore: '#cceef1', light: 'rgba(58,168,218,.17)', ambient: 'rgba(3,10,21,.7)', hazard: ['#173f56', '#225c73', '#3c9ab4', '#8cd7df'] } },
  { id: 'frostkeep', name: 'The Glassfrost Keep', subtitle: 'WINTER WITHOUT END', description: 'Jagged glacial caves and broken ice bridges. Falling crystals announce the Frostbound Queen.', image: '/images/frost-biome.svg', color: '#a6d8e7', roster: ['wraith', 'sentinel', 'bat', 'archer', 'brute', 'slime'], floors: ['The Glassfrost Keep', 'The Frozen Galleries', 'The Shattered Crown', 'The Pale Expanse'], hazard: 'ice', palette: { floor: ['#263846', '#293c48', '#2b404e', '#263f4b'], seam: '#142936', edge: '#547789', wall: '#415f72', wallTop: '#83b7c6', moss: '#6e9eae', torch: '#93d9ed', torchCore: '#e4ffff', light: 'rgba(113,204,239,.17)', ambient: 'rgba(5,14,31,.65)', hazard: ['#214e6b', '#387993', '#91ccdf', '#c9f1fb'] } },
  { id: 'dynasty', name: 'The Sunken Dynasty', subtitle: 'WHAT THE SANDS REMEMBER', description: 'Wide burial halls, winding tombs, quicksand, and dart-lined passages beneath a fallen kingdom.', image: '/images/dunes-biome.svg', color: '#dcb786', roster: ['goblin', 'spider', 'archer', 'skeleton', 'sentinel', 'brute'], floors: ['The Sunken Dynasty', 'The Obsidian Tombs', 'The Hall of Jackals', 'The Golden Sepulchre'], hazard: 'sand', palette: { floor: ['#453829', '#4a3b2b', '#3f3528', '#483b2c'], seam: '#2b241b', edge: '#796046', wall: '#746047', wallTop: '#b28b5c', moss: '#93704b', torch: '#e5a559', torchCore: '#ffe1a4', light: 'rgba(227,156,72,.14)', ambient: 'rgba(24,13,5,.66)', hazard: ['#63442b', '#95663a', '#be9454', '#e7c187'] } },
  { id: 'astral', name: 'The Astral Rift', subtitle: 'BEYOND THE LAST STAR', description: 'Circular observatories and narrow star-bridges suspended over a shifting, gravitational abyss.', image: '/images/astral-biome.svg', color: '#c4acec', roster: ['wraith', 'imp', 'sentinel', 'bat', 'shroom', 'archer'], floors: ['The Astral Rift', 'The Broken Orrery', 'The Nameless Star', 'The Event Horizon'], hazard: 'void', palette: { floor: ['#302c43', '#302b41', '#383049', '#2f3047'], seam: '#1b182d', edge: '#665477', wall: '#594864', wallTop: '#a087b8', moss: '#877193', torch: '#be8fe6', torchCore: '#f0d9ff', light: 'rgba(174,111,228,.17)', ambient: 'rgba(12,4,26,.7)', hazard: ['#1d142f', '#44275c', '#8e5db2', '#d2a3ee'] } },
];

export interface RunLoadout { dungeon: DungeonId; activeBoosts: BoostState; heroProgress: HeroProgress; }