import { characters, keyLabel, type Action, type AttackStyle, type Character, type CharacterId, type RunRecord, type Settings } from '../data';
import { boosts, chestRarities, dungeons, emptyBoosts, enemies as enemyDefinitions, rollRarity, type BoostId, type BoostState, type Dungeon, type EnemyKind, type Rarity, type RunLoadout } from './content';
import { abilitiesFor, type HeroAbility } from './abilities';
import { attributeCost, attributeRankCap, grantExperience, heroStats, normalizeHero, resourceFor, xpToNext, type Attribute, type HeroProgress } from '../progression';
import { bossProfiles, isBossFloor, nextBossFloor, rollBossReward, rollChestReward, runCharms, sealDefinitions, type BossSeal, type CharmId } from './rewards';
import { biomeTraps, drawTrap, trapDescriptions, updateTrap, type FloorTrap } from './traps';
import type { DungeonAudio } from './audio';
import { drawEnemy, drawHero, drawWeaponSwing } from './sprites';
import { createArena, createLayout, type Room } from './layout';
import { drawBoss, eliteProfiles } from './bosses';
import type { PartySession, GamePacket } from '../network/party';
import { nextBiome } from '../campaign';
import { drawWeather } from './weather';

const TILE = 16;
const COLS = 66;
const ROWS = 48;
const WIDTH = 640;
const HEIGHT = 360;
const rand = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

interface Enemy {
  id: number; type: EnemyKind; x: number; y: number;
  hp: number; maxHp: number; cooldown: number; stun: number; burn: number; burnTick: number;
  flash: number; vx: number; vy: number; phase: number; slow: number; windup: number; aim: number;
  elite: string | null; eliteColor: string; skillTime: number; pattern: number; targetX: number; targetY: number;
}
interface WorldObject {
  id: number; type: 'chest' | 'barrel' | 'chandelier' | 'barricade' | 'stairs' | 'portal' | 'onward' | 'coin' | 'ember' | 'blade' | 'urn' | 'brazier' | 'shrine' | 'vent' | 'seal';
  x: number; y: number; opened: boolean; hidden: boolean; value: number;
  vx: number; vy: number; fuse: number; hp: number; rarity: Rarity; seal?: BossSeal;
}
interface Projectile { x: number; y: number; vx: number; vy: number; life: number; friendly: boolean; hit: Set<number>; damage: number; style?: AttackStyle; color?: string; pierce?: number; chained?: boolean; delay?: number; owner?: 'guest' }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }
interface Effect { x: number; y: number; life: number; maxLife: number; type: 'slash' | 'nova' | 'blast' | 'smoke' | 'rift' | 'eclipse' | 'oblivion' | 'lightning' | 'mark'; angle: number; radius: number; color?: string; combo?: number; weapon?: CharacterId }
interface FloatText { x: number; y: number; life: number; text: string; color: string }
interface Zone { x: number; y: number; radius: number; life: number; tick: number; kind: 'poison' | 'gravity' | 'fire' | 'water'; damage?: number; hostile?: boolean; owner?: 'guest' }
interface DelayedCast { time: number; x: number; y: number; radius: number; damage: number; color: string; }
interface Swing { time: number; total: number; hit: boolean; angle: number; damage: number; range: number; combo: number; }
export interface LootNotice { id: number; rarity: Rarity; gold: number; shards: number; message: string; title?: string; xp?: number; points?: number; }

export interface GameHUD {
  hp: number; maxHp: number; floor: number; gold: number; kills: number;
  special: number; specialMax: number; dodge: number; seconds: number;
  hint: string; notice: string; floorName: string; floorTime: number;
  boss: { name: string; hp: number; maxHp: number; phase: number } | null;
  stamina: number; maxStamina: number; infiniteStamina: boolean; shards: number; dungeon: string;
  extra1: number; extra2: number; activeBoosts: BoostState; statuses: string[]; loot: LootNotice | null;
  heroProgress: HeroProgress; xpNext: number; energy: number; maxEnergy: number; resource: string; cooldowns: number[];
  nextBoss: number; bossDefeated: boolean; seals: BossSeal[]; equippedSeal: string | null; sealCooldown: number;
  charms: Partial<Record<CharmId, number>>; levelNotice: string; track: string;
  stage: 'dungeon' | 'intro' | 'boss' | 'cleared'; objective: string; biome: Dungeon['id']; elitesSlain: number;
  elite: { name: string; hp: number; maxHp: number; color: string } | null;
  party?: { name: string; hero: CharacterId; hp: number; maxHp: number; host: boolean; paused: boolean; bossReady: boolean; waiting: boolean };
}

interface Callbacks { onHUD: (hud: GameHUD) => void; onEnd: (run: RunRecord) => void; onPause: () => void; onLoot: (gold: number, shards: number, boost?: BoostId) => void; onBoosts: (boosts: BoostState) => void; onHeroProgress: (progress: HeroProgress) => void; onInventory: () => void; onBiomeClear: (biome: Dungeon['id']) => void }

const newPlayer = () => ({ x: 0, y: 0, hp: 120, maxHp: 120, stamina: 110, energy: 100, ascended: 0, ward: 0, facing: Math.PI / 2, invulnerable: 0, attack: 0, special: 0, dodge: 0, dash: 0, bash: false, empowered: false, moving: false, extra1: 0, extra2: 0, eclipse: 0, rage: 0, slow: 0 });
type HeroBody = ReturnType<typeof newPlayer>;
interface ActorState {
  player: HeroBody; character: Character; mastery: HeroProgress; abilities: HeroAbility[]; cooldowns: number[];
  artifact: string | null; activeBoosts: BoostState; runBoosts: BoostState; boostSaveTime: number;
  seals: BossSeal[]; equippedSeal: string | null; sealCooldown: number; charms: Partial<Record<CharmId, number>>;
  swings: Swing[]; followUps: { enemy: Enemy; damage: number; critical: boolean; time: number }[]; delayedCasts: DelayedCast[];
  combo: number; comboWindow: number; damageBuff: number; staminaDelay: number; hazardCooldown: number; footstepTime: number; ambienceTime: number;
  gold: number; shards: number; xpEarned: number; loot: LootNotice | null; lootTime: number; levelNotice: string; levelNoticeTime: number;
  keys: Set<string>; mouse: { x: number; y: number; active: boolean; down: boolean }; aim: { x: number; y: number } | null;
}
interface WorldSnapshot {
  revision: number; floor: number; elapsed: number; stage: GameHUD['stage']; name: string; tiles: number[]; rooms: Room[]; torches: { x: number; y: number }[];
  player: HeroBody; other: { player: HeroBody; hero: CharacterId; name: string }; enemies: Enemy[]; objects: WorldObject[];
  bullets: Omit<Projectile, 'hit'>[]; effects: Effect[]; particles: Particle[]; texts: FloatText[]; zones: Zone[]; traps: FloorTrap[]; explored: number[];
  hud: GameHUD; paused: boolean;
}
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export class DungeonEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private light: HTMLCanvasElement;
  private mapCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  private character: Character;
  private settings: Settings;
  private audio: DungeonAudio;
  private callbacks: Callbacks;
  private session: PartySession | null;
  private guestActor: ActorState | null = null;
  private hostDuringGuest: ActorState | null = null;
  private currentGuest = false;
  private remoteVisual: WorldSnapshot['other'] | null = null;
  private lastRemoteHUD: GameHUD | null = null;
  private remotePaused = false;
  private remoteWaiting = false;
  private networkTime = 0;
  private networkRevision = 0;
  private lastReceivedRevision = -1;
  private localBossReady = false;
  private guestBossReady = false;
  private networkCleanups: (() => void)[] = [];
  private inputTime = 0;
  private lastGuestInput = 0;
  private pendingEnd: RunRecord['outcome'] | null = null;
  private aim: { x: number; y: number } | null = null;
  private viewWidth = WIDTH;
  private viewHeight = HEIGHT;
  private resizeObserver: ResizeObserver | null = null;
  private artifact: string | null;
  private dungeon: Dungeon;
  private mastery: HeroProgress;
  private abilities: HeroAbility[];
  private cooldowns = [0, 0, 0, 0, 0, 0];
  private seals: BossSeal[] = [];
  private equippedSeal: string | null = null;
  private sealCooldown = 0;
  private charms: Partial<Record<CharmId, number>> = {};
  private traps: FloorTrap[] = [];
  private delayedCasts: DelayedCast[] = [];
  private swings: Swing[] = [];
  private combo = 0;
  private comboWindow = 0;
  private hitStop = 0;
  private levelNotice = '';
  private levelNoticeTime = 0;
  private xpEarned = 0;
  private bossesSlain = 0;
  private bossDefeated = false;
  private stage: GameHUD['stage'] = 'dungeon';
  private layoutName = '';
  private portalWarned = false;
  private elitesSlain = 0;
  private activeBoosts: BoostState = emptyBoosts();
  private runBoosts: BoostState = emptyBoosts();
  private boostSaveTime = 0;
  private shards = 0;
  private chests = 0;
  private loot: LootNotice | null = null;
  private lootTime = 0;
  private damageBuff = 0;
  private staminaDelay = 0;
  private zones: Zone[] = [];
  private clearingFloor = false;
  private ambienceTime = 0;
  private pathTime = 0;
  private pathField = new Int16Array(COLS * ROWS).fill(-1);
  private tiles: number[] = [];
  private rooms: Room[] = [];
  private enemies: Enemy[] = [];
  private objects: WorldObject[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private effects: Effect[] = [];
  private texts: FloatText[] = [];
  private torches: { x: number; y: number }[] = [];
  private explored = new Set<number>();
  private keys = new Set<string>();
  private mouse = { x: 0, y: 0, active: false, down: false };
  private camera = { x: 0, y: 0 };
  private player = newPlayer();
  private frame = 0;
  private lastTime = 0;
  private hudTime = 0;
  private elapsed = 0;
  private floorElapsed = 0;
  private floor = 1;
  private gold = 0;
  private kills = 0;
  private id = 0;
  private shake = 0;
  private hurtFlash = 0;
  private mapOpen = true;
  private notice = '';
  private noticeTime = 0;
  private hazardCooldown = 0;
  private footstepTime = 0;
  private followUps: { enemy: Enemy; damage: number; critical: boolean; time: number }[] = [];
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private ended = false;
  private paused = false;
  private externalPause = false;
  private listeners: (() => void)[] = [];

  constructor(canvas: HTMLCanvasElement, character: CharacterId, settings: Settings, artifact: string | null, audio: DungeonAudio, callbacks: Callbacks, loadout: RunLoadout, session: PartySession | null = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx.imageSmoothingEnabled = false;
    this.light = document.createElement('canvas');
    this.light.width = WIDTH; this.light.height = HEIGHT;
    this.lightCtx = this.light.getContext('2d')!;
    this.mapCanvas = document.createElement('canvas');
    this.mapCanvas.width = COLS * TILE; this.mapCanvas.height = ROWS * TILE;
    this.character = characters.find(c => c.id === character)!;
    this.settings = settings;
    this.artifact = artifact;
    this.audio = audio;
    this.callbacks = callbacks;
    this.session = session;
    this.dungeon = dungeons.find(d => d.id === loadout.dungeon) || dungeons[0];
    this.mastery = normalizeHero(loadout.heroProgress);
    this.abilities = abilitiesFor(this.character);
    this.activeBoosts = { ...loadout.activeBoosts };
    this.player.maxHp = heroStats(this.character, this.mastery).hp + (artifact === 'emberheart' ? 20 : 0);
    this.player.hp = this.player.maxHp;
    this.player.stamina = this.maxStamina;
    this.player.energy = this.maxEnergy;
    if (!session || session.isHost) this.generateFloor();
    else { this.tiles = new Array(COLS * ROWS).fill(0); this.layoutName = 'Connecting to the shared dungeon...'; this.bakeMap(); }
    if (session) this.setupNetwork();
    this.resizeObserver = new ResizeObserver(() => {
      const rect = this.canvas.getBoundingClientRect(); if (rect.width < 1 || rect.height < 1) return;
      const ratio = rect.width / rect.height;
      const height = rect.width < 650 ? Math.min(480, Math.max(240, Math.round(rect.height / 1.25))) : 360;
      this.viewWidth = Math.max(280, Math.min(1000, Math.round(height * ratio)));
      this.viewHeight = Math.round(this.viewWidth / ratio);
      this.canvas.width = this.viewWidth; this.canvas.height = this.viewHeight;
      this.light.width = this.viewWidth; this.light.height = this.viewHeight; this.ctx.imageSmoothingEnabled = false;
    });
    this.resizeObserver.observe(this.canvas);
    this.bindInput();
    this.sendHUD();
    this.frame = requestAnimationFrame(this.loop);
  }

  updateSettings(settings: Settings) { this.settings = settings; }
  setPaused(paused: boolean, external = false) {
    if (paused && !this.paused && this.boostSaveTime > 0 && !this.isGuest) { this.emitBoosts(); this.boostSaveTime = 0; }
    if (this.session && paused !== this.paused) this.session.sendGame('pause', paused);
    this.paused = paused; this.externalPause = external;
    if (paused) { this.keys.clear(); this.mouse.down = false; }
  }

  private get isGuest() { return !!this.session && !this.session.isHost; }
  private captureActor(): ActorState {
    return { player: this.player, character: this.character, mastery: this.mastery, abilities: this.abilities, cooldowns: this.cooldowns, artifact: this.artifact, activeBoosts: this.activeBoosts, runBoosts: this.runBoosts, boostSaveTime: this.boostSaveTime, seals: this.seals, equippedSeal: this.equippedSeal, sealCooldown: this.sealCooldown, charms: this.charms, swings: this.swings, followUps: this.followUps, delayedCasts: this.delayedCasts, combo: this.combo, comboWindow: this.comboWindow, damageBuff: this.damageBuff, staminaDelay: this.staminaDelay, hazardCooldown: this.hazardCooldown, footstepTime: this.footstepTime, ambienceTime: this.ambienceTime, gold: this.gold, shards: this.shards, xpEarned: this.xpEarned, loot: this.loot, lootTime: this.lootTime, levelNotice: this.levelNotice, levelNoticeTime: this.levelNoticeTime, keys: this.keys, mouse: this.mouse, aim: this.aim };
  }
  private withGuest<T>(operation: () => T): T | undefined {
    if (!this.guestActor) return undefined;
    if (this.currentGuest) return operation();
    const host = this.captureActor(), zoneCount = this.zones.length;
    this.hostDuringGuest = host; Object.assign(this, this.guestActor); this.currentGuest = true;
    try { return operation(); }
    finally {
      this.zones.slice(zoneCount).forEach(zone => { if (!zone.hostile) zone.owner = 'guest'; });
      this.guestActor = this.captureActor(); Object.assign(this, host); this.currentGuest = false; this.hostDuringGuest = null;
    }
  }
  private withOther(operation: () => void) {
    if (!this.guestActor) return;
    if (!this.currentGuest) { this.withGuest(operation); return; }
    const guest = this.captureActor(), host = this.hostDuringGuest!;
    Object.assign(this, host); this.currentGuest = false;
    try { operation(); } finally { Object.assign(host, this.captureActor()); Object.assign(this, guest); this.currentGuest = true; }
  }
  private emitMastery() { if (this.currentGuest) this.session?.sendGame('mastery', this.mastery); else this.callbacks.onHeroProgress(structuredClone(this.mastery)); }
  private emitBoosts() { if (this.currentGuest) this.session?.sendGame('boosts', this.activeBoosts); else this.callbacks.onBoosts({ ...this.activeBoosts }); }

  private setupNetwork() {
    const session = this.session!, quest = session.quest!;
    if (!session.connected) this.remotePaused = true;
    if (session.isHost) {
      const member = quest.guest, character = characters.find(c => c.id === member.hero)!;
      const player = newPlayer(); const stats = heroStats(character, member.mastery);
      player.maxHp = stats.hp + (member.artifact === 'emberheart' ? 20 : 0); player.hp = player.maxHp; player.stamina = Math.round(stats.stamina * (member.boosts.vigor > 0 ? 1.5 : 1)); player.energy = stats.energy; player.x = this.walkable(this.player.x + 14, this.player.y) ? this.player.x + 14 : this.player.x; player.y = this.player.y; player.invulnerable = 2;
      this.guestActor = { ...this.captureActor(), player, character, mastery: structuredClone(member.mastery), abilities: abilitiesFor(character), artifact: member.artifact, cooldowns: [0, 0, 0, 0, 0, 0], activeBoosts: { ...member.boosts }, runBoosts: emptyBoosts(), seals: [], charms: {}, swings: [], followUps: [], delayedCasts: [], keys: new Set(), mouse: { x: 0, y: 0, active: false, down: false }, aim: null };
    }
    this.networkCleanups.push(session.onGame(packet => this.receiveNetwork(packet)));
    this.networkCleanups.push(session.subscribe(() => { if (!session.connected) { this.remotePaused = true; this.keys.clear(); this.mouse.down = false; this.guestActor?.keys.clear(); } }));
    if (this.isGuest) session.sendGame('world-ready', null);
  }

  private receiveNetwork(packet: GamePacket) {
    const value = packet.payload;
    if (packet.kind === 'pause' && typeof value === 'boolean') { this.remotePaused = value; this.guestActor?.keys.clear(); return; }
    if (this.isGuest) {
      if (packet.kind === 'world') { this.receiveWorld(value); return; }
      if (packet.kind === 'loot' && isObject(value) && typeof value.gold === 'number' && typeof value.shards === 'number' && Number.isSafeInteger(value.gold) && Number.isSafeInteger(value.shards) && value.gold >= 0 && value.shards >= 0) { this.callbacks.onLoot(value.gold, value.shards); this.audio.play('coin'); }
      if (packet.kind === 'mastery' && isObject(value)) { this.mastery = normalizeHero(value); this.callbacks.onHeroProgress(this.mastery); }
      if (packet.kind === 'boosts' && isObject(value)) { const state = emptyBoosts(); boosts.forEach(boost => { const n = value[boost.id]; if (typeof n === 'number' && Number.isFinite(n)) state[boost.id] = Math.max(0, Math.min(18000, n)); }); this.callbacks.onBoosts(state); }
      if (packet.kind === 'clear' && value === this.dungeon.id) this.callbacks.onBiomeClear(this.dungeon.id);
      if (packet.kind === 'end' && isObject(value) && typeof value.id === 'string' && value.character === this.character.id && ['fallen', 'retreated'].includes(String(value.outcome))) { this.ended = true; this.paused = true; this.callbacks.onEnd(value as unknown as RunRecord); }
      return;
    }
    if (packet.kind === 'world-ready') { this.sendWorld(); return; }
    if (packet.kind === 'boss-ready') { if (this.stage === 'intro') { this.guestBossReady = true; if (this.localBossReady) this.beginBossEncounter(); } return; }
    if (packet.kind === 'end-request') { this.finish('retreated'); return; }
    if (packet.kind === 'attribute' && ['vitality', 'endurance', 'power'].includes(String(value))) { this.withGuest(() => this.spendAttribute(value as Attribute)); return; }
    if (packet.kind === 'equip' && (typeof value === 'string' || value === null)) { this.withGuest(() => this.equipSeal(value)); return; }
    if (packet.kind === 'aim' && isObject(value) && typeof value.x === 'number' && typeof value.y === 'number' && Number.isFinite(value.x) && Number.isFinite(value.y) && this.guestActor) {
      this.guestActor.aim = { x: Math.max(0, Math.min(COLS * TILE, value.x)), y: Math.max(0, Math.min(ROWS * TILE, value.y)) };
      this.guestActor.mouse.active = true;
    }
    if (packet.kind === 'held' && Array.isArray(value) && value.length <= 12 && this.guestActor && !this.paused && !this.remotePaused) {
      this.lastGuestInput = Date.now();
      const held = value.filter((action): action is Action => typeof action === 'string' && ['up', 'down', 'left', 'right', 'attack', 'sprint'].includes(action));
      const guestKeys = this.guestActor.keys;
      for (const action of ['up', 'down', 'left', 'right', 'attack', 'sprint'] as Action[]) { const code = this.settings.bindings[action]; if (held.includes(action)) guestKeys.add(code); else guestKeys.delete(code); }
    }
    if (packet.kind === 'input' && isObject(value) && typeof value.action === 'string' && Object.prototype.hasOwnProperty.call(this.settings.bindings, value.action) && typeof value.down === 'boolean' && !this.ended && !this.paused && !this.remotePaused && this.stage !== 'intro') {
      this.lastGuestInput = Date.now();
      const action = value.action as Action;
      if (action === 'inventory' || action === 'map') return;
      this.withGuest(() => {
        if (this.player.hp <= 0) return;
        const key = this.settings.bindings[action], wasDown = this.keys.has(key);
        if (value.down) { this.keys.add(key); if (!wasDown) this.action(key); } else this.keys.delete(key);
      });
    }
  }

  private sendWorld() {
    if (!this.session?.isHost || !this.guestActor || !this.session.connected) return;
    const hud = this.withGuest(() => this.makeHUD())!;
    const snapshot: WorldSnapshot = { revision: this.networkRevision, floor: this.floor, elapsed: this.elapsed, stage: this.stage, name: this.layoutName, tiles: this.tiles, rooms: this.rooms, torches: this.torches, player: { ...this.guestActor.player }, other: { player: { ...this.player }, hero: this.character.id, name: this.session.quest!.host.name }, enemies: this.enemies.slice(0, 160), objects: this.objects.slice(0, 220), bullets: this.projectiles.slice(0, 160).map(({ hit: _hit, ...bullet }) => bullet), effects: this.effects.slice(-60), particles: this.particles.slice(-90), texts: this.texts.slice(-35), zones: this.zones, traps: this.traps, explored: [...this.explored], hud, paused: this.paused || this.remotePaused };
    this.session.sendGame('world', snapshot, true);
  }

  private receiveWorld(raw: unknown) {
    if (this.ended) return;
    if (!isObject(raw) || !Array.isArray(raw.tiles) || raw.tiles.length !== COLS * ROWS || !Array.isArray(raw.enemies) || raw.enemies.length > 160 || !isObject(raw.player) || !isObject(raw.hud) || !isObject(raw.other)) return;
    const snap = raw as unknown as WorldSnapshot;
    if (!Number.isFinite(snap.player.x) || !Number.isFinite(snap.player.y) || !Number.isFinite(snap.player.hp) || !Array.isArray(snap.objects) || !Array.isArray(snap.bullets) || !Array.isArray(snap.effects) || !Array.isArray(snap.traps) || !Array.isArray(snap.particles) || !Array.isArray(snap.zones) || !Array.isArray(snap.texts) || !Array.isArray(snap.rooms) || !Array.isArray(snap.torches) || !Array.isArray(snap.explored)) return;
    if (!isObject(snap.other.player) || !characters.some(hero => hero.id === snap.other.hero) || !Number.isFinite(snap.other.player.x) || !Number.isFinite(snap.other.player.y) || !Number.isFinite(snap.elapsed) || !Number.isInteger(snap.floor) || snap.floor < 1 || !['dungeon', 'intro', 'boss', 'cleared'].includes(snap.stage)) return;
    if (snap.objects.length > 220 || snap.bullets.length > 160 || snap.effects.length > 60 || snap.particles.length > 90 || snap.zones.length > 60 || snap.traps.length > 30 || snap.rooms.length > 20) return;
    if (snap.enemies.some(enemy => !enemy || !(enemy.type in enemyDefinitions) || !Number.isFinite(enemy.x) || !Number.isFinite(enemy.y) || !Number.isFinite(enemy.hp))) return;
    if (this.lastRemoteHUD && snap.hud.hp < this.lastRemoteHUD.hp) this.audio.play('hurt');
    if (this.lastRemoteHUD && snap.hud.kills > this.lastRemoteHUD.kills) this.audio.play('hit');
    this.floor = snap.floor; this.elapsed = snap.elapsed; this.stage = snap.stage; this.layoutName = snap.name; this.floorElapsed = snap.hud.floorTime; this.bossDefeated = snap.hud.bossDefeated;
    this.player = { ...snap.player }; this.mastery = normalizeHero(snap.hud.heroProgress); this.remoteVisual = snap.other; this.lastRemoteHUD = snap.hud;
    this.gold = snap.hud.gold; this.shards = snap.hud.shards; this.kills = snap.hud.kills;
    this.enemies = snap.enemies; this.objects = snap.objects; this.projectiles = snap.bullets.map(b => ({ ...b, hit: new Set() }));
    this.effects = snap.effects; this.particles = snap.particles; this.texts = snap.texts; this.zones = snap.zones; this.traps = snap.traps; this.explored = new Set(snap.explored);
    this.remoteWaiting = snap.paused; this.activeBoosts = snap.hud.activeBoosts;
    if (snap.revision !== this.lastReceivedRevision) { this.tiles = snap.tiles; this.rooms = snap.rooms; this.torches = snap.torches; this.bakeMap(); this.centerCamera(); this.lastReceivedRevision = snap.revision; this.audio.setScene(this.dungeon.id, this.floor, this.stage === 'intro' || this.stage === 'boss'); }
    this.callbacks.onHUD(snap.hud);
  }

  private bindInput() {
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.code === 'Escape') {
        event.preventDefault();
        if (!event.repeat && !this.externalPause && !this.ended) this.callbacks.onPause();
        return;
      }
      if (this.paused || this.remotePaused || this.ended || this.stage === 'intro') return;
      if (Object.values(this.settings.bindings).includes(event.code) || event.code.startsWith('Arrow')) event.preventDefault();
      if (this.isGuest) { const action = this.codeAction(event.code); if (action) this.input(action, true); return; }
      if (event.code === this.settings.bindings.attack) this.mouse.active = false;
      if (!event.repeat) this.action(event.code);
      this.keys.add(event.code);
    };
    const keyup = (event: KeyboardEvent) => { if (this.isGuest) { const action = this.codeAction(event.code); if (action) this.input(action, false); } this.keys.delete(event.code); };
    const move = (event: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) / rect.width * this.viewWidth;
      this.mouse.y = (event.clientY - rect.top) / rect.height * this.viewHeight;
      this.mouse.active = true;
    };
    const down = (event: MouseEvent) => {
      if (this.paused || this.ended || this.stage === 'intro') return;
      move(event);
      if (this.isGuest) { this.input(event.button === 2 ? 'special' : 'attack', true); this.mouse.active = true; return; }
      this.player.facing = Math.atan2(this.mouse.y + this.camera.y - this.player.y, this.mouse.x + this.camera.x - this.player.x);
      if (event.button === 0) { this.mouse.down = true; this.attack(); }
      if (event.button === 2) this.useSpecial();
      void this.audio.unlock();
    };
    const up = () => { this.mouse.down = false; if (this.isGuest) { this.input('attack', false); this.input('special', false); } };
    const context = (event: Event) => event.preventDefault();
    const blur = () => {
      this.keys.clear(); this.mouse.down = false;
      if (!this.paused && !this.ended && this.stage !== 'intro') { this.setPaused(true); this.callbacks.onPause(); }
    };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('mouseup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    this.canvas.addEventListener('mousemove', move);
    this.canvas.addEventListener('mousedown', down);
    this.canvas.addEventListener('contextmenu', context);
    this.listeners = [
      () => window.removeEventListener('keydown', keydown), () => window.removeEventListener('keyup', keyup),
      () => window.removeEventListener('mouseup', up), () => window.removeEventListener('blur', blur),
      () => document.removeEventListener('visibilitychange', visibility),
      () => this.canvas.removeEventListener('mousemove', move), () => this.canvas.removeEventListener('mousedown', down),
      () => this.canvas.removeEventListener('contextmenu', context),
    ];
  }

  input(action: keyof Settings['bindings'], down: boolean) {
    const code = this.settings.bindings[action];
    if (this.isGuest) {
      if (down && (this.paused || this.remoteWaiting || this.ended || this.stage === 'intro')) return;
      const wasDown = this.keys.has(code);
      if (down) this.keys.add(code); else this.keys.delete(code);
      if (action === 'inventory') { if (down && !wasDown) this.callbacks.onInventory(); return; }
      if (action === 'map') { if (down && !wasDown) this.mapOpen = !this.mapOpen; return; }
      if (wasDown !== down) this.session?.sendGame('input', { action, down });
      return;
    }
    if (this.paused || this.remotePaused || this.ended || this.stage === 'intro') return;
    this.mouse.active = false;
    if (down) { this.keys.add(code); this.action(code); } else this.keys.delete(code);
  }

  private codeAction(code: string): Action | undefined {
    return (Object.keys(this.settings.bindings) as Action[]).find(action => this.settings.bindings[action] === code) || ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as Record<string, Action>)[code];
  }

  private action(code: string) {
    const b = this.settings.bindings;
    if (code === b.attack) this.attack();
    if (code === b.special) this.useSpecial();
    if (code === b.dodge) this.dodge();
    if (code === b.interact) this.interact();
    if (code === b.map) this.mapOpen = !this.mapOpen;
    if (code === b.extra1) this.useAbility(2);
    if (code === b.extra2) this.useAbility(3);
    if (code === b.extra3) this.useAbility(4);
    if (code === b.extra4) this.useAbility(5);
    if (code === b.seal) this.useSeal();
    if (code === b.inventory) this.callbacks.onInventory();
  }

  private held(action: Action, fallback: string) {
    const bindings = this.settings.bindings;
    return this.keys.has(bindings[action]) || (this.keys.has(fallback) && !Object.values(bindings).includes(fallback));
  }

  private tile(x: number, y: number) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return 0;
    return this.tiles[ty * COLS + tx];
  }

  private walkable(x: number, y: number, radius = 5, ignoreObjects = false) {
    if (!this.tile(x - radius, y - radius) || !this.tile(x + radius, y - radius) || !this.tile(x - radius, y + radius) || !this.tile(x + radius, y + radius)) return false;
    if (!ignoreObjects && this.objects.some(o => !o.opened && (o.type === 'barricade' || o.type === 'barrel') && Math.hypot(o.x - x, o.y - y) < radius + 5)) return false;
    return true;
  }

  private move(entity: { x: number; y: number }, dx: number, dy: number, ignoreObjects = false) {
    if (this.walkable(entity.x + dx, entity.y, 4, ignoreObjects)) entity.x += dx;
    if (this.walkable(entity.x, entity.y + dy, 4, ignoreObjects)) entity.y += dy;
  }

  private object(type: WorldObject['type'], x: number, y: number, extra: Partial<WorldObject> = {}) {
    const object: WorldObject = { id: this.id++, type, x, y, opened: false, hidden: false, value: 1, vx: 0, vy: 0, fuse: -1, hp: 30, rarity: 'common', ...extra };
    this.objects.push(object);
    return object;
  }

  private enemy(type: Enemy['type'], x: number, y: number, small = false, elite?: { name: string; color: string }) {
    const baseHp = (enemyDefinitions[type].hp * (small ? .3 : elite ? 3.2 : 1)) + (elite ? 65 : type === 'boss' ? 160 : 0);
    const hp = Math.round(baseHp * (1 + (this.floor - 1) * 0.12));
    this.enemies.push({ id: this.id++, type, x, y, hp, maxHp: hp, cooldown: .8 + Math.random(), stun: 0, burn: 0, burnTick: 0, flash: 0, vx: 0, vy: 0, phase: small ? 2 : 1, slow: 0, windup: 0, aim: 0, elite: elite?.name || null, eliteColor: elite?.color || '', skillTime: 2, pattern: 0, targetX: x, targetY: y });
  }

  private generateFloor() {
    this.clearWorld();
    this.stage = 'dungeon'; this.bossDefeated = false; this.portalWarned = false; this.floorElapsed = 0;
    const layout = createLayout(this.dungeon.id, this.floor);
    this.tiles = layout.tiles; this.rooms = layout.rooms; this.torches = layout.torches; this.layoutName = layout.name;
    this.audio.setScene(this.dungeon.id, this.floor);
    const eliteRooms = new Set([Math.max(1, Math.floor(this.rooms.length / 3)), Math.floor(this.rooms.length * 2 / 3)]);
    if (Math.random() < .4) eliteRooms.add(this.rooms.length - 2);
    const place = (room: Room, avoid = true) => {
      for (let tries = 0; tries < 80; tries++) {
        const point = { x: (room.x + rand(1, room.w - 2)) * TILE + 8, y: (room.y + rand(1, room.h - 2)) * TILE + 8 };
        if (this.walkable(point.x, point.y) && (!avoid || !this.objects.some(o => distance(o, point) < 24)) && Math.hypot(point.x - room.cx, point.y - room.cy) > 18) return point;
      }
      return { x: room.cx, y: room.cy };
    };
    const add = (room: Room, type: WorldObject['type'], extra: Partial<WorldObject> = {}) => { const point = place(room); return this.object(type, point.x, point.y, extra); };
    this.rooms.forEach((room, index) => {
      add(room, 'urn', { value: rand(1, 5), hp: 1 });
      if (index % 2 === 0) add(room, 'brazier');
      if (index === 0) { add(room, 'chest', { rarity: 'common' }); return; }
      const count = rand(2, 4) + Math.min(3, Math.floor(this.floor / 3));
      for (let n = 0; n < count; n++) {
        const roster = this.dungeon.roster, point = place(room);
        this.enemy(index === 1 ? roster[n % roster.length] : roster[rand(0, roster.length - 1)], point.x, point.y);
      }
      if (eliteRooms.has(index)) {
        const profile = eliteProfiles[this.dungeon.id][index % 2];
        this.enemy(profile.type, room.cx, room.cy, false, profile);
      }
      if (Math.random() < .75) add(room, 'chest', { hidden: Math.random() < .3, rarity: rollRarity() });
      if (this.dungeon.id === 'foundry' || index % 3 === 0) add(room, 'barrel');
      if (['crypt', 'dynasty'].includes(this.dungeon.id) && index % 3 === 1) add(room, 'chandelier');
      if (index === Math.floor(this.rooms.length / 2)) add(room, 'shrine');
      if (index % 2 === 1) {
        const point = place(room), pool = biomeTraps[this.dungeon.id];
        this.traps.push({ id: this.id++, kind: pool[Math.floor(index / 2) % pool.length], ...point, time: Math.random() * 2, fired: false });
        if (this.dungeon.id === 'drowned') for (let dy = -1; dy <= 1; dy++) for (let dx = -3; dx <= 3; dx++) { const cell = (Math.floor(point.y / TILE) + dy) * COLS + Math.floor(point.x / TILE) + dx; if (this.tiles[cell]) this.tiles[cell] = 2; }
      }
    });
    const start = this.rooms[0], exit = this.rooms[this.rooms.length - 1];
    this.objects = this.objects.filter(o => distance(o, { x: exit.cx, y: exit.cy }) > 24);
    this.object(isBossFloor(this.floor) ? 'portal' : 'stairs', exit.cx, exit.cy);
    this.enemies.forEach(enemy => {
      if (this.walkable(enemy.x, enemy.y)) return;
      const nearest = this.rooms.reduce((a, room) => Math.hypot(room.cx - enemy.x, room.cy - enemy.y) < Math.hypot(a.cx - enemy.x, a.cy - enemy.y) ? room : a);
      const point = place(nearest); enemy.x = point.x; enemy.y = point.y;
    });
    this.player.x = start.cx; this.player.y = start.cy; this.player.invulnerable = Math.max(this.player.invulnerable, 2);
    this.centerCamera(); this.bakeMap();
    const bindings = this.settings.bindings;
    this.say(isBossFloor(this.floor) ? `Guardian floor. Follow the portal at the far end. ${bossProfiles[this.dungeon.id].warning} No keys required.` : `${this.layoutName}. ${this.floor === 1 ? `${keyLabel(bindings.attack)} attacks. ${keyLabel(bindings.inventory)} opens your bag. ` : ''}${trapDescriptions[this.dungeon.id]}`, 8);
    this.sendHUD();
  }

  private clearWorld() {
    this.enemies = []; this.objects = []; this.projectiles = []; this.particles = []; this.effects = []; this.texts = []; this.followUps = []; this.zones = []; this.traps = []; this.delayedCasts = []; this.swings = [];
    this.loot = null; this.lootTime = 0; this.hazardCooldown = 1; this.pathTime = 0; this.explored.clear();
    this.player.dash = 0; this.player.bash = false; this.keys.clear(); this.mouse.down = false; this.mouse.active = false;
    this.hitStop = 0; this.comboWindow = 0; this.shake = 0; this.hurtFlash = 0;
    this.networkRevision++; this.localBossReady = false; this.guestBossReady = false;
    if (this.guestActor) { this.guestActor.keys.clear(); this.guestActor.swings = []; this.guestActor.delayedCasts = []; this.guestActor.followUps = []; this.guestActor.player.dash = 0; this.guestActor.aim = null; }
  }

  private centerCamera() {
    if (this.guestActor && !this.currentGuest) {
      const p = this.guestActor.player;
      p.x = this.walkable(this.player.x + 14, this.player.y) ? this.player.x + 14 : this.player.x;
      p.y = this.player.y; p.invulnerable = Math.max(p.invulnerable, 2);
      if (p.hp <= 0) p.hp = Math.ceil(p.maxHp * .3);
    }
    this.camera.x = Math.max(0, Math.min(COLS * TILE - this.viewWidth, this.player.x - this.viewWidth / 2));
    this.camera.y = Math.max(0, Math.min(ROWS * TILE - this.viewHeight, this.player.y - this.viewHeight / 2));
  }

  private enterBossArena() {
    if (this.stage !== 'dungeon' || !isBossFloor(this.floor)) return;
    this.clearWorld();
    const arena = createArena(this.dungeon.id);
    this.tiles = arena.tiles; this.rooms = arena.rooms; this.torches = arena.torches;
    this.layoutName = bossProfiles[this.dungeon.id].arena; this.stage = 'intro'; this.floorElapsed = 0;
    this.player.x = this.rooms[0].cx; this.player.y = this.rooms[0].cy + 100;
    this.enemy('boss', this.rooms[0].cx, this.rooms[0].cy - 85);
    this.centerCamera(); this.bakeMap(); this.audio.play('door'); this.audio.setScene(this.dungeon.id, this.floor, true);
    this.notice = ''; this.noticeTime = 0; this.sendHUD();
  }

  beginBossEncounter() {
    if (this.isGuest) { this.session?.sendGame('boss-ready', null); if (this.lastRemoteHUD?.party) { this.lastRemoteHUD.party.bossReady = true; this.callbacks.onHUD({ ...this.lastRemoteHUD }); } return; }
    if (this.stage !== 'intro' || this.ended) return;
    if (this.session) { this.localBossReady = true; if (!this.guestBossReady) { this.sendHUD(); this.sendWorld(); return; } }
    this.stage = 'boss'; this.player.invulnerable = Math.max(this.player.invulnerable, 1.7);
    this.keys.clear(); this.mouse.down = false; this.audio.play('special');
    this.say(`${bossProfiles[this.dungeon.id].name} has challenged you. Watch for the attack tells.`, 5); this.sendHUD();
  }

  private bakeMap() {
    const ctx = this.mapCanvas.getContext('2d')!;
    const palette = this.dungeon.palette;
    ctx.fillStyle = '#0b0e0d'; ctx.fillRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const tile = this.tiles[y * COLS + x], px = x * TILE, py = y * TILE;
      const hash = ((x * 137 + y * 91 + x * y * 3) % 17) / 17;
      if (tile) {
        ctx.fillStyle = palette.floor[Math.floor(hash * 4)];
        ctx.fillRect(px, py, 16, 16);
        ctx.fillStyle = palette.seam; ctx.fillRect(px, py + 15, 16, 1); ctx.fillRect(px + 15, py, 1, 16);
        ctx.fillStyle = palette.edge; ctx.fillRect(px + 1, py, 13, 1);
        if (hash > 0.7) { ctx.fillStyle = '#1d231e'; ctx.fillRect(px + 3, py + 4, 4, 1); ctx.fillRect(px + 7, py + 5, 1, 3); }
        if (hash < 0.15) { ctx.fillStyle = palette.moss; ctx.fillRect(px + 1, py + 11, 3, 2); ctx.fillStyle = palette.edge; ctx.fillRect(px + 3, py + 13, 4, 2); }
        if (this.dungeon.id === 'foundry' && x % 5 === 0) { ctx.fillStyle = '#665244'; ctx.fillRect(px, py, 2, 16); ctx.fillStyle = '#96724c'; ctx.fillRect(px, py + 2, 2, 1); }
        if (this.dungeon.id === 'hollows' && hash < .2) { ctx.fillStyle = '#69906b'; ctx.fillRect(px + 10, py + 6, 1, 4); ctx.fillStyle = '#6cbaa1'; ctx.fillRect(px + 8, py + 5, 5, 2); }
      } else {
        const below = y < ROWS - 1 && this.tiles[(y + 1) * COLS + x] > 0;
        const near = below || (y > 0 && this.tiles[(y - 1) * COLS + x] > 0) || this.tiles[y * COLS + x + 1] > 0 || this.tiles[y * COLS + x - 1] > 0;
        if (near) {
          ctx.fillStyle = below ? palette.wall : palette.seam; ctx.fillRect(px, py, 16, 15);
          ctx.fillStyle = '#141b18'; ctx.fillRect(px, py + 7, 16, 1); ctx.fillRect(px + 8, py, 1, 7); ctx.fillRect(px + 3, py + 8, 1, 7);
          ctx.fillStyle = below ? palette.wallTop : palette.edge; ctx.fillRect(px, py, 16, 2);
          if (below) { ctx.fillStyle = '#252d26'; ctx.fillRect(px, py + 12, 16, 4); }
        }
      }
    }
  }

  private say(text: string, duration = 5) { this.notice = text; this.noticeTime = duration; }
  private text(x: number, y: number, text: string, color = '#e9ce89') { this.texts.push({ x, y, text, color, life: 1 }); }
  private burst(x: number, y: number, color: string, count: number, power = 50) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, speed = Math.random() * power;
      const life = 0.25 + Math.random() * 0.5;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 10, life, maxLife: life, color, size: rand(1, 3) });
    }
  }

  private nearestEnemy(range: number) {
    return this.enemies.filter(e => e.hp > 0 && distance(e, this.player) < range && this.lineOfSight(e, this.player)).sort((a, b) => distance(a, this.player) - distance(b, this.player))[0];
  }

  private targetedEnemy(range: number) {
    if (!this.mouse.active) return this.nearestEnemy(range);
    const cursor = { x: this.mouse.x + this.camera.x, y: this.mouse.y + this.camera.y };
    return this.enemies.filter(e => e.hp > 0 && distance(e, this.player) < range).sort((a, b) => distance(a, cursor) - distance(b, cursor))[0];
  }

  private hasBoost(id: BoostId) { return this.activeBoosts[id] > 0 || this.runBoosts[id] > 0; }
  private get maxStamina() { return Math.round(heroStats(this.character, this.mastery).stamina * (this.hasBoost('vigor') ? 1.5 : 1)); }
  private get maxEnergy() { return heroStats(this.character, this.mastery).energy; }
  private get infiniteStamina() { return this.character.id === 'phantom' || this.hasBoost('endless'); }
  private get damageMultiplier() {
    return heroStats(this.character, this.mastery).multiplier * (1 + (this.charms.fang || 0) * .1) * (this.artifact === 'iron-sigil' ? 1.15 : 1) * (this.damageBuff > 0 ? 1.5 : 1) * (this.hasBoost('fervor') ? 1.2 : 1)
      * (this.player.eclipse > 0 || this.player.ascended > 0 ? 3 : 1) * (this.character.id === 'berserker' && this.player.hp < this.player.maxHp * .5 ? 1.5 : 1);
  }

  private spendStamina(amount: number) {
    if (this.infiniteStamina) return true;
    if (this.player.stamina < amount) { this.say('Not enough stamina. Catch your breath or use a boost.', 2); return false; }
    this.player.stamina -= amount; this.staminaDelay = .6;
    return true;
  }

  private heal(amount: number) { if (!this.ended && this.player.hp > 0) this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount); }

  private awardMastery(xp: number, points = 0, shared = false) {
    if (this.ended) return;
    if (this.session?.isHost && !shared) this.withOther(() => this.awardMastery(xp, points, true));
    xp = Math.round(xp * (this.hasBoost('scholar') ? 1.35 : 1));
    const oldLevel = this.mastery.level;
    this.xpEarned += xp;
    this.mastery = grantExperience(this.mastery, xp, points);
    this.emitMastery();
    const oldMax = this.player.maxHp;
    this.player.maxHp = heroStats(this.character, this.mastery).hp + (this.artifact === 'emberheart' ? 20 : 0);
    if (this.mastery.level > oldLevel) {
      this.heal(this.player.maxHp - oldMax + Math.round(this.player.maxHp * .12));
      this.player.energy = this.maxEnergy; this.player.stamina = this.maxStamina;
      const unlocked = this.abilities.filter(a => a.level > oldLevel && a.level <= this.mastery.level).map(a => a.name);
      this.levelNotice = `LEVEL ${this.mastery.level}${unlocked.length ? ` / ${unlocked.join(', ')} UNLOCKED` : this.mastery.level % 2 === 0 ? ' / ATTRIBUTE POINT EARNED' : ' / GROWING STRONGER'}`;
      this.levelNoticeTime = 6;
      this.burst(this.player.x, this.player.y, '#e2c68a', 35, 90); this.audio.play('treasure');
    }
  }

  spendAttribute(attribute: Attribute) {
    if (this.isGuest) { this.session?.sendGame('attribute', attribute); return; }
    if (this.ended || !['vitality', 'endurance', 'power'].includes(attribute) || this.mastery.points < attributeCost(this.mastery.attributes[attribute]) || this.mastery.attributes[attribute] >= attributeRankCap(this.mastery.level)) return;
    this.mastery = { ...this.mastery, points: this.mastery.points - attributeCost(this.mastery.attributes[attribute]), attributes: { ...this.mastery.attributes, [attribute]: this.mastery.attributes[attribute] + 1 } };
    this.emitMastery();
    const oldHp = this.player.maxHp;
    this.player.maxHp = heroStats(this.character, this.mastery).hp + (this.artifact === 'emberheart' ? 20 : 0);
    this.heal(this.player.maxHp - oldHp); this.audio.play('ui'); this.sendHUD();
  }

  private spendPower(cost: number) {
    const resource = resourceFor(this.character), p = this.player;
    if (resource.kind === 'stamina') return this.spendStamina(cost);
    if (resource.kind === 'blood') {
      const sacrifice = Math.ceil(p.maxHp * cost / 100);
      if (p.hp <= sacrifice + 1) { this.say(`Ritual denied. Keep more than ${sacrifice + 1} HP to offer ${cost}%.`, 3); return false; }
      p.hp -= sacrifice; this.text(p.x, p.y - 26, `-${sacrifice} HP / OFFERING`, '#e6a29c');
      this.burst(p.x, p.y, '#c26965', 12, 30); return true;
    }
    if (p.energy < cost) { this.say(`Not enough ${resource.name}. Recover energy before casting.`, 2); return false; }
    p.energy -= cost; return true;
  }

  private shoot(angle: number, damage: number, style = this.character.style) {
    const colors: Partial<Record<AttackStyle, string>> = { fire: '#f1a448', ice: '#a8d9ef', arrow: '#c9c79c', lightning: '#a5ddff', poison: '#aed27a', arcane: '#c5a1ed', shadow: '#c9a2ff' };
    const speed = style === 'arrow' || style === 'lightning' ? 270 : style === 'shadow' ? 240 : 205;
    this.projectiles.push({ x: this.player.x + Math.cos(angle) * 10, y: this.player.y - 4 + Math.sin(angle) * 10, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: style === 'shadow' ? 2.2 : 1.8, friendly: true, damage, style, color: colors[style] || this.character.color, pierce: style === 'arrow' ? 2 : 99, hit: new Set() });
    if (this.currentGuest) this.projectiles[this.projectiles.length - 1].owner = 'guest';
  }

  private attack() {
    const p = this.player;
    if (p.attack > 0 || p.dash > 0 || p.hp <= 0) return;
    const style = this.character.style;
    const melee = ['slash', 'daggers', 'fists'].includes(style);
    p.attack = this.character.attackRate * (p.rage > 0 ? .5 : 1) * (this.hasBoost('fervor') ? .8 : 1);
    this.combo = this.comboWindow > 0 ? (this.combo + 1) % 3 : 0;
    this.comboWindow = 1.25;
    const enemy = this.nearestEnemy(melee ? 65 : 240);
    if (!this.mouse.active && enemy) p.facing = Math.atan2(enemy.y - p.y, enemy.x - p.x);
    let damage = this.character.damage * this.damageMultiplier * (p.empowered ? 2 : 1);
    p.empowered = false;
    if (!melee) {
      if (this.character.id === 'ranger' && Math.random() < .25) damage *= 2;
      const angles = style === 'shadow' ? [-.17, 0, .17] : this.character.id === 'oracle' || this.character.id === 'seraph' ? [-.055, .055] : [0];
      angles.forEach(angle => this.shoot(p.facing + angle, damage));
      if (style === 'shadow') {
        this.effects.push({ x: p.x, y: p.y, type: 'slash', radius: 55, angle: p.facing, life: .22, maxLife: .22, color: '#caadff' });
        this.burst(p.x, p.y, '#956dcf', 5, 25);
      }
      this.audio.play(style === 'shadow' ? 'shadow' : 'fire');
    } else {
      const range = this.character.id === 'malachar' ? 45 : this.character.id === 'killison' || this.character.id === 'reaper' ? 42 : style === 'fists' ? 26 : style === 'daggers' ? 30 : 36;
      const duration = Math.min(.36, p.attack * .92);
      this.swings.push({ time: duration, total: duration, hit: false, angle: p.facing, damage: damage * (this.combo === 2 ? 1.3 : 1), range: range + (this.combo === 2 ? 5 : 0), combo: this.combo });
      this.effects.push({ x: p.x, y: p.y - 3, life: duration, maxLife: duration, type: 'slash', angle: p.facing, radius: range, color: this.character.color, combo: this.combo, weapon: this.character.id });
    }
  }

  private updateSwings(dt: number) {
    const p = this.player;
    for (const swing of this.swings) {
      swing.time -= dt;
      if (swing.hit || swing.time > swing.total * .64) continue;
      swing.hit = true;
      this.move(p, Math.cos(swing.angle) * (swing.combo === 2 ? 6 : 3), Math.sin(swing.angle) * (swing.combo === 2 ? 6 : 3));
      let landed = false;
      for (const enemy of [...this.enemies]) {
        const angle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
        const diff = Math.atan2(Math.sin(angle - swing.angle), Math.cos(angle - swing.angle));
        if (enemy.hp <= 0 || distance(enemy, p) >= swing.range + (enemy.type === 'boss' ? 15 : 0) || Math.abs(diff) > (swing.combo === 2 ? 1.7 : 1.35) || !this.lineOfSight(p, enemy)) continue;
        const dual = this.character.id === 'rogue' || this.character.id === 'duneblade';
        const critical = dual && Math.random() < .3 || this.character.id === 'monk' && Math.random() < .2;
        const damage = swing.damage * (critical ? 2 : 1);
        this.hitEnemy(enemy, dual ? damage * .5 : damage, this.character.style === 'fists' ? 25 : swing.combo === 2 ? 135 : 70, critical);
        if (dual) this.followUps.push({ enemy, damage: damage * .5, critical, time: .07 });
        if ((this.character.id === 'killison' || this.character.id === 'malachar') && swing.combo === 2) enemy.burn = 3;
        if (this.character.id === 'frostguard') enemy.slow = 2;
        this.burst(enemy.x, enemy.y - 7, swing.combo === 2 ? '#f4d9a1' : this.character.color, 10, 85);
        landed = true;
      }
      this.objects.forEach(o => { if (!o.opened && distance(o, p) < swing.range) this.hitObject(o, swing.damage); });
      this.audio.play(landed ? 'hit' : 'attack');
      if (landed) { this.hitStop = this.reducedMotion.matches ? 0 : swing.combo === 2 ? .045 : .025; this.shake = swing.combo === 2 ? 7 : 3; }
    }
    this.swings = this.swings.filter(swing => swing.time > 0);
  }

  private get specialMax() { return this.character.cooldown * (this.artifact === 'lost-crown' ? 0.75 : 1); }

  private useSpecial() {
    const p = this.player;
    if (p.special > 0 || p.dash > 0 || p.hp <= 0) return;
    if (this.mastery.level < 3) { this.say(`${this.character.special} unlocks at hero level 3. Earn XP from encounters and exploration.`, 3); return; }
    if (this.character.id !== 'rogue' && !this.spendPower(this.abilities[1].cost)) return;
    if (this.character.id === 'rogue') {
      const enemy = this.targetedEnemy(190);
      if (!enemy) { this.say('No enemy in shadow-step range.', 2); return; }
      const angle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
      const radius = enemy.type === 'boss' ? 33 : 19;
      const destination = [0, .7, -.7, 1.5, -1.5, Math.PI].map(offset => ({ x: enemy.x + Math.cos(angle + offset) * radius, y: enemy.y + Math.sin(angle + offset) * radius })).find(point => this.walkable(point.x, point.y));
      if (!destination) { this.say('The shadows are too narrow here.', 2); return; }
      if (!this.spendPower(25)) return;
      for (let t = 0; t <= 1; t += 0.1) this.burst(p.x + (destination.x - p.x) * t, p.y + (destination.y - p.y) * t, '#9881b6', 3, 20);
      p.x = destination.x; p.y = destination.y;
      p.facing = Math.atan2(enemy.y - p.y, enemy.x - p.x);
      p.empowered = true; p.invulnerable = Math.max(p.invulnerable, .7);
      this.mouse.active = false;
      this.burst(p.x, p.y, '#c2a4e9', 20, 50);
      this.text(p.x, p.y - 24, 'EMPOWERED', '#c3a7e9');
    } else if (this.character.id === 'knight' || this.character.id === 'monk') {
      p.dash = 0.34; p.bash = true; p.invulnerable = Math.max(p.invulnerable, .55);
    } else if (this.character.id === 'mage') {
      this.effects.push({ x: p.x, y: p.y, type: 'nova', radius: 110, life: 0.65, maxLife: 0.65, angle: 0 });
      this.enemies.forEach(e => { if (distance(e, p) < 110) { this.hitEnemy(e, 58, 200); e.burn = 3; e.stun = 0.6; } });
      this.projectiles = this.projectiles.filter(b => b.friendly || distance(b, p) > 130);
      this.objects.forEach(o => { if (distance(o, p) < 85) this.hitObject(o, 55); });
      this.burst(p.x, p.y, '#f6b44c', 50, 160);
      this.shake = 7;
    } else if (this.character.id === 'ranger') {
      const target = this.targetedEnemy(270);
      if (target && !this.mouse.active) p.facing = Math.atan2(target.y - p.y, target.x - p.x);
      for (let i = -3; i <= 3; i++) this.shoot(p.facing + i * .13, 45 * this.damageMultiplier, 'arrow');
      this.burst(p.x, p.y, this.character.color, 12, 50);
    } else if (this.character.id === 'berserker') {
      p.rage = 6; p.invulnerable = Math.max(p.invulnerable, 6);
      this.effects.push({ x: p.x, y: p.y, type: 'nova', radius: 70, life: .6, maxLife: .6, angle: 0, color: '#e58361' });
      this.text(p.x, p.y - 27, 'BLOODRAGE', '#f2a080');
    } else if (this.character.id === 'plague' || this.character.id === 'oracle') {
      const target = this.targetedEnemy(170);
      const center = target || p;
      this.zones.push({ x: center.x, y: center.y, radius: this.character.id === 'plague' ? 100 : 115, life: 5, tick: 0, kind: this.character.id === 'plague' ? 'poison' : 'gravity' });
      this.burst(center.x, center.y, this.character.color, 35, 100);
    } else if (this.character.id === 'tidecaller') {
      const center = this.targetedEnemy(170) || p;
      this.zones.push({ x: center.x, y: center.y, radius: 112, life: 6, tick: 0, kind: 'water', damage: 34 });
      this.effects.push({ x: center.x, y: center.y, type: 'rift', color: this.character.color, radius: 100, angle: 0, life: .9, maxLife: .9 });
    } else if (this.character.id === 'duneblade') {
      p.invulnerable = Math.max(p.invulnerable, 3); p.ward = 3; p.empowered = true;
      this.burst(p.x, p.y, this.character.color, 35, 80); this.text(p.x, p.y - 24, 'MIRAGE DANCE', this.character.color);
    } else if (this.character.id === 'frostguard') {
      this.areaStrike(135, 180, 3, this.character.color);
      this.enemies.filter(enemy => distance(enemy, p) < 135).forEach(enemy => { enemy.slow = 4; });
    } else if (this.character.id === 'seraph') {
      this.areaStrike(190, 350, 2, this.character.color); this.heal(p.maxHp * .15);
      this.effects.push({ x: p.x, y: p.y, type: 'lightning', color: '#f4dfab', radius: 115, angle: 0, life: .8, maxLife: .8 });
    } else if (this.character.id === 'killison' || this.character.id === 'malachar') {
      p.ascended = 6;
      this.areaStrike(this.character.id === 'malachar' ? 195 : 155, this.character.id === 'malachar' ? 510 : 170, 1.5, '#e99e91');
      this.effects.push({ x: p.x, y: p.y, type: 'rift', radius: 125, life: 1.2, maxLife: 1.2, angle: 0, color: '#efaca1' });
    } else if (this.character.id === 'phantom') {
      this.areaStrike(180, 1200, 4, '#c8a4ff');
      this.effects.push({ x: p.x, y: p.y, type: 'rift', radius: 200, life: 1.1, maxLife: 1.1, angle: 0, color: '#c4a0ff' });
      this.projectiles = this.projectiles.filter(b => b.friendly);
      this.shake = 11;
    } else if (this.character.id === 'storm') {
      this.enemies.filter(e => distance(e, p) < 230).forEach(e => {
        this.hitEnemy(e, 95 * this.damageMultiplier, 40); e.stun = 1;
        this.effects.push({ x: e.x, y: e.y, type: 'lightning', radius: 70, life: .55, maxLife: .55, angle: 0, color: '#c2e6ff' });
      });
      this.shake = 5;
    } else {
      const id = this.character.id;
      const targets = this.enemies.filter(e => distance(e, p) < 115 && e.hp > 0).length;
      this.areaStrike(id === 'warden' ? 130 : 115, id === 'warden' ? 125 : id === 'reaper' ? 100 : id === 'frost' ? 65 : 85, id === 'frost' ? 3 : id === 'warden' ? 2 : .4, this.character.color);
      if (id === 'paladin') { this.heal(35); this.text(p.x, p.y - 25, '+35 HP', '#e2d696'); }
      if (id === 'reaper') this.heal(targets * 12);
      if (id === 'warden') this.objects.forEach(o => { if (distance(o, p) < 125) this.hitObject(o, 130); });
    }
    p.special = this.specialMax;
    this.audio.play(this.character.id === 'phantom' ? 'shadow' : 'special');
  }

  private areaStrike(radius: number, damage: number, stun: number, color: string) {
    const p = this.player;
    this.effects.push({ x: p.x, y: p.y, type: 'nova', radius, life: .7, maxLife: .7, angle: 0, color });
    this.enemies.forEach(enemy => { if (distance(enemy, p) < radius) { this.hitEnemy(enemy, damage * this.damageMultiplier, 180); enemy.stun = Math.max(enemy.stun, stun); } });
    this.burst(p.x, p.y, color, 35, 130); this.shake = 7;
  }

  private useAbility(index: number) {
    const ability = this.abilities[index], p = this.player;
    if (!ability || index < 2 || this.cooldowns[index] > 0 || p.dash > 0 || p.hp <= 0) return;
    if (this.mastery.level < ability.level) { this.say(`${ability.name} unlocks at hero level ${ability.level}.`, 3); return; }
    const target = this.targetedEnemy(220);
    let blinkPoint: { x: number; y: number } | undefined;
    if (ability.kind === 'blink') {
      if (!target) { this.say('No target in range.', 2); return; }
      const angle = Math.atan2(target.y - p.y, target.x - p.x);
      blinkPoint = [0, .8, -.8, Math.PI].map(offset => ({ x: target.x + Math.cos(angle + offset) * 25, y: target.y + Math.sin(angle + offset) * 25 })).find(point => this.walkable(point.x, point.y));
      if (!blinkPoint) { this.say('There is no safe space behind this target.', 2); return; }
    }
    if (!this.spendPower(ability.cost)) return;
    this.cooldowns[index] = ability.cooldown * (this.artifact === 'lost-crown' ? .75 : 1);
    const color = this.character.color, damage = this.character.damage * ability.power;
    const projectileStyle: AttackStyle = ['slash', 'daggers', 'fists'].includes(this.character.style) ? resourceFor(this.character).kind === 'blood' ? 'fire' : 'arrow' : this.character.style;
    switch (ability.kind) {
      case 'ward': p.ward = ability.duration; p.invulnerable = Math.max(p.invulnerable, ability.duration); this.areaStrike(65, this.character.damage, .5, color); break;
      case 'heal': this.heal(p.maxHp * .35); p.stamina = this.maxStamina; p.slow = 0; this.text(p.x, p.y - 26, '+35% HP', '#c2e4a5'); break;
      case 'blink':
        if (blinkPoint) { for (let t = 0; t <= 1; t += .1) this.burst(p.x + (blinkPoint.x - p.x) * t, p.y + (blinkPoint.y - p.y) * t, color, 3, 18); p.x = blinkPoint.x; p.y = blinkPoint.y; p.empowered = true; p.invulnerable = Math.max(p.invulnerable, 1); this.mouse.active = false; if (target) p.facing = Math.atan2(target.y - p.y, target.x - p.x); }
        break;
      case 'volley': for (let i = -3; i <= 3; i++) this.shoot(p.facing + i * .15, damage * this.damageMultiplier, projectileStyle); break;
      case 'nova': this.areaStrike(ability.radius, damage, 1.5, color); this.objects.forEach(o => { if (distance(o, p) < ability.radius) this.hitObject(o, damage); }); break;
      case 'chains': this.areaStrike(200, damage, 4, color); break;
      case 'zone': { const center = target || p; this.zones.push({ x: center.x, y: center.y, radius: ability.radius, life: 6, tick: 0, kind: ['plague', 'ranger'].includes(this.character.id) ? 'poison' : 'gravity', damage }); break; }
      case 'meteor': { const center = target || { x: p.x + Math.cos(p.facing) * 65, y: p.y + Math.sin(p.facing) * 65 }; this.delayedCasts.push({ ...center, radius: ability.radius, damage: damage * this.damageMultiplier, color, time: .7 }); this.effects.push({ ...center, radius: ability.radius, type: 'mark', color, angle: 0, life: .7, maxLife: .7 }); break; }
      case 'ascend': p.ascended = ability.duration; p.invulnerable = Math.max(p.invulnerable, ability.duration); this.areaStrike(ability.radius, damage, 2, color); break;
      case 'execute': this.enemies.filter(e => distance(e, p) < 290 && this.lineOfSight(e, p)).forEach(e => { this.hitEnemy(e, damage * this.damageMultiplier, 70); this.effects.push({ x: e.x, y: e.y, radius: 55, type: 'lightning', color, angle: 0, life: .55, maxLife: .55 }); }); break;
      case 'torrent': for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 12; i++) { const angle = i * Math.PI / 6 + ring * .14; this.shoot(angle, damage * this.damageMultiplier, projectileStyle); const bullet = this.projectiles[this.projectiles.length - 1]; bullet.delay = ring * .2; bullet.vx *= 1 - ring * .1; bullet.vy *= 1 - ring * .1; } break;
      case 'eclipse': p.eclipse = 8; p.invulnerable = Math.max(p.invulnerable, 8); this.enemies.forEach(e => { e.stun = Math.max(e.stun, 8); }); this.projectiles = this.projectiles.filter(b => b.friendly); this.effects.push({ x: p.x, y: p.y, type: 'eclipse', radius: 240, life: 1.5, maxLife: 1.5, angle: 0, color }); break;
      case 'oblivion': this.clearingFloor = true; [...this.enemies].forEach(e => this.hitEnemy(e, 999999)); this.clearingFloor = false; this.projectiles = this.projectiles.filter(b => b.friendly); this.heal(p.maxHp); this.effects.push({ x: p.x, y: p.y, type: 'oblivion', radius: 800, life: 1.8, maxLife: 1.8, angle: 0, color }); break;
      default: break;
    }
    this.burst(p.x, p.y, color, 28, 80); this.audio.play(resourceFor(this.character).kind === 'blood' || this.character.id === 'phantom' ? 'oblivion' : 'special');
    this.text(p.x, p.y - 30, ability.name.toUpperCase(), color);
  }

  equipSeal(id: string | null) {
    if (this.isGuest) { this.session?.sendGame('equip', id); return; }
    if (this.ended || id !== null && !this.seals.some(seal => seal.id === id)) return;
    this.equippedSeal = id; this.audio.play('ui'); this.sendHUD();
  }

  private useSeal() {
    const seal = this.seals.find(item => item.id === this.equippedSeal);
    if (!seal) { this.say('No boss seal equipped. Open your run inventory to equip one.', 3); return; }
    if (this.sealCooldown > 0) return;
    const definition = sealDefinitions[seal.kind];
    if (!(resourceFor(this.character).kind === 'blood' ? this.spendStamina(definition.cost) : this.spendPower(definition.cost))) return;
    this.sealCooldown = definition.cooldown;
    const p = this.player, damage = (110 + seal.tier * 35) * this.damageMultiplier;
    if (seal.kind !== 'forge' && seal.kind !== 'tide') {
      const style: AttackStyle = seal.kind === 'ash' ? 'fire' : seal.kind === 'frost' ? 'ice' : seal.kind === 'sand' ? 'arrow' : seal.kind === 'astral' ? 'arcane' : 'poison';
      for (let ring = 0; ring < 3; ring++) for (let n = 0; n < 12; n++) { this.shoot(n * Math.PI / 6 + ring * .1, damage * .6, style); const bullet = this.projectiles[this.projectiles.length - 1]; bullet.delay = ring * .22; bullet.vx *= 1 - ring * .12; bullet.vy *= 1 - ring * .12; }
    }
    if (seal.kind !== 'ash' && seal.kind !== 'frost') this.zones.push({ x: p.x, y: p.y, radius: 140, life: 6, tick: 0, kind: seal.kind === 'tide' ? 'water' : seal.kind === 'forge' ? 'fire' : seal.kind === 'sand' || seal.kind === 'astral' ? 'gravity' : 'poison', damage: (110 + seal.tier * 35) * .22 });
    this.areaStrike(155, damage / this.damageMultiplier, 2, definition.color);
    this.effects.push({ x: p.x, y: p.y, type: 'rift', color: definition.color, radius: 170, angle: 0, life: 1.1, maxLife: 1.1 });
    this.audio.play('oblivion'); this.text(p.x, p.y - 30, definition.power.toUpperCase(), definition.color);
  }

  private dodge() {
    const p = this.player;
    if (p.dodge > 0 || p.dash > 0 || p.hp <= 0) return;
    if (!this.spendStamina(this.character.id === 'monk' || this.character.id === 'duneblade' ? 12 : 24)) return;
    const dx = Number(this.held('right', 'ArrowRight')) - Number(this.held('left', 'ArrowLeft'));
    const dy = Number(this.held('down', 'ArrowDown')) - Number(this.held('up', 'ArrowUp'));
    if (dx || dy) p.facing = Math.atan2(dy, dx);
    p.dash = this.character.id === 'phantom' ? .3 : .19; p.bash = false; p.dodge = this.character.id === 'phantom' ? .45 : this.character.id === 'monk' ? .9 : 1.5; p.invulnerable = Math.max(p.invulnerable, .35);
    if (this.hasBoost('haste')) p.dodge *= .75;
    this.burst(p.x, p.y, '#7d7b65', 8, 30);
  }

  private hitEnemy(enemy: Enemy, amount: number, knockback = 0, critical = false, direct = true) {
    if (this.ended || enemy.hp <= 0) return;
    const damage = Math.max(1, Math.round(amount * (enemy.type === 'brute' || enemy.type === 'sentinel' ? .82 : 1)));
    const dealt = Math.min(enemy.hp, damage);
    enemy.hp -= damage; enemy.flash = 0.12;
    if (direct && ['reaper', 'killison', 'malachar'].includes(this.character.id)) this.heal(dealt * (this.character.id === 'malachar' ? .18 : this.character.id === 'killison' ? .15 : .08));
    if (direct) this.player.energy = Math.min(this.maxEnergy, this.player.energy + (resourceFor(this.character).kind === 'fury' ? 9 : 3));
    const angle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
    const weight = enemy.elite ? .3 : enemy.type === 'boss' ? .45 : enemy.type === 'brute' || enemy.type === 'sentinel' ? .45 : 1;
    enemy.vx += Math.cos(angle) * knockback * weight; enemy.vy += Math.sin(angle) * knockback * weight;
    this.text(enemy.x, enemy.y - 21, `${critical ? 'CRIT ' : ''}${damage}`, critical ? '#fff0b3' : '#dec58a');
    this.burst(enemy.x, enemy.y - 5, enemy.type === 'wraith' ? '#84b8aa' : '#a79774', 5, 45);
    this.shake = Math.max(this.shake, critical ? 5 : 2.5);
    if (enemy.hp <= 0) {
      this.kills++;
      if (enemy.type !== 'boss') this.awardMastery(enemy.elite ? 70 + this.floor * 5 : enemy.type === 'slime' && enemy.phase === 2 ? 2 : 4 + Math.floor(enemyDefinitions[enemy.type].hp / 25));
      if (enemy.elite) {
        this.elitesSlain++;
        const gold = this.collectGold(rand(14, 25), rand(4, 9));
        this.say(`${enemy.elite} defeated. +${gold} gold and a handful of Soul Shards.`, 4);
        this.burst(enemy.x, enemy.y, enemy.eliteColor, 30, 90); this.audio.play('treasure');
        if (Math.random() < .18) this.object('chest', enemy.x, enemy.y, { rarity: 'rare' });
      }
      this.burst(enemy.x, enemy.y, '#b0a181', 15, 60);
      if (enemy.type !== 'boss' && Math.random() < .75) this.object('coin', enemy.x, enemy.y, { value: Math.max(1, Math.round(enemyDefinitions[enemy.type].gold * .55) + rand(-1, 1)) });
      this.player.energy = Math.min(this.maxEnergy, this.player.energy + 10);
      if (this.character.id === 'mage') this.object('ember', enemy.x + 6, enemy.y - 2);
      if (this.character.id === 'paladin') this.heal(3);
      if (this.character.id === 'seraph') this.heal(10);
      if (enemy.type === 'slime' && enemy.phase === 1 && !this.clearingFloor) {
        for (const offset of [-9, 9]) { const x = enemy.x + offset; if (this.walkable(x, enemy.y, 3, true)) this.enemy('slime', x, enemy.y, true); }
      }
      if (enemy.type === 'boss') {
        const profile = bossProfiles[this.dungeon.id], reward = rollBossReward(this.floor);
        this.bossDefeated = true; this.bossesSlain++; this.stage = 'cleared';
        this.callbacks.onBiomeClear(this.dungeon.id);
        this.session?.sendGame('clear', this.dungeon.id);
        const gold = this.collectGold(reward.gold, reward.shards);
        this.awardMastery(reward.xp, reward.points);
        this.charms[reward.charm] = Math.min(3, (this.charms[reward.charm] || 0) + 1);
        if (this.session?.isHost) this.withOther(() => { this.charms[reward.charm] = Math.min(3, (this.charms[reward.charm] || 0) + 1); });
        this.loot = { id: this.id++, rarity: 'epic', gold, shards: reward.shards, xp: reward.xp, points: reward.points, title: 'GUARDIAN VANQUISHED', message: `${runCharms[reward.charm].name} / Rare loot secured${reward.seal ? ' / A BOSS SEAL HAS DROPPED' : ' / No seal this time'}` }; this.lootTime = 10;
        if (reward.seal) this.object('seal', enemy.x, enemy.y, { seal: { id: `seal-${this.id++}`, kind: profile.seal, tier: reward.tier, floor: this.floor } });
        this.say(`${profile.name} falls. ${nextBiome(this.dungeon.id)?.name || 'The final chapter'} ${nextBiome(this.dungeon.id) ? 'is now unlocked at the gate.' : 'is conquered.'}${reward.seal ? ' A boss seal has dropped.' : ''}`, 9);
        this.object('onward', this.rooms[0].cx, this.rooms[0].cy - 137);
        this.player.invulnerable = Math.max(this.player.invulnerable, 2);
        this.projectiles = this.projectiles.filter(bullet => bullet.friendly); this.zones = this.zones.filter(zone => !zone.hostile);
        this.enemies.forEach(other => { if (other !== enemy) other.hp = 0; });
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
        this.shake = 14; this.audio.play('special');
        this.audio.setScene(this.dungeon.id, this.floor, false);
      }
    }
  }

  private hurt(amount: number, physical = true) {
    const p = this.player;
    if (p.invulnerable > 0 || this.ended || p.hp <= 0) return;
    const resistance = physical || this.character.id === 'phantom' ? this.character.armor : 0;
    const damage = Math.max(1, Math.round(amount * (1 - resistance) * (1 - (this.charms.pearl || 0) * .1) * (this.hasBoost('ironhide') ? .8 : 1)));
    p.hp = Math.max(0, p.hp - damage); p.invulnerable = 0.65;
    this.hurtFlash = 0.3; this.shake = 5;
    this.text(p.x, p.y - 25, `-${damage}`, '#ee8570');
    this.audio.play('hurt');
    if (this.character.id === 'berserker') p.energy = Math.min(this.maxEnergy, p.energy + 12);
    if (p.hp <= 0) {
      this.audio.play('death'); this.keys.clear(); this.mouse.down = false;
      if (this.session?.isHost && this.guestActor) {
        const other = this.currentGuest ? this.hostDuringGuest! : this.guestActor;
        if (other.player.hp <= 0) this.pendingEnd = 'fallen';
        else this.say('A hero has fallen. Stand beside your partner and Interact to revive.', 7);
      } else this.finish('fallen');
    }
  }

  private hitObject(object: WorldObject, damage: number) {
    if (object.opened) return;
    if (object.type === 'urn') {
      object.opened = true; this.burst(object.x, object.y, '#b79770', 13, 70);
      this.object('coin', object.x, object.y, { value: object.value }); this.audio.play('hit');
    }
    if (object.type === 'barrel') {
      object.hp -= damage;
      const angle = Math.atan2(object.y - this.player.y, object.x - this.player.x);
      object.vx = Math.cos(angle) * 150; object.vy = Math.sin(angle) * 150;
      object.fuse = object.hp <= 0 ? 0.12 : 0.7;
    }
    if (object.type === 'barricade') {
      object.hp -= damage;
      this.burst(object.x, object.y, '#a6804a', 10);
      if (object.hp <= 0) object.opened = true;
    }
    if (object.type === 'chandelier') { object.opened = true; this.explode(object.x, object.y, 58, 100, '#e6b95a'); }
  }

  private explode(x: number, y: number, radius: number, damage: number, color = '#e68939') {
    this.effects.push({ x, y, type: 'blast', radius, life: 0.45, maxLife: 0.45, angle: 0 });
    this.burst(x, y, color, 35, 135);
    this.enemies.forEach(e => { if (distance(e, { x, y }) < radius) this.hitEnemy(e, damage, 140); });
    if (distance(this.player, { x, y }) < radius * 0.65) this.hurt(16, false);
    this.objects.forEach(o => { if (!o.opened && o.type === 'barrel' && distance(o, { x, y }) < radius) o.fuse = 0.2; });
    this.shake = 10; this.audio.play('special');
  }

  private interactable() {
    return this.objects.filter(o => !o.opened && !o.hidden && ['chest', 'stairs', 'portal', 'onward', 'barrel', 'chandelier', 'brazier', 'shrine', 'urn', 'seal'].includes(o.type) && distance(o, this.player) < 40).sort((a, b) => distance(a, this.player) - distance(b, this.player))[0];
  }

  private collectGold(amount: number, shards = 0, boost?: BoostId, shared = false) {
    if (this.session?.isHost && !shared) this.withOther(() => this.collectGold(amount, shards, boost, true));
    const gold = Math.max(0, Math.round(amount * (this.hasBoost('fortune') ? 2 : 1)));
    this.gold += gold; this.shards += shards;
    if (this.currentGuest) this.session?.sendGame('loot', { gold, shards }); else this.callbacks.onLoot(gold, shards, boost);
    return gold;
  }

  private interact() {
    if (this.player.hp <= 0) return;
    const partner = this.currentGuest ? this.hostDuringGuest : this.guestActor;
    if (partner && partner.player.hp <= 0 && distance(partner.player, this.player) < 44) { partner.player.hp = Math.ceil(partner.player.maxHp * .3); partner.player.invulnerable = 3; this.burst(partner.player.x, partner.player.y, '#bddb9b', 30, 70); this.audio.play('treasure'); this.say('Your companion rises. The descent continues.', 4); return; }
    const o = this.interactable();
    if (!o) return;
    if (this.currentGuest && ['stairs', 'portal', 'onward'].includes(o.type)) { this.say('Your party leader advances the quest. Stay together.', 3); return; }
    if (o.type === 'chest') {
      o.opened = true; this.chests++;
      const rarity = chestRarities[o.rarity];
      const reward = rollChestReward(o.rarity), parts: string[] = [];
      const gold = reward.gold || reward.shards ? this.collectGold(reward.gold, reward.shards) : 0;
      if (reward.heal) { const restored = Math.min(reward.heal, this.player.maxHp - this.player.hp); this.heal(reward.heal); parts.push(restored > 0 ? `${Math.ceil(restored)} HP restored` : 'Healing draught / HP already full'); }
      if (reward.energy) { this.player.stamina = this.maxStamina; this.player.energy = this.maxEnergy; parts.push('Energy restored'); }
      if (reward.xp || reward.points) { const oldBonus = this.mastery.bonusPoints; this.awardMastery(reward.xp, reward.points); reward.points = this.mastery.bonusPoints - oldBonus; parts.push(`${reward.xp} hero XP${reward.points ? ` / +${reward.points} rare attribute point` : ''}`); }
      if (reward.buff) { this.damageBuff = 30; parts.push('+50% damage / 30 seconds'); }
      if (reward.boost) { this.runBoosts[reward.boost] += 300; parts.push(`${boosts.find(b => b.id === reward.boost)!.name} / this run only`); }
      if (reward.charm) { this.charms[reward.charm] = Math.min(3, (this.charms[reward.charm] || 0) + 1); parts.push(`${runCharms[reward.charm].name} / this run only`); }
      if (!parts.length) parts.push('Currency banked for supplies and recruitment.');
      this.loot = { id: this.id++, rarity: o.rarity, gold, shards: reward.shards, message: parts.join(' / '), xp: reward.xp, points: reward.points }; this.lootTime = 6;
      this.say(`${rarity.name} cache: ${gold || reward.shards ? 'currency secured' : 'supplies, not coins. Every cache is different'}.`, 4);
      this.burst(o.x, o.y - 4, rarity.color, o.rarity === 'legendary' ? 60 : 25, 85); this.audio.play(o.rarity === 'legendary' || o.rarity === 'epic' ? 'treasure' : 'coin');
    } else if (o.type === 'stairs' || o.type === 'onward') {
      this.awardMastery(50 + Math.min(50, this.floor * 5));
      this.floor++;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.round(this.player.maxHp * 0.2));
      this.player.special = Math.max(0, this.player.special - 3);
      this.generateFloor(); this.audio.play('door');
    } else if (o.type === 'portal') {
      this.enterBossArena();
    } else if (o.type === 'seal' && o.seal) {
      o.opened = true; this.seals.push(o.seal);
      const definition = sealDefinitions[o.seal.kind];
      this.loot = { id: this.id++, rarity: 'legendary', title: 'BOSS SEAL DISCOVERED', gold: 0, shards: 0, message: `${definition.name} / Open your run inventory to equip ${definition.power}. Lost when this run ends.` }; this.lootTime = 10;
      this.say('A guardian\'s power is yours to wield. Open your run inventory to equip the seal.', 6);
      this.burst(o.x, o.y, definition.color, 45, 110); this.audio.play('treasure');
    } else if (o.type === 'brazier') {
      o.opened = true; this.player.stamina = this.maxStamina;
      this.enemies.forEach(e => { if (distance(e, o) < 105) { this.hitEnemy(e, 35, 70); e.stun = 1.5; } });
      this.effects.push({ x: o.x, y: o.y, type: 'nova', radius: 110, life: .8, maxLife: .8, angle: 0, color: this.dungeon.palette.torchCore });
      this.burst(o.x, o.y - 12, this.dungeon.palette.torch, 30, 70); this.audio.play('fire');
      this.say('Brazier ignited. Shadows recoil. Stamina restored and the chamber stays lit.', 4);
    } else if (o.type === 'shrine') {
      o.opened = true; this.heal(this.player.maxHp * .4); this.player.stamina = this.maxStamina;
      this.burst(o.x, o.y, '#b2d8a7', 35, 75); this.audio.play('treasure');
      this.say('The old shrine answers. 40% health and all stamina restored.', 4);
    } else if (o.type === 'urn') this.hitObject(o, 100);
    else if (o.type === 'barrel') this.hitObject(o, 10);
    else if (o.type === 'chandelier') this.hitObject(o, 100);
  }

  finish(outcome: RunRecord['outcome']) {
    if (this.ended) return;
    if (this.isGuest && this.session?.connected) { this.session.sendGame('end-request', null); return; }
    if (this.currentGuest) { this.pendingEnd = outcome; return; }
    if (this.session?.isHost && this.guestActor) this.withGuest(() => {
      this.emitBoosts(); this.emitMastery(); this.session?.sendGame('end', this.makeRunRecord(outcome));
    });
    this.ended = true; this.paused = true; this.keys.clear(); this.mouse.down = false;
    if (!this.isGuest) this.emitBoosts();
    // Run-only powers and finds never enter the persistent save, including on a retreat.
    this.seals = []; this.equippedSeal = null; this.charms = {}; this.runBoosts = emptyBoosts();
    this.sendHUD();
    this.callbacks.onEnd(this.makeRunRecord(outcome));
  }

  private makeRunRecord(outcome: RunRecord['outcome']): RunRecord {
    return { id: `${this.session?.quest?.id || `run-${Date.now()}-${rand(100, 999)}`}-${this.currentGuest || this.isGuest ? 'guest' : 'host'}`, character: this.character.id, floor: this.floor, kills: this.kills, gold: this.gold, seconds: Math.floor(this.elapsed), outcome, date: new Date().toISOString(), dungeon: this.dungeon.id, shards: this.shards, chests: this.chests, heroLevel: this.mastery.level, xpEarned: this.xpEarned, bosses: this.bossesSlain };
  }

  private lineOfSight(a: { x: number; y: number }, b: { x: number; y: number }) {
    const steps = Math.ceil(distance(a, b) / 8);
    for (let i = 1; i < steps; i++) if (!this.tile(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps)) return false;
    return true;
  }

  private updatePaths() {
    this.pathField.fill(-1);
    const blocked = new Set(this.objects.filter(o => !o.opened && (o.type === 'barrel' || o.type === 'barricade')).map(o => Math.floor(o.y / TILE) * COLS + Math.floor(o.x / TILE)));
    const start = Math.floor(this.player.y / TILE) * COLS + Math.floor(this.player.x / TILE);
    const queue = new Uint16Array(COLS * ROWS);
    let head = 0, tail = 1;
    queue[0] = start; this.pathField[start] = 0;
    // One shared distance field lets whole packs navigate corners without per-enemy searches.
    while (head < tail) {
      const cell = queue[head++], x = cell % COLS;
      for (const next of [cell - COLS, cell + COLS, ...(x > 0 ? [cell - 1] : []), ...(x < COLS - 1 ? [cell + 1] : [])]) {
        if (next < 0 || next >= this.tiles.length || !this.tiles[next] || this.pathField[next] >= 0 || blocked.has(next)) continue;
        this.pathField[next] = this.pathField[cell] + 1; queue[tail++] = next;
      }
    }
  }

  private mobAttack(enemy: Enemy) {
    const definition = enemyDefinitions[enemy.type];
    const shoot = (angle: number, speed: number, style?: AttackStyle) => this.projectiles.push({ x: enemy.x, y: enemy.y - 5, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 3, friendly: false, damage: definition.damage * (enemy.elite ? 1.3 : 1), style, color: enemy.eliteColor || definition.color, hit: new Set() });
    if (enemy.type === 'sentinel' || enemy.type === 'goblin') {
      enemy.vx = Math.cos(enemy.aim) * (enemy.type === 'sentinel' ? 460 : 250);
      enemy.vy = Math.sin(enemy.aim) * (enemy.type === 'sentinel' ? 460 : 250);
      this.burst(enemy.x, enemy.y, definition.color, 8, 45);
    } else if (enemy.type === 'imp') for (let n = -1; n <= 1; n++) shoot(enemy.aim + n * .24, 100, 'fire');
    else if (enemy.type === 'shroom') for (let n = 0; n < 8; n++) shoot(n * Math.PI / 4, 65, 'poison');
    else shoot(enemy.aim, enemy.type === 'archer' ? 185 : 95, enemy.type === 'spider' ? 'poison' : enemy.type === 'archer' ? 'arrow' : 'arcane');
  }

  private guardianAttack(enemy: Enemy) {
    const biome = this.dungeon.id, profile = bossProfiles[biome];
    const damage = 11 + Math.floor(this.floor / 4), phase = enemy.phase;
    const shoot = (angle: number, speed: number, style: AttackStyle, delay = 0) => this.projectiles.push({ x: enemy.x, y: enemy.y - 9, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 4, friendly: false, damage, style, color: profile.color, delay, hit: new Set() });
    const ring = (count: number, style: AttackStyle, speed = 95) => { for (let i = 0; i < count; i++) shoot(i * Math.PI * 2 / count + enemy.pattern * .17, speed, style); };
    const field = (kind: Zone['kind'], radius = 45) => this.zones.push({ x: enemy.targetX, y: enemy.targetY, radius, life: phase === 2 ? 4 : 2.7, tick: .25, kind, damage, hostile: true });
    switch (biome) {
      case 'crypt': if (phase === 1 && enemy.pattern % 2) { enemy.vx = Math.cos(enemy.aim) * 390; enemy.vy = Math.sin(enemy.aim) * 390; } else ring(phase === 2 ? 18 : 10, 'fire'); break;
      case 'foundry': field('fire', phase === 2 ? 67 : 46); for (let i = -2; i <= 2; i++) shoot(enemy.aim + i * .18, 120, 'fire'); break;
      case 'hollows': field('poison', 58); ring(phase === 2 ? 12 : 8, 'poison', 70); if (phase === 2 && enemy.pattern % 3 === 0 && this.enemies.length < 8) { this.enemy('shroom', enemy.x - 35, enemy.y + 20); this.enemy('slime', enemy.x + 35, enemy.y + 20); } break;
      case 'drowned': field('water', phase === 2 ? 80 : 52); for (let i = -2; i <= 2; i++) shoot(enemy.aim + i * .24, 115, 'ice'); break;
      case 'frostkeep': for (let i = -3; i <= 3; i++) shoot(enemy.aim + i * .17, 145, 'ice', Math.abs(i) * .05); if (phase === 2) ring(10, 'ice', 85); break;
      case 'dynasty': field('gravity', 56); for (let i = 0; i < 4; i++) for (let n = 0; n < phase + 1; n++) shoot(i * Math.PI / 2 + n * .12 + enemy.pattern * .24, 135, 'arrow'); break;
      case 'astral': {
        ring(phase === 2 ? 20 : 12, 'arcane', 105); field('gravity', 60);
        if (enemy.pattern % 2 === 0) { const center = this.rooms[0]; const angle = enemy.pattern * 1.7; const x = center.cx + Math.cos(angle) * 150, y = center.cy + Math.sin(angle) * 100; if (this.walkable(x, y, 12, true)) { this.burst(enemy.x, enemy.y, profile.color, 20, 60); enemy.x = x; enemy.y = y; } }
        break;
      }
    }
    this.effects.push({ x: enemy.x, y: enemy.y, type: 'nova', color: profile.color, radius: 55, angle: 0, life: .5, maxLife: .5 });
    this.audio.play('fire');
  }

  private updateEnemy(enemy: Enemy, dt: number) {
    if (this.guestActor && !this.currentGuest && this.guestActor.player.hp > 0 && (this.player.hp <= 0 || distance(enemy, this.guestActor.player) < distance(enemy, this.player))) { this.withGuest(() => this.updateEnemy(enemy, dt)); return; }
    const p = this.player;
    if (enemy.hp <= 0) return;
    enemy.flash -= dt; enemy.cooldown -= dt; enemy.stun -= dt; enemy.slow -= dt;
    if (enemy.burn > 0) {
      enemy.burn -= dt; enemy.burnTick -= dt;
      if (enemy.burnTick <= 0) { this.hitEnemy(enemy, 4, 0, false, false); enemy.burnTick = .5; this.burst(enemy.x, enemy.y, this.character.style === 'poison' ? '#a9c56f' : '#e18736', 3, 15); }
    }
    if (enemy.hp <= 0) return;
    if (Math.abs(enemy.vx) + Math.abs(enemy.vy) > 1) {
      this.move(enemy, enemy.vx * dt, enemy.vy * dt);
      const damping = enemy.type === 'sentinel' ? 5 : 9;
      enemy.vx *= Math.max(0, 1 - dt * damping); enemy.vy *= Math.max(0, 1 - dt * damping);
    }
    if (enemy.stun > 0) return;
    const d = distance(enemy, p), angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
    if (d > (enemy.type === 'boss' ? 700 : 310)) return;
    const canSee = this.lineOfSight(enemy, p);
    let routeAngle = angle;
    if (!canSee) {
      const tx = Math.floor(enemy.x / TILE), ty = Math.floor(enemy.y / TILE), cell = ty * COLS + tx;
      let best = cell, cost = this.pathField[cell] < 0 ? Infinity : this.pathField[cell];
      for (const [x, y] of [[tx - 1, ty], [tx + 1, ty], [tx, ty - 1], [tx, ty + 1]]) {
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
        const next = y * COLS + x, value = this.pathField[next];
        if (value >= 0 && value < cost) { best = next; cost = value; }
      }
      if (best !== cell) routeAngle = Math.atan2(Math.floor(best / COLS) * TILE + 8 - enemy.y, best % COLS * TILE + 8 - enemy.x);
    }
    if (enemy.type === 'boss') {
      const profile = bossProfiles[this.dungeon.id], seal = sealDefinitions[profile.seal];
      if (enemy.hp < enemy.maxHp * .5 && enemy.phase === 1) { enemy.phase = 2; enemy.stun = .7; this.shake = 10; this.say(`${profile.name}: PHASE II. Beware ${seal.power}.`, 5); this.burst(enemy.x, enemy.y, profile.color, 45, 120); }
      const stop = ['frostkeep', 'astral', 'hollows'].includes(this.dungeon.id) ? 100 : 35;
      if (enemy.windup > 0) { enemy.windup -= dt; if (enemy.windup <= 0) this.guardianAttack(enemy); }
      else {
        if (d > stop) this.move(enemy, Math.cos(routeAngle) * (enemy.phase === 2 ? 43 : 29) * dt, Math.sin(routeAngle) * (enemy.phase === 2 ? 43 : 29) * dt);
        if (enemy.cooldown <= 0 && canSee) {
          enemy.aim = angle; enemy.targetX = p.x; enemy.targetY = p.y; enemy.windup = .85; enemy.cooldown = enemy.phase === 2 ? 2.8 : 3.5; enemy.pattern++;
          this.effects.push({ x: p.x, y: p.y, type: 'mark', radius: this.dungeon.id === 'foundry' ? 64 : 43, color: profile.color, angle: 0, life: .85, maxLife: .85 });
        }
      }
    } else {
      const ranged = ['archer', 'wraith', 'imp', 'spider', 'shroom'].includes(enemy.type);
      const stop = ranged ? enemy.type === 'shroom' ? 80 : 105 : 14;
      let speed = (enemyDefinitions[enemy.type].speed + Math.min(12, this.floor * 1.1)) * (enemy.slow > 0 ? .55 : 1) * (enemy.elite ? 1.12 : 1);
      if (enemy.elite) {
        enemy.skillTime -= dt;
        if (enemy.skillTime <= 0 && canSee && d < 210) {
          for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + this.elapsed; this.projectiles.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * 75, vy: Math.sin(a) * 75, damage: 9, life: 2, friendly: false, style: 'arcane', color: enemy.eliteColor, hit: new Set() }); }
          this.effects.push({ x: enemy.x, y: enemy.y, type: 'nova', radius: 42, angle: 0, color: enemy.eliteColor, life: .5, maxLife: .5 }); enemy.skillTime = 4.2;
        }
      }
      if (enemy.type === 'slime') speed *= Math.sin(this.elapsed * 4 + enemy.id) > .3 ? 2.1 : .15;
      const direction = routeAngle + (canSee && enemy.type === 'bat' ? Math.sin(this.elapsed * 5 + enemy.id) * .9 : canSee && enemy.type === 'goblin' && d > 50 ? Math.sin(this.elapsed * 2 + enemy.id) * .8 : 0);
      if (enemy.windup > 0) {
        enemy.windup -= dt;
        if (enemy.windup <= 0) this.mobAttack(enemy);
      } else {
        if (d > stop || !canSee) this.move(enemy, Math.cos(direction) * speed * dt, Math.sin(direction) * speed * dt, enemy.type === 'bat');
        else if (ranged && d < 55) this.move(enemy, -Math.cos(angle) * speed * .7 * dt, -Math.sin(angle) * speed * .7 * dt);
        if (enemy.cooldown <= 0 && d < (enemy.type === 'goblin' ? 70 : 230) && (ranged || enemy.type === 'sentinel' || enemy.type === 'goblin') && canSee) {
          enemy.aim = angle; enemy.windup = enemy.type === 'sentinel' ? .8 : enemy.type === 'goblin' ? .25 : .5;
          enemy.cooldown = enemy.type === 'archer' ? 2.1 : enemy.type === 'shroom' ? 3.7 : 2.8;
        }
      }
      // Keep packs readable instead of allowing every monster to occupy the same pixel.
      for (const other of this.enemies) {
        if (other === enemy || other.hp <= 0) continue;
        const apart = distance(enemy, other);
        if (apart > 0 && apart < 12) this.move(enemy, (enemy.x - other.x) / apart * dt * 18, (enemy.y - other.y) / apart * dt * 18);
      }
    }
    if (canSee && d < (enemy.type === 'boss' ? 32 : enemy.elite || enemy.type === 'sentinel' ? 21 : 15)) this.hurt(enemyDefinitions[enemy.type].damage * (enemy.elite ? 1.35 : 1) + Math.floor((this.floor - 1) * .6));
    const ground = this.tile(enemy.x, enemy.y);
    const immune = enemy.type === 'bat' || enemy.type === 'wraith' || this.dungeon.hazard === 'poison' && ['slime', 'spider', 'shroom'].includes(enemy.type) || this.dungeon.hazard === 'lava' && ['imp', 'sentinel'].includes(enemy.type);
    if (!immune && (ground === 2 && ['lava', 'poison', 'void'].includes(this.dungeon.hazard) || ground === 3 && Math.sin(this.elapsed * 2.6) > .1) && Math.random() < dt * 1.5) this.hitEnemy(enemy, 12, 0, false, false);
  }

  private updateHero(dt: number) {
    const p = this.player;
    if (p.hp <= 0) { this.keys.clear(); this.mouse.down = false; p.moving = false; return; }
    this.noticeTime -= dt; this.hazardCooldown -= dt; this.hurtFlash -= dt;
    this.lootTime -= dt; this.damageBuff -= dt; this.staminaDelay -= dt;
    this.levelNoticeTime -= dt; this.comboWindow -= dt;
    this.cooldowns = this.cooldowns.map(value => Math.max(0, value - dt)); this.sealCooldown = Math.max(0, this.sealCooldown - dt);
    p.ascended = Math.max(0, p.ascended - dt); p.ward = Math.max(0, p.ward - dt);
    p.extra1 = Math.max(0, p.extra1 - dt); p.extra2 = Math.max(0, p.extra2 - dt);
    p.eclipse = Math.max(0, p.eclipse - dt); p.rage = Math.max(0, p.rage - dt); p.slow = Math.max(0, p.slow - dt);
    let boostChanged = false;
    boosts.forEach(boost => { if (this.activeBoosts[boost.id] > 0) { this.activeBoosts[boost.id] = Math.max(0, this.activeBoosts[boost.id] - dt); boostChanged = true; } });
    boosts.forEach(boost => { this.runBoosts[boost.id] = Math.max(0, this.runBoosts[boost.id] - dt); });
    if (boostChanged) { this.boostSaveTime += dt; if (this.boostSaveTime >= 1 || !boosts.some(boost => this.activeBoosts[boost.id] > 0)) { this.emitBoosts(); this.boostSaveTime = 0; } }
    if (this.hasBoost('renewal')) this.heal(dt * 2);
    if (this.character.id === 'phantom') this.heal(dt * 100);
    p.stamina = Math.min(p.stamina, this.maxStamina);
    if (this.infiniteStamina) p.stamina = this.maxStamina;
    else if (this.staminaDelay <= 0) p.stamina = Math.min(this.maxStamina, p.stamina + dt * 22 * (this.hasBoost('vigor') ? 2 : 1) * (this.character.id === 'monk' ? 1.5 : 1) * (1 + (this.charms.lantern || 0) * .2));
    p.energy = Math.min(this.maxEnergy, p.energy + dt * resourceFor(this.character).regen * (1 + (this.charms.lantern || 0) * .2) * (this.hasBoost('clarity') ? 2 : 1));
    p.invulnerable -= dt; p.attack -= dt; p.special = Math.max(0, p.special - dt); p.dodge = Math.max(0, p.dodge - dt);
    this.shake = Math.max(0, this.shake - dt * 24);
    const b = this.settings.bindings;
    const dx = Number(this.held('right', 'ArrowRight')) - Number(this.held('left', 'ArrowLeft'));
    const dy = Number(this.held('down', 'ArrowDown')) - Number(this.held('up', 'ArrowUp'));
    p.moving = !!(dx || dy);
    const sprinting = p.moving && this.keys.has(b.sprint) && (p.stamina > 1 || this.infiniteStamina);
    if (sprinting && !this.infiniteStamina) { p.stamina = Math.max(0, p.stamina - dt * 20); this.staminaDelay = .65; }
    this.ambienceTime += dt;
    if (this.ambienceTime > .15) {
      this.ambienceTime = 0;
      if (this.character.id === 'phantom') { this.burst(p.x, p.y + 8, '#8061b7', p.moving ? 4 : 1, 18); if (p.moving) this.effects.push({ x: p.x, y: p.y, type: 'smoke', radius: 15, life: .45, maxLife: .45, angle: p.facing, color: '#8d6dbb' }); }
      if (p.eclipse > 0) this.enemies.forEach(e => { if (distance(e, p) < 115) this.hitEnemy(e, 110, 30); });
      if (this.dungeon.id === 'hollows') this.burst(p.x + rand(-170, 170), p.y + rand(-100, 100), '#77b89e', 1, 7);
      else if (this.dungeon.id === 'foundry') this.burst(p.x + rand(-160, 160), p.y + rand(-110, 110), '#dc9652', 1, 16);
      else if (this.dungeon.id === 'drowned') this.burst(p.x + rand(-170, 170), p.y + rand(-100, 100), '#79becd', 1, 8);
      if (resourceFor(this.character).kind === 'blood') this.burst(p.x, p.y + 5, p.ascended > 0 ? '#ffb0a0' : '#bc615b', 2, 20);
      if (['frostkeep', 'dynasty', 'astral'].includes(this.dungeon.id)) this.burst(p.x + rand(-180, 180), p.y + rand(-105, 105), this.dungeon.color, 1, 9);
    }
    this.footstepTime -= dt;
    if (p.moving && this.footstepTime <= 0 && !['rogue', 'phantom'].includes(this.character.id) && p.dash <= 0) { this.audio.play('step'); this.footstepTime = sprinting ? .25 : .36; }
    this.followUps.forEach(strike => {
      strike.time -= dt;
      if (strike.time <= 0 && strike.enemy.hp > 0 && distance(strike.enemy, p) < 62) this.hitEnemy(strike.enemy, strike.damage, 20, strike.critical);
    });
    this.followUps = this.followUps.filter(strike => strike.time > 0);
    if (p.dash > 0) {
      const speed = this.character.id === 'phantom' ? 420 : p.bash ? 290 : 270;
      this.move(p, Math.cos(p.facing) * speed * dt, Math.sin(p.facing) * speed * dt, p.bash);
      p.dash -= dt;
      if (p.bash) {
        this.enemies.forEach(e => { if (e.hp > 0 && e.stun < 1 && distance(e, p) < 28) { this.hitEnemy(e, 42, 230); e.stun = 2; this.shake = 8; this.audio.play('hit'); } });
        this.objects.forEach(o => { if (o.type === 'barricade' && distance(o, p) < 23) this.hitObject(o, 100); });
      }
      if (Math.random() < 0.6) this.burst(p.x, p.y, p.bash ? '#b6a074' : '#736c71', 1, 12);
    } else if (dx || dy) {
      const magnitude = Math.hypot(dx, dy);
      const terrain = this.tile(p.x, p.y) === 2 && ['water', 'ice', 'sand'].includes(this.dungeon.hazard);
      const terrainImmune = this.character.id === 'tidecaller' && ['water', 'ice'].includes(this.dungeon.hazard) || this.character.id === 'frostguard' && this.dungeon.hazard === 'ice' || this.character.id === 'duneblade' && this.dungeon.hazard === 'sand';
      const speed = this.character.speed * (sprinting ? 1.55 : 1) * (p.ascended > 0 ? 1.18 : 1) * (this.hasBoost('haste') ? 1.2 : 1) * (terrain && !terrainImmune ? .78 : 1) * (p.slow > 0 && !['plague', 'phantom'].includes(this.character.id) ? .6 : 1);
      this.move(p, dx / magnitude * speed * dt, dy / magnitude * speed * dt);
      if (!this.mouse.active) p.facing = Math.atan2(dy, dx);
    }
    if (this.mouse.active && p.dash <= 0) p.facing = Math.atan2(this.mouse.y + this.camera.y - p.y, this.mouse.x + this.camera.x - p.x);
    if (this.aim && this.currentGuest && p.dash <= 0) p.facing = Math.atan2(this.aim.y - p.y, this.aim.x - p.x);
    if (this.keys.has(b.attack) || this.mouse.down) this.attack();
    this.updateSwings(dt);
    for (const cast of this.delayedCasts) {
      cast.time -= dt;
      if (cast.time <= 0) {
        this.enemies.forEach(enemy => { if (distance(enemy, cast) < cast.radius) { this.hitEnemy(enemy, cast.damage, 180); enemy.stun = 1.5; } });
        this.effects.push({ x: cast.x, y: cast.y, radius: cast.radius, type: 'blast', color: cast.color, life: .6, maxLife: .6, angle: 0 });
        this.burst(cast.x, cast.y, cast.color, 38, 140); this.audio.play('special'); this.shake = 8;
      }
    }
    this.delayedCasts = this.delayedCasts.filter(cast => cast.time > 0);

    const ground = this.tile(p.x, p.y);
    if (this.hazardCooldown <= 0) {
      if (ground === 2 && ['lava', 'poison', 'void'].includes(this.dungeon.hazard) && !(this.character.id === 'plague' && this.dungeon.hazard === 'poison')) { this.hurt(10, false); this.hazardCooldown = 0.8; }
      if (ground === 3 && Math.sin(this.elapsed * 2.6) > 0.1) { this.hurt(13); this.hazardCooldown = 0.8; }
      if (ground === 4 && p.dash <= 0) {
        this.hurt(9, false); this.burst(p.x, p.y, '#80755b', 12);
        const nearest = this.rooms.reduce((a, r) => distance({ x: r.cx, y: r.cy }, p) < distance({ x: a.cx, y: a.cy }, p) ? r : a);
        p.x = nearest.cx; p.y = nearest.cy; this.hazardCooldown = 2;
        this.say('A rotten trapdoor gives way. Watch your step.', 3);
      }
    }
  }

  private update(dt: number) {
    this.elapsed += dt; this.floorElapsed += dt;
    if (this.guestActor && Date.now() - this.lastGuestInput > 1800) this.guestActor.keys.clear();
    this.updateHero(dt);
    if (this.guestActor) this.withGuest(() => this.updateHero(dt));
    const p = this.player;
    if (this.pendingEnd) { const outcome = this.pendingEnd; this.pendingEnd = null; this.finish(outcome); return; }
    if (this.ended) return;
    for (const trap of this.traps) {
      if (distance(trap, p) > 380 && (!this.guestActor || distance(trap, this.guestActor.player) > 380)) continue;
      updateTrap(trap, dt, {
        area: (x, y, radius, damage, slow, pull) => {
          const center = { x, y };
          const affect = () => {
            const body = this.player, d = distance(center, body); if (body.hp <= 0 || d >= radius) return;
            const immune = this.character.id === 'plague' && ['spores', 'roots'].includes(trap.kind) || this.character.id === 'duneblade' && trap.kind === 'quicksand' || ['tidecaller', 'frostguard'].includes(this.character.id) && trap.kind === 'icicles';
            if (slow && !immune) body.slow = Math.max(body.slow, slow);
            if (!pull || d < 15) this.hurt(damage, trap.kind === 'crusher' || trap.kind === 'shark');
            if (pull && d > 3 && body.dash <= 0) this.move(body, (x - body.x) / d * 33 * dt, (y - body.y) / d * 33 * dt);
          };
          affect(); this.withGuest(affect);
          this.enemies.forEach(enemy => { if (enemy.hp > 0 && enemy.flash <= 0 && distance(enemy, center) < radius && (!pull || distance(enemy, center) < 15)) this.hitEnemy(enemy, damage, 0, false, false); });
        },
        shoot: (x, y, angle, color, poison) => this.projectiles.push({ x, y, vx: Math.cos(angle) * (poison ? 60 : 190), vy: Math.sin(angle) * (poison ? 60 : 190), life: 2, friendly: false, damage: poison ? 7 : 12, style: poison ? 'poison' : 'arrow', color, hit: new Set() }),
        burst: (x, y, color, count, power) => this.burst(x, y, color, count, power),
      });
    }
    if (this.ended) return;
    this.pathTime -= dt;
    if (this.pathTime <= 0) { this.updatePaths(); this.pathTime = .4; }
    for (const enemy of [...this.enemies]) { if (this.ended) break; this.updateEnemy(enemy, dt); }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (this.ended) return;

    for (const o of this.objects) {
      if (this.ended) break;
      if (o.opened) continue;
      if (o.type === 'portal' && !this.portalWarned && distance(o, p) < 170) {
        this.portalWarned = true; this.say(`${bossProfiles[this.dungeon.id].warning} Enter the portal when you are ready.`, 8); this.audio.play('door');
      }
      if (o.hidden && (distance(o, p) < 74 || this.guestActor && distance(o, this.guestActor.player) < 74)) { o.hidden = false; this.say('A hidden chest emerges from the shadows.', 3); this.burst(o.x, o.y, '#c5b17a', 8); }
      if (o.type === 'coin' || o.type === 'ember') {
        const guestNear = this.guestActor && this.guestActor.player.hp > 0 && (p.hp <= 0 || distance(o, this.guestActor.player) < distance(o, p));
        const target = guestNear ? this.guestActor!.player : p;
        const d = distance(o, target);
        if (target.hp > 0 && d < (this.hasBoost('magnet') ? 180 : 75)) { const a = Math.atan2(target.y - o.y, target.x - o.x); o.x += Math.cos(a) * 170 * dt; o.y += Math.sin(a) * 170 * dt; }
        if (d < 12) {
          o.opened = true;
          if (o.type === 'coin') { this.collectGold(o.value); this.audio.play('coin'); }
          else { target.special = Math.max(0, target.special - 1.8); target.energy += 18; this.text(target.x, target.y - 20, '+18 ENERGY', '#91bde3'); }
        }
      }
      if (o.type === 'barrel') {
        this.move(o, o.vx * dt, o.vy * dt, true); o.vx *= 1 - dt * 3; o.vy *= 1 - dt * 3;
        if (o.fuse >= 0) { o.fuse -= dt; if (o.fuse < 0) { o.opened = true; this.explode(o.x, o.y, 62, 95); } }
      }
      if (o.type === 'blade' && distance(o, p) < 320) {
        const bx = o.x + Math.sin(this.elapsed * 2) * 43;
        if (distance({ x: bx, y: o.y }, p) < 12) this.hurt(15);
        this.enemies.forEach(e => { if (e.flash <= 0 && Math.hypot(e.x - bx, e.y - o.y) < 15) this.hitEnemy(e, 20, 0, false, false); });
      }
      if (o.type === 'vent' && distance(o, p) < 320 && Math.sin(this.elapsed * 1.5 + o.id) > .65) {
        if (distance(o, p) < 24) this.hurt(11, false);
        if (Math.random() < dt * 16) this.burst(o.x, o.y - 3, '#eea34f', 2, 35);
        this.enemies.forEach(e => { if (!['imp', 'sentinel'].includes(e.type) && e.flash <= 0 && distance(e, o) < 25) this.hitEnemy(e, 15); });
      }
    }
    if (this.ended) return;
    for (const zone of this.zones) {
      zone.life -= dt; zone.tick -= dt;
      if (zone.hostile) {
        const affect = () => { const body = this.player; if (body.hp > 0 && distance(zone, body) < zone.radius) { if (zone.tick <= 0) this.hurt(zone.damage || 8, false); if ((zone.kind === 'water' || zone.kind === 'gravity') && body.dash <= 0) { const d = Math.max(5, distance(zone, body)); this.move(body, (zone.x - body.x) / d * dt * 28, (zone.y - body.y) / d * dt * 28); } } };
        affect(); this.withGuest(affect);
        if (zone.tick <= 0) zone.tick = .7;
        continue;
      }
      if (zone.kind === 'gravity' && this.character.id === 'phantom') this.projectiles = this.projectiles.filter(bullet => bullet.friendly || distance(bullet, zone) > zone.radius);
      const affectZone = () => this.enemies.forEach(enemy => {
        if (enemy.hp <= 0 || distance(enemy, zone) > zone.radius) return;
        if (zone.kind === 'gravity' || zone.kind === 'water' || this.character.id === 'ranger') { const angle = Math.atan2(zone.y - enemy.y, zone.x - enemy.x); if (distance(enemy, zone) > 8) this.move(enemy, Math.cos(angle) * 70 * dt, Math.sin(angle) * 70 * dt); }
        enemy.slow = .65;
        if (zone.tick <= 0) this.hitEnemy(enemy, (zone.damage || (zone.kind === 'gravity' ? 28 : 18)) * this.damageMultiplier);
      });
      if (zone.owner === 'guest') this.withGuest(affectZone); else affectZone();
      if (zone.tick <= 0) { zone.tick = .5; this.burst(zone.x, zone.y, zone.kind === 'gravity' ? '#b698e5' : '#a9c876', 6, 75); }
    }
    this.zones = this.zones.filter(zone => zone.life > 0);
    if (this.ended) return;
    for (const bullet of this.projectiles) {
      if (this.ended) break;
      if (bullet.delay && bullet.delay > 0) { bullet.delay -= dt; continue; }
      bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt;
      if (!this.tile(bullet.x, bullet.y)) { bullet.life = 0; this.burst(bullet.x, bullet.y, bullet.color || '#e59f44', 5); continue; }
      if (bullet.friendly) {
        const resolve = () => this.enemies.forEach(e => {
          if (e.hp > 0 && bullet.life > 0 && !bullet.hit.has(e.id) && distance(e, bullet) < (e.type === 'boss' ? 25 : bullet.style === 'shadow' ? 19 : 13)) {
            bullet.hit.add(e.id); this.hitEnemy(e, bullet.damage, bullet.style === 'shadow' ? 100 : 20);
            if (bullet.style === 'fire' || bullet.style === 'poison') e.burn = bullet.style === 'poison' ? 5 : 3;
            if (bullet.style === 'ice') e.slow = 3;
            if (bullet.style === 'lightning' && !bullet.chained) {
              bullet.chained = true;
              this.enemies.filter(other => other.hp > 0 && other !== e && distance(other, e) < 90).sort((a, b) => distance(a, e) - distance(b, e)).slice(0, 2).forEach(other => {
                this.hitEnemy(other, bullet.damage * .7, 10); bullet.hit.add(other.id);
                this.effects.push({ x: other.x, y: other.y, type: 'lightning', radius: 35, angle: 0, life: .25, maxLife: .25, color: '#b7e4fa' });
              });
            }
            if (bullet.pierce !== undefined) { bullet.pierce--; if (bullet.pierce <= 0) bullet.life = 0; }
          }
        });
        if (bullet.owner === 'guest') this.withGuest(resolve); else resolve();
        this.objects.forEach(o => { if (!o.opened && !bullet.hit.has(o.id) && distance(o, bullet) < 10 && ['barrel', 'barricade', 'chandelier', 'urn'].includes(o.type)) { bullet.hit.add(o.id); this.hitObject(o, bullet.damage); } });
        if (Math.random() < 0.7) this.burst(bullet.x, bullet.y, bullet.color || '#c25e27', 1, 8);
      } else {
        const affect = () => { const body = this.player; if (body.hp > 0 && bullet.life > 0 && distance(bullet, body) < 10) { const vulnerable = body.invulnerable <= 0; this.hurt(bullet.damage, bullet.style === 'arrow'); if (vulnerable && (bullet.style === 'poison' && !['plague', 'phantom'].includes(this.character.id) || bullet.style === 'ice' && !['tidecaller', 'frostguard', 'phantom'].includes(this.character.id))) body.slow = 2.5; bullet.life = 0; } };
        affect(); this.withGuest(affect);
      }
    }
    this.projectiles = this.projectiles.filter(bullet => bullet.life > 0);
    this.particles.forEach(part => { part.x += part.vx * dt; part.y += part.vy * dt; part.vy += dt * 30; part.life -= dt; });
    this.particles = this.particles.filter(part => part.life > 0);
    this.effects.forEach(e => { e.life -= dt; if (e.type === 'nova') this.projectiles = this.projectiles.filter(bullet => bullet.friendly || distance(e, bullet) > e.radius * (1 - e.life / e.maxLife)); });
    this.effects = this.effects.filter(e => e.life > 0);
    this.texts.forEach(text => { text.y -= dt * 16; text.life -= dt; }); this.texts = this.texts.filter(text => text.life > 0);
    const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    for (let y = ty - 8; y <= ty + 8; y++) for (let x = tx - 9; x <= tx + 9; x++) if (x >= 0 && y >= 0 && x < COLS && y < ROWS && Math.hypot(x - tx, y - ty) < 10) this.explored.add(y * COLS + x);
    if (this.guestActor) {
      const gx = Math.floor(this.guestActor.player.x / TILE), gy = Math.floor(this.guestActor.player.y / TILE);
      for (let y = gy - 8; y <= gy + 8; y++) for (let x = gx - 9; x <= gx + 9; x++) if (x >= 0 && y >= 0 && x < COLS && y < ROWS && Math.hypot(x - gx, y - gy) < 10) this.explored.add(y * COLS + x);
    }
    const targetX = Math.max(0, Math.min(COLS * TILE - this.viewWidth, p.x - this.viewWidth / 2));
    const targetY = Math.max(0, Math.min(ROWS * TILE - this.viewHeight, p.y - this.viewHeight / 2));
    this.camera.x += (targetX - this.camera.x) * Math.min(1, dt * 8);
    this.camera.y += (targetY - this.camera.y) * Math.min(1, dt * 8);
  }

  private makeHUD(): GameHUD {
    const p = this.player, object = this.interactable();
    const boss = this.enemies.find(e => e.type === 'boss' && e.hp > 0);
    const elite = this.enemies.filter(e => e.elite && e.hp > 0 && distance(e, p) < 180 && this.lineOfSight(e, p)).sort((a, b) => distance(a, p) - distance(b, p))[0];
    const hints: Record<string, string> = { chest: `OPEN ${object ? chestRarities[object.rarity].name.toUpperCase() : ''} CHEST`, stairs: 'DESCEND TO NEXT FLOOR', portal: 'ENTER GUARDIAN PORTAL / NO KEYS REQUIRED', onward: 'LEAVE THE ARENA / CONTINUE DESCENT', barrel: 'KICK EXPLOSIVE BARREL', chandelier: 'DROP CHANDELIER', brazier: 'IGNITE BRAZIER / RESTORE STAMINA', shrine: 'BLESSING / RESTORE HEALTH', urn: 'BREAK URN / FIND GOLD', seal: 'CLAIM BOSS SEAL / RUN ONLY' };
    const statuses = [p.eclipse > 0 ? `Eclipse Dominion ${Math.ceil(p.eclipse)}s` : '', p.ascended > 0 ? `Ascended ${Math.ceil(p.ascended)}s` : '', p.ward > 0 ? `Protected ${Math.ceil(p.ward)}s` : '', p.rage > 0 ? `Bloodrage ${Math.ceil(p.rage)}s` : '', this.damageBuff > 0 ? `Empowered ${Math.ceil(this.damageBuff)}s` : '', p.slow > 0 ? `Slowed ${Math.ceil(p.slow)}s` : ''].filter(Boolean);
    const active = emptyBoosts(); boosts.forEach(boost => { active[boost.id] = Math.max(this.activeBoosts[boost.id], this.runBoosts[boost.id]); });
    const resource = resourceFor(this.character);
    const other = this.currentGuest ? this.hostDuringGuest : this.guestActor;
    const partner = this.session?.quest ? this.currentGuest ? this.session.quest.host : this.session.quest.guest : null;
    return { hp: Math.ceil(p.hp), maxHp: p.maxHp, floor: this.floor, gold: this.gold, kills: this.kills, special: p.special, specialMax: this.specialMax, dodge: p.dodge, seconds: this.elapsed, hint: other?.player.hp === 0 && distance(other.player, p) < 44 ? 'REVIVE YOUR COMPANION' : object ? hints[object.type] : '', notice: this.noticeTime > 0 ? this.notice : '', floorName: this.layoutName, floorTime: this.floorElapsed, boss: boss ? { name: bossProfiles[this.dungeon.id].name, hp: boss.hp, maxHp: boss.maxHp, phase: boss.phase } : null, stamina: Math.floor(p.stamina), maxStamina: this.maxStamina, infiniteStamina: this.infiniteStamina, shards: this.shards, dungeon: this.dungeon.name, extra1: p.extra1, extra2: p.extra2, activeBoosts: active, statuses, loot: this.lootTime > 0 ? this.loot : null, heroProgress: structuredClone(this.mastery), xpNext: xpToNext(this.mastery.level), energy: Math.floor(p.energy), maxEnergy: this.maxEnergy, resource: resource.name, cooldowns: [Math.max(0, p.attack), Math.max(0, p.special), ...this.cooldowns.slice(2)], nextBoss: nextBossFloor(this.floor, this.bossDefeated), bossDefeated: this.bossDefeated, seals: [...this.seals], equippedSeal: this.equippedSeal, sealCooldown: this.sealCooldown, charms: { ...this.charms }, levelNotice: this.levelNoticeTime > 0 ? this.levelNotice : '', track: this.audio.trackName, stage: this.stage, biome: this.dungeon.id, elitesSlain: this.elitesSlain, objective: this.stage === 'dungeon' ? isBossFloor(this.floor) ? 'Find the guardian portal' : 'Find the descent' : this.stage === 'cleared' ? 'Collect your spoils. The onward portal is open.' : 'Face the guardian', elite: elite ? { name: elite.elite!, hp: elite.hp, maxHp: elite.maxHp, color: elite.eliteColor } : null, party: other && partner ? { name: partner.name, hero: other.character.id, hp: Math.ceil(other.player.hp), maxHp: other.player.maxHp, host: !this.currentGuest, paused: this.currentGuest ? this.paused : this.remotePaused, bossReady: this.currentGuest ? this.guestBossReady : this.localBossReady, waiting: false } : undefined };
  }

  private sendHUD() {
    if (this.currentGuest) return;
    if (this.isGuest) { if (this.lastRemoteHUD) this.callbacks.onHUD(this.lastRemoteHUD); return; }
    this.callbacks.onHUD(this.makeHUD());
  }

  private drawObject(o: WorldObject, time: number) {
    if (o.hidden || (o.opened && !['chest', 'brazier', 'shrine'].includes(o.type))) return;
    const ctx = this.ctx, x = Math.round(o.x), y = Math.round(o.y);
    const rect = (color: string, dx: number, dy: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x + dx, y + dy, w, h); };
    if (o.type === 'chest') {
      const rarity = chestRarities[o.rarity];
      rect('#10150f', -10, 3, 21, 6); rect(rarity.dark, -9, -7, 19, 13); rect(rarity.color, -9, -7, 19, 2);
      rect(rarity.color, -6, -5, 2, 10); rect(rarity.color, 5, -5, 2, 10); rect('#222016', -9, -1, 19, 2);
      rect(o.opened ? '#191c14' : rarity.color, -1, -1, 3, 4);
      if (o.opened) { rect(rarity.dark, -9, -11, 19, 5); rect(rarity.color, -9, -11, 19, 1); }
      else {
        if (Math.sin(time * 2 + o.id) > .7) { rect(rarity.color, 3, -13, 1, 5); rect('#e8e0c5', 1, -11, 5, 1); }
        if (o.rarity === 'legendary' || o.rarity === 'epic') { rect(rarity.color, -11, -3, 2, 8); rect(rarity.color, 10, -3, 2, 8); rect(rarity.color, -4, -11, 9, 3); rect('#f8e8be', -1, -12, 3, 3); }
      }
    } else if (o.type === 'seal' && o.seal) {
      const color = sealDefinitions[o.seal.kind].color, bob = Math.round(Math.sin(time * 3) * 3);
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = .65;
      ctx.beginPath(); ctx.ellipse(x, y + 7, 17, 6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      rect('#30213f', -7, -20 + bob, 15, 16); rect(color, -7, -20 + bob, 15, 2); rect(color, -7, -6 + bob, 15, 2);
      rect(color, -9, -18 + bob, 2, 12); rect(color, 8, -18 + bob, 2, 12); rect('#f5e8ca', -1, -19 + bob, 3, 13); rect(color, -5, -14 + bob, 11, 2);
      for (let n = 0; n < 6; n++) { const a = time + n * Math.PI / 3; rect(color, Math.round(Math.cos(a) * 18), -13 + Math.round(Math.sin(a) * 11), 2, 2); }
      ctx.font = '6px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText('SEAL', x, y - 28 + bob);
    } else if (o.type === 'barrel') {
      rect('#211c15', -6, -7, 13, 16); rect(o.fuse >= 0 && Math.sin(time * 30) > 0 ? '#cc7949' : '#815333', -6, -8, 12, 14);
      rect('#a57144', -4, -7, 2, 13); rect('#3d4037', -7, -5, 14, 2); rect('#3d4037', -7, 2, 14, 2);
      rect('#cd7b45', -1, -11, 2, 4); rect('#efc771', 0, -12, 1, 2);
    } else if (o.type === 'barricade') {
      rect('#654629', -12, -5, 25, 4); rect('#9b7647', -11, -5, 23, 1); rect('#765334', -12, 2, 25, 4);
      rect('#b09357', -8, -8, 3, 17); rect('#b09357', 6, -8, 3, 17);
    } else if (o.type === 'portal' || o.type === 'onward') {
      const color = o.type === 'portal' ? bossProfiles[this.dungeon.id].color : '#a1d5b3';
      rect('#1b1e24', -18, -9, 38, 16); rect('#5b5644', -23, 8, 48, 4); rect('#b29d65', -17, 8, 36, 1);
      ctx.fillStyle = '#0d0b1e'; ctx.beginPath(); ctx.ellipse(x, y - 20, 20, 31, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 5; i++) { ctx.strokeStyle = i % 2 === 0 ? color : '#665a85'; ctx.lineWidth = i === 0 ? 2 : 1; ctx.beginPath(); ctx.ellipse(x, y - 20, 22 - i * 3, 33 - i * 4, Math.sin(time * .8 + i) * .08, time * (i % 2 ? -1 : 1) + i, time * (i % 2 ? -1 : 1) + i + Math.PI * 1.65); ctx.stroke(); }
      for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9 + time; rect(color, Math.round(Math.cos(a) * 26), Math.round(-20 + Math.sin(a) * 37), 2, 3); }
      ctx.font = '6px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(o.type === 'portal' ? 'GUARDIAN PORTAL' : 'ONWARD', x, y - 64);
    } else if (o.type === 'stairs') {
      rect('#111711', -17, -19, 35, 34); rect('#655b42', -20, -20, 4, 37); rect('#655b42', 17, -20, 4, 37);
      rect('#8a7850', -16, -24, 33, 5); rect('#4a4935', -20, -20, 4, 2); rect('#4a4935', 17, -20, 4, 2);
      for (let n = 0; n < 6; n++) rect(['#504934', '#443f2c', '#353526'][n % 3], -14 + n, 9 - n * 5, 28 - n * 2, 3);
    } else if (o.type === 'chandelier') {
      rect('#32352b', -1, -33, 2, 19); rect('#8b784a', -13, -16, 27, 3); rect('#655e37', -10, -12, 21, 3);
      for (let n = -9; n <= 9; n += 6) { rect('#d4c399', n, -21, 2, 6); rect('#efa643', n, -24, 2, 3); rect('#fff0a5', n, -23, 1, 2); }
      ctx.globalAlpha = 0.3; rect('#000000', -12, 2, 25, 5); ctx.globalAlpha = 1;
    } else if (o.type === 'coin') { rect('#9c702f', -3, -3, 6, 6); rect('#e8be58', -2, -4 + Math.round(Math.sin(time * 5)), 4, 5); rect('#fff0a1', -1, -3, 1, 3); }
    else if (o.type === 'ember') { rect('#c45626', -3, -4, 6, 6); rect('#f2a341', -2, -5 + Math.round(Math.sin(time * 4)), 4, 5); rect('#ffedb0', -1, -3, 2, 2); }
    else if (o.type === 'blade') {
      rect('#141a16', -47, -1, 94, 3); rect('#4b4d3b', -47, 1, 94, 1);
      const bx = Math.round(Math.sin(time * 2) * 43);
      rect('#7c8981', bx - 7, -4, 14, 8); rect('#c2c7aa', bx - 4, -7, 8, 14); rect('#464f46', bx - 3, -3, 6, 6);
      rect('#d2cfaf', bx - 8, -1, 2, 2); rect('#d2cfaf', bx + 6, -1, 2, 2);
    } else if (o.type === 'urn') {
      rect('#2d2920', -5, 2, 11, 4); rect('#7b6847', -5, -8, 10, 12); rect('#a08a5e', -3, -6, 3, 8); rect('#b09a6d', -4, -10, 8, 3); rect('#39372b', -2, -10, 4, 1);
    } else if (o.type === 'brazier') {
      rect('#4c4a39', -7, 2, 15, 4); rect('#72634a', -3, -5, 6, 8); rect('#8f7b51', -9, -7, 19, 3); rect('#443c2f', -6, -11, 13, 5);
      if (o.opened) { const flicker = Math.round(Math.sin(time * 10 + o.id) * 3); rect(this.dungeon.palette.torch, -5, -22 + flicker, 11, 14 - flicker); rect(this.dungeon.palette.torchCore, -2, -18, 5, 10); rect('#f4f0c3', -1, -14, 3, 6); }
      else { rect('#a1784f', -2, -10, 5, 1); if (Math.sin(time * 2) > .5) rect('#bfa570', -1, -16, 2, 2); }
    } else if (o.type === 'shrine') {
      rect('#3b483c', -11, 1, 23, 5); rect('#7b8267', -8, -1, 17, 3); rect('#5d6652', -5, -12, 11, 11);
      rect(o.opened ? '#617158' : '#8cbb9b', -3, -22, 7, 12); rect(o.opened ? '#718363' : '#d2eac1', -1, -24 + Math.round(Math.sin(time * 3)), 3, 12); rect('#a0a881', -7, -11, 15, 2);
    } else if (o.type === 'vent') {
      rect('#1a1513', -10, -6, 21, 13); rect('#7e5a3a', -11, -7, 23, 2); rect('#7e5a3a', -11, 6, 23, 2);
      for (let n = -7; n <= 7; n += 4) rect('#776148', n, -6, 2, 12);
      if (Math.sin(time * 1.5 + o.id) > .65) { for (let n = -6; n <= 6; n += 4) { const h = 12 + Math.round(Math.sin(time * 13 + n) * 7); rect('#e98939', n, -h, 3, h); rect('#f5c875', n + 1, -h + 4, 1, h - 4); } }
    }
  }

  private drawEffect(effect: Effect, time: number) {
    const ctx = this.ctx, progress = 1 - effect.life / effect.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.min(1, effect.life / effect.maxLife * 1.7);
    const color = effect.color || (effect.type === 'slash' ? '#e5d3a0' : '#f8b751');
    ctx.strokeStyle = color; ctx.lineWidth = effect.type === 'slash' ? 3 : 4;
    if (effect.type === 'slash' && effect.weapon) {
      drawWeaponSwing(ctx, effect.weapon, effect.x, effect.y, effect.angle, progress, effect.combo || 0, color, effect.radius);
    } else if (effect.type === 'mark') {
      ctx.globalAlpha = .45 + progress * .5; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(effect.x, effect.y, effect.radius, effect.radius * .6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(effect.x - 10, effect.y); ctx.lineTo(effect.x + 10, effect.y); ctx.moveTo(effect.x, effect.y - 10); ctx.lineTo(effect.x, effect.y + 10); ctx.stroke();
    } else if (effect.type === 'smoke') {
      ctx.globalAlpha *= .26;
      drawHero(ctx, 'phantom', effect.x, effect.y, time, true, effect.angle);
    } else if (effect.type === 'lightning') {
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(effect.x + 12, effect.y - effect.radius);
      for (let i = 1; i <= 5; i++) ctx.lineTo(effect.x + (i % 2 ? -7 : 9), effect.y - effect.radius + i * effect.radius / 5);
      ctx.stroke(); ctx.fillStyle = '#e9f3ff'; ctx.fillRect(effect.x - 3, effect.y - 3, 6, 6);
    } else if (['rift', 'eclipse', 'oblivion'].includes(effect.type)) {
      const radius = Math.max(5, effect.radius * (effect.type === 'rift' ? Math.sin(progress * Math.PI) : progress));
      ctx.fillStyle = effect.type === 'oblivion' ? 'rgba(32,14,59,.5)' : 'rgba(15,9,32,.6)';
      ctx.beginPath(); ctx.ellipse(effect.x, effect.y, radius, radius * .65, time * .1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1;
      for (let ring = 0; ring < 3; ring++) { ctx.beginPath(); ctx.ellipse(effect.x, effect.y, radius * (.45 + ring * .16), radius * (.32 + ring * .1), time * (ring % 2 ? -.4 : .4), 0, Math.PI * 2); ctx.stroke(); }
      for (let i = 0; i < 18; i++) {
        const angle = i * Math.PI / 9 + progress * 1.4;
        const x = effect.x + Math.cos(angle) * radius, y = effect.y + Math.sin(angle) * radius * .65;
        ctx.fillStyle = i % 3 === 0 ? '#eadbff' : color; ctx.fillRect(Math.round(x), Math.round(y), 3 + i % 3, 6 + i % 5);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(effect.x + Math.cos(angle + .16) * radius * .74, effect.y + Math.sin(angle + .16) * radius * .48); ctx.stroke();
      }
    } else {
      ctx.beginPath();
      if (effect.type === 'slash') ctx.arc(effect.x, effect.y, effect.radius * (.7 + progress * .3), effect.angle - 1.15 + progress * .8, effect.angle + .8 + progress * .5);
      else ctx.arc(effect.x, effect.y, Math.max(1, effect.radius * progress), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private render() {
    const ctx = this.ctx, time = this.elapsed;
    const WIDTH = this.viewWidth, HEIGHT = this.viewHeight;
    const palette = this.dungeon.palette;
    const shakeScale = this.paused || this.reducedMotion.matches ? 0 : this.settings.shake / 100;
    const cx = Math.round(this.camera.x + (Math.random() - 0.5) * this.shake * shakeScale), cy = Math.round(this.camera.y + (Math.random() - 0.5) * this.shake * shakeScale);
    ctx.fillStyle = '#090d0b'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.save(); ctx.translate(-cx, -cy);
    ctx.drawImage(this.mapCanvas, 0, 0);
    const x0 = Math.max(0, Math.floor(cx / TILE)), y0 = Math.max(0, Math.floor(cy / TILE));
    const x1 = Math.min(COLS, x0 + WIDTH / TILE + 2), y1 = Math.min(ROWS, y0 + HEIGHT / TILE + 2);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const tile = this.tiles[y * COLS + x], px = x * TILE, py = y * TILE;
      if (tile === 2) {
        ctx.fillStyle = palette.hazard[0]; ctx.fillRect(px, py, 16, 16); ctx.fillStyle = palette.hazard[1]; ctx.fillRect(px + 1, py + 2, 14, 12);
        ctx.fillStyle = palette.hazard[2];
        for (let n = 0; n < 3; n++) ctx.fillRect(px + ((Math.floor(time * 4) + x * 3 + n * 7) % 12), py + n * 5 + 2, 4, 2);
        ctx.fillStyle = palette.hazard[3]; ctx.fillRect(px, py + 14, 16, 1);
      } else if (tile === 3) {
        ctx.fillStyle = '#151c17'; ctx.fillRect(px + 1, py + 1, 14, 14);
        const active = Math.sin(time * 2.6) > 0.1;
        for (let n = 0; n < 3; n++) { ctx.fillStyle = active ? '#b0b49b' : '#4d5549'; ctx.fillRect(px + 3 + n * 4, py + (active ? 3 : 10), 1, active ? 8 : 2); ctx.fillStyle = '#737c69'; ctx.fillRect(px + 2 + n * 4, py + 9, 3, 3); }
      } else if (tile === 4) {
        ctx.fillStyle = '#0e1410'; ctx.fillRect(px + 1, py + 1, 14, 14); ctx.fillStyle = '#5b4830';
        ctx.fillRect(px, py, 16, 2); ctx.fillRect(px, py + 14, 16, 2); ctx.fillRect(px + 3, py + 1, 2, 14); ctx.fillRect(px + 10, py + 1, 2, 14);
      }
    }
    for (const torch of this.torches) {
      ctx.fillStyle = '#241d14'; ctx.fillRect(torch.x - 3, torch.y - 8, 6, 13); ctx.fillStyle = '#8b7443'; ctx.fillRect(torch.x - 4, torch.y - 7, 8, 3);
      const flicker = Math.round(Math.sin(time * 12 + torch.x) * 2);
      ctx.fillStyle = palette.torch; ctx.fillRect(torch.x - 3, torch.y - 17 + flicker, 6, 11 - flicker);
      ctx.fillStyle = palette.torch; ctx.fillRect(torch.x - 2, torch.y - 18 - flicker, 4, 10 + flicker); ctx.fillStyle = palette.torchCore; ctx.fillRect(torch.x - 1, torch.y - 12, 2, 5);
    }
    this.traps.filter(trap => Math.abs(trap.x - cx - WIDTH / 2) < WIDTH / 2 + 90 && Math.abs(trap.y - cy - HEIGHT / 2) < HEIGHT / 2 + 90).forEach(trap => drawTrap(ctx, trap));
    for (const zone of this.zones) {
      const colors = { gravity: ['rgba(106,71,151,.24)', '#b095d7'], poison: ['rgba(109,147,63,.24)', '#a4c987'], fire: ['rgba(200,88,34,.24)', '#eab175'], water: ['rgba(58,146,183,.24)', '#97d7df'] };
      ctx.save(); ctx.fillStyle = colors[zone.kind][0];
      ctx.strokeStyle = colors[zone.kind][1]; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(zone.x, zone.y, zone.radius, zone.radius * .66, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      for (let n = 0; n < 14; n++) { const angle = n * Math.PI / 7 + time; const radius = zone.radius * ((n % 4 + 1) / 4); ctx.fillStyle = colors[zone.kind][1]; ctx.fillRect(zone.x + Math.cos(angle) * radius, zone.y + Math.sin(angle) * radius * .66, 2, 2); }
      ctx.restore();
    }
    this.objects.filter(o => Math.abs(o.x - cx - WIDTH / 2) < WIDTH / 2 + 60 && Math.abs(o.y - cy - HEIGHT / 2) < HEIGHT / 2 + 60).forEach(o => this.drawObject(o, time));
    const entities = [
      ...this.enemies.map(e => ({ y: e.y, draw: () => {
        ctx.save();
        if (e.type === 'boss') drawBoss(ctx, this.dungeon.id, e.x, e.y, e.stun > 0 ? 0 : time, e.flash > 0, e.phase);
        else if (e.elite) {
          ctx.strokeStyle = e.eliteColor; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(e.x, e.y + 4, 22, 8, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.translate(e.x, e.y); ctx.scale(1.65, 1.65); drawEnemy(ctx, e.type, 0, 0, e.stun > 0 ? 0 : time, e.flash > 0, e.phase);
          ctx.fillStyle = e.eliteColor; for (let n = -1; n <= 1; n++) ctx.fillRect(n * 4, -28 - (n === 0 ? 2 : 0), 2, 4);
        } else drawEnemy(ctx, e.type, e.x, e.y, e.stun > 0 ? 0 : time, e.flash > 0, e.phase);
        ctx.restore();
        if (e.hp < e.maxHp && e.type !== 'boss') { ctx.fillStyle = '#251e16'; ctx.fillRect(e.x - 9, e.y - 22, 18, 2); ctx.fillStyle = '#b78554'; ctx.fillRect(e.x - 9, e.y - 22, 18 * e.hp / e.maxHp, 2); }
        if (e.stun > 0) { ctx.fillStyle = '#e9c66d'; ctx.fillRect(e.x - 5 + Math.sin(time * 8) * 5, e.y - 26, 3, 2); }
        if (e.slow > 0) { ctx.strokeStyle = this.character.style === 'ice' ? '#a9d9eb' : '#91b86e'; ctx.lineWidth = 1; ctx.strokeRect(e.x - 10, e.y - 15, 20, 20); }
        if (e.windup > 0 && e.stun <= 0) { ctx.strokeStyle = '#df9972'; ctx.globalAlpha = .7; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(e.aim) * (e.type === 'sentinel' ? 88 : 48), e.y + Math.sin(e.aim) * (e.type === 'sentinel' ? 88 : 48)); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = '#f0c08e'; ctx.fillRect(e.x - 1, e.y - 29, 2, 5); ctx.fillRect(e.x - 1, e.y - 22, 2, 2); }
      } })),
      { y: this.player.y, draw: () => {
        ctx.globalAlpha = !this.reducedMotion.matches && this.player.invulnerable > 0 && Math.floor(time * 16) % 2 === 0 ? 0.65 : 1;
        const swing = this.swings[this.swings.length - 1];
        if (this.player.hp <= 0) ctx.globalAlpha = .35;
        const networkPose = this.isGuest && ['slash', 'daggers', 'fists'].includes(this.character.style) && this.player.attack > 0 ? Math.max(.01, 1 - this.player.attack / this.character.attackRate) : 0;
        drawHero(ctx, this.character.id, this.player.x, this.player.y, time, this.player.moving, this.player.facing, this.hurtFlash > 0.2, swing ? 1 - swing.time / swing.total : networkPose);
        ctx.globalAlpha = 1;
      } },
      ...(this.guestActor || this.remoteVisual ? [{ y: (this.guestActor?.player || this.remoteVisual!.player).y, draw: () => {
        const body = this.guestActor?.player || this.remoteVisual!.player, hero = this.guestActor?.character.id || this.remoteVisual!.hero;
        const name = this.guestActor ? this.session?.quest?.guest.name || 'Companion' : this.remoteVisual!.name;
        ctx.strokeStyle = '#96d0c3'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(body.x, body.y + 5, 12, 5, 0, 0, Math.PI * 2); ctx.stroke();
        const definition = characters.find(c => c.id === hero)!;
        const pose = ['slash', 'daggers', 'fists'].includes(definition.style) && body.attack > 0 ? Math.max(.01, 1 - body.attack / definition.attackRate) : 0;
        ctx.globalAlpha = body.hp > 0 ? 1 : .35; drawHero(ctx, hero, body.x, body.y, time, body.moving, body.facing, false, pose); ctx.globalAlpha = 1;
        ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#b8e1d1'; ctx.fillText(body.hp > 0 ? name : 'DOWNED / INTERACT TO REVIVE', body.x, body.y - 30);
        ctx.fillStyle = '#18322a'; ctx.fillRect(body.x - 11, body.y - 26, 22, 2); ctx.fillStyle = '#92c4a0'; ctx.fillRect(body.x - 11, body.y - 26, 22 * Math.max(0, body.hp) / body.maxHp, 2);
      } }] : []),
    ].sort((a, b) => a.y - b.y);
    entities.forEach(e => e.draw());
    for (const effect of this.effects) this.drawEffect(effect, time);
    ctx.restore();

    // Subtractive light pools preserve the stone texture without brightening the whole dungeon.
    const light = this.lightCtx;
    light.globalCompositeOperation = 'source-over'; light.clearRect(0, 0, WIDTH, HEIGHT);
    light.fillStyle = palette.ambient; light.fillRect(0, 0, WIDTH, HEIGHT);
    light.globalCompositeOperation = 'destination-out';
    const glow = (x: number, y: number, radius: number, strength: number) => {
      if (x + radius < cx || x - radius > cx + WIDTH || y + radius < cy || y - radius > cy + HEIGHT) return;
      const gradient = light.createRadialGradient(x - cx, y - cy, 5, x - cx, y - cy, radius);
      gradient.addColorStop(0, `rgba(0,0,0,${strength})`); gradient.addColorStop(0.35, `rgba(0,0,0,${strength * 0.85})`); gradient.addColorStop(1, 'rgba(0,0,0,0)');
      light.fillStyle = gradient; light.fillRect(x - cx - radius, y - cy - radius, radius * 2, radius * 2);
    };
    glow(this.player.x, this.player.y, (this.character.id === 'phantom' ? 245 : this.character.id === 'ranger' ? 215 : 170) + (this.hasBoost('magnet') ? 50 : 0), 0.98);
    const companion = this.guestActor?.player || this.remoteVisual?.player;
    if (companion) glow(companion.x, companion.y, 150, .94);
    this.torches.forEach(torch => glow(torch.x, torch.y, 100 + Math.sin(time * 11 + torch.x) * 5, 0.88));
    this.objects.filter(o => o.type === 'chandelier' && !o.opened).forEach(o => glow(o.x, o.y - 15, 73, 0.7));
    this.projectiles.forEach(b => { if (!b.delay || b.delay <= 0) glow(b.x, b.y, 35, .85); });
    this.objects.forEach(o => {
      if (o.type === 'brazier' && o.opened) glow(o.x, o.y, 185, .99);
      if (o.type === 'shrine' && !o.opened) glow(o.x, o.y, 72, .8);
      if (o.type === 'seal' && !o.opened) glow(o.x, o.y, 88, .96);
      if (o.type === 'portal' || o.type === 'onward') glow(o.x, o.y - 20, 115, .97);
      if (o.type === 'chest' && !o.hidden && !o.opened && o.rarity !== 'common') glow(o.x, o.y, ['epic', 'legendary'].includes(o.rarity) ? 55 : 29, .65);
    });
    this.effects.filter(e => ['rift', 'eclipse', 'oblivion', 'lightning'].includes(e.type)).forEach(e => glow(e.x, e.y, Math.min(440, e.radius * (1 - e.life / e.maxLife) + 50), .8));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (this.tiles[y * COLS + x] === 2) glow(x * TILE + 8, y * TILE + 8, 40, 0.45);
    ctx.drawImage(this.light, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const warmth = (x: number, y: number, radius: number, color: string) => {
      if (x + radius < cx || x - radius > cx + WIDTH || y + radius < cy || y - radius > cy + HEIGHT) return;
      const gradient = ctx.createRadialGradient(x - cx, y - cy, 0, x - cx, y - cy, radius);
      gradient.addColorStop(0, color); gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient; ctx.fillRect(x - cx - radius, y - cy - radius, radius * 2, radius * 2);
    };
    warmth(this.player.x, this.player.y, 125, this.character.id === 'phantom' ? 'rgba(142,80,210,.15)' : 'rgba(170,112,45,0.075)');
    this.torches.forEach(torch => warmth(torch.x, torch.y - 8, 80 + Math.sin(time * 8 + torch.x) * 3, palette.light));
    this.objects.filter(o => o.type === 'brazier' && o.opened).forEach(o => warmth(o.x, o.y - 10, 145, palette.light));
    ctx.restore();
    ctx.save(); ctx.translate(-cx, -cy);
    if (this.player.ascended > 0 || this.player.ward > 0) {
      ctx.strokeStyle = this.character.color; ctx.globalAlpha = .6; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(this.player.x, this.player.y - 8, 18 + Math.sin(time * 5) * 2, 24, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (this.character.id === 'phantom') {
      const p = this.player, orbit = p.eclipse > 0 ? 95 : 24;
      ctx.strokeStyle = p.eclipse > 0 ? '#d2b8ff' : '#7f59ab'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, orbit, orbit * .45, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < (p.eclipse > 0 ? 7 : 3); i++) {
        const angle = time * (p.eclipse > 0 ? 3 : 1.5) + i * Math.PI * 2 / (p.eclipse > 0 ? 7 : 3);
        const x = p.x + Math.cos(angle) * orbit, y = p.y + Math.sin(angle) * orbit * .45;
        ctx.fillStyle = '#b999ee'; ctx.fillRect(Math.round(x), Math.round(y), 2, p.eclipse > 0 ? 13 : 4); ctx.fillStyle = '#f0e1ff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 2);
      }
    }
    for (const bullet of this.projectiles) {
      if (bullet.delay && bullet.delay > 0) continue;
      ctx.save(); ctx.translate(Math.round(bullet.x), Math.round(bullet.y)); ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
      ctx.fillStyle = bullet.color || (bullet.friendly ? '#e29843' : '#82b4a7');
      if (bullet.style === 'shadow') { ctx.fillRect(-8, -4, 16, 8); ctx.fillRect(3, -10, 3, 20); ctx.fillStyle = '#e5d6ff'; ctx.fillRect(6, -6, 2, 12); }
      else if (bullet.style === 'arrow') { ctx.fillRect(-8, -1, 15, 2); ctx.fillStyle = '#e3ddc1'; ctx.fillRect(5, -2, 3, 4); ctx.fillRect(-7, -3, 3, 6); }
      else { ctx.fillRect(-4, -3, 8, 6); ctx.fillStyle = bullet.style === 'fire' ? '#ffe6a1' : '#e5f2dc'; ctx.fillRect(-2, -2, 4, 4); }
      ctx.restore();
    }
    for (const part of this.particles) { ctx.globalAlpha = Math.min(1, part.life / part.maxLife * 2); ctx.fillStyle = part.color; ctx.fillRect(Math.round(part.x), Math.round(part.y), part.size, part.size); }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    for (const text of this.texts) { ctx.globalAlpha = Math.min(1, text.life * 2); ctx.fillStyle = '#10100d'; ctx.fillText(text.text, Math.round(text.x) + 1, Math.round(text.y) + 1); ctx.fillStyle = text.color; ctx.fillText(text.text, Math.round(text.x), Math.round(text.y)); }
    ctx.globalAlpha = 1; ctx.restore();
    if (this.hurtFlash > 0) { ctx.fillStyle = `rgba(150,35,20,${this.hurtFlash * 0.25})`; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
    drawWeather(ctx, this.dungeon.id, WIDTH, HEIGHT, time, this.reducedMotion.matches);
    if (this.mapOpen) this.drawMinimap();
  }

  private drawMinimap() {
    const ctx = this.ctx, scale = this.viewWidth < 450 ? 1 : 1.5, ox = this.viewWidth - COLS * scale - 13, oy = 13;
    ctx.fillStyle = 'rgba(7,12,9,0.83)'; ctx.fillRect(ox - 5, oy - 5, COLS * scale + 10, ROWS * scale + 10);
    ctx.strokeStyle = '#494834'; ctx.lineWidth = 0.5; ctx.strokeRect(ox - 5, oy - 5, COLS * scale + 10, ROWS * scale + 10);
    for (const cell of this.explored) {
      if (!this.tiles[cell]) continue;
      ctx.fillStyle = this.tiles[cell] === 2 ? this.dungeon.palette.hazard[1] : this.dungeon.palette.wallTop;
      ctx.fillRect(ox + cell % COLS * scale, oy + Math.floor(cell / COLS) * scale, scale, scale);
    }
    for (const o of this.objects) {
      if (o.hidden || o.opened || !['chest', 'stairs', 'portal', 'onward', 'seal'].includes(o.type)) continue;
      if (o.type !== 'portal' && !this.explored.has(Math.floor(o.y / TILE) * COLS + Math.floor(o.x / TILE))) continue;
      ctx.fillStyle = o.type === 'seal' ? '#e4bcff' : o.type === 'stairs' || o.type === 'onward' ? '#c9d6ab' : o.type === 'portal' ? '#e7a18a' : chestRarities[o.rarity].color;
      ctx.fillRect(ox + o.x / TILE * scale - 1, oy + o.y / TILE * scale - 1, 3, 3);
    }
    ctx.fillStyle = '#f0d28b'; ctx.fillRect(ox + this.player.x / TILE * scale - 1, oy + this.player.y / TILE * scale - 1, 3, 3);
    const partner = this.guestActor?.player || this.remoteVisual?.player;
    if (partner) { ctx.fillStyle = '#8dd7c2'; ctx.fillRect(ox + partner.x / TILE * scale - 1, oy + partner.y / TILE * scale - 1, 3, 3); }
  }

  private loop = (time: number) => {
    const dt = Math.min(0.034, Math.max(0, (time - (this.lastTime || time)) / 1000));
    this.lastTime = time;
    if (!this.isGuest && !this.paused && !this.remotePaused && !this.ended && this.stage !== 'intro') { if (this.hitStop > 0) this.hitStop -= dt; else this.update(dt); }
    if (this.isGuest) {
      this.camera.x += (Math.max(0, Math.min(COLS * TILE - this.viewWidth, this.player.x - this.viewWidth / 2)) - this.camera.x) * Math.min(1, dt * 12);
      this.camera.y += (Math.max(0, Math.min(ROWS * TILE - this.viewHeight, this.player.y - this.viewHeight / 2)) - this.camera.y) * Math.min(1, dt * 12);
      this.inputTime += dt;
      if (this.inputTime > .1 && !this.ended) {
        if (this.mouse.active) this.session?.sendGame('aim', { x: this.mouse.x + this.camera.x, y: this.mouse.y + this.camera.y }, true);
        this.session?.sendGame('held', (['up', 'down', 'left', 'right', 'attack', 'sprint'] as Action[]).filter(action => this.keys.has(this.settings.bindings[action])), true);
        this.inputTime = 0;
      }
    } else if (this.session && !this.ended) { this.networkTime += dt; if (this.networkTime >= .07) { this.sendWorld(); this.networkTime = 0; } }
    this.render();
    this.hudTime += dt;
    if (this.hudTime > 0.1) { this.sendHUD(); this.hudTime = 0; }
    this.frame = requestAnimationFrame(this.loop);
  };

  destroy() {
    cancelAnimationFrame(this.frame);
    this.listeners.forEach(remove => remove());
    this.networkCleanups.forEach(remove => remove());
    this.resizeObserver?.disconnect();
    this.keys.clear();
    this.audio.setScene('menu', 0);
  }
}