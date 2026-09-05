import Peer, { type DataConnection, type PeerOptions } from 'peerjs';
import { artifacts, characters, type CharacterId, type Progress } from '../data';
import { boosts, dungeons, emptyBoosts, type BoostState, type DungeonId } from '../game/content';
import { normalizeHero, type HeroProgress } from '../progression';
import { isBiomeUnlocked } from '../campaign';

const PROTOCOL = 'forgotten-coop-1';
const PREFIX = 'dotf-coop1-';
export interface PartyMember { name: string; hero: CharacterId; mastery: HeroProgress; artifact: string | null; boosts: BoostState; clearedBiomes: DungeonId[]; ready: boolean; }
export interface PartyLaunch { id: string; dungeon: DungeonId; host: PartyMember; guest: PartyMember; }
export interface PartyState { status: 'idle' | 'connecting' | 'lobby' | 'playing' | 'disconnected' | 'error'; role: 'host' | 'guest' | null; code: string; self: PartyMember | null; other: PartyMember | null; dungeon: DungeonId; error: string; ping: number; }
export interface GamePacket { kind: string; payload: unknown; }
const initial = (): PartyState => ({ status: 'idle', role: null, code: '', self: null, other: null, dungeon: 'crypt', error: '', ping: 0 });
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const makeCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), byte => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[byte % 32]).join('');

export function partyMember(progress: Progress, hero: CharacterId, name: string): PartyMember {
  return { name: name.trim().slice(0, 18) || 'Adventurer', hero, mastery: structuredClone(progress.heroes[hero]), artifact: artifacts.find(item => item.id === progress.artifact && item.unlocked(progress))?.id || null, boosts: { ...progress.activeBoosts }, clearedBiomes: [...progress.clearedBiomes], ready: false };
}
function parseMember(raw: unknown): PartyMember | null {
  if (!object(raw) || typeof raw.hero !== 'string' || !characters.some(hero => hero.id === raw.hero) || typeof raw.name !== 'string' || !object(raw.mastery) || !Array.isArray(raw.clearedBiomes)) return null;
  const active = emptyBoosts();
  if (object(raw.boosts)) for (const boost of boosts) { const value = raw.boosts[boost.id]; if (typeof value === 'number' && Number.isFinite(value)) active[boost.id] = Math.max(0, Math.min(18000, value)); }
  return { name: raw.name.replace(/[\x00-\x1F]/g, '').slice(0, 18) || 'Adventurer', hero: raw.hero as CharacterId, mastery: normalizeHero(raw.mastery), artifact: ['emberheart', 'iron-sigil', 'lost-crown'].includes(String(raw.artifact)) ? String(raw.artifact) : null, boosts: active, clearedBiomes: dungeons.filter(d => (raw.clearedBiomes as unknown[]).includes(d.id)).map(d => d.id), ready: raw.ready === true };
}

export class PartySession {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private listeners = new Set<() => void>();
  private gameListeners = new Set<(packet: GamePacket) => void>();
  private launchListeners = new Set<(launch: PartyLaunch) => void>();
  private state = initial();
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private lastHeard = 0;
  private epoch = 0;
  private sent = 0;
  private received = -1;
  quest: PartyLaunch | null = null;

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  onGame(listener: (packet: GamePacket) => void) { this.gameListeners.add(listener); return () => { this.gameListeners.delete(listener); }; }
  onLaunch(listener: (launch: PartyLaunch) => void) { this.launchListeners.add(listener); return () => { this.launchListeners.delete(listener); }; }
  get isHost() { return this.state.role === 'host'; }
  get connected() { return !!this.connection?.open && (this.state.status === 'lobby' || this.state.status === 'playing'); }
  private update(patch: Partial<PartyState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()); }
  private fail(message: string) { if (this.timeout) clearTimeout(this.timeout); this.timeout = null; this.update({ status: this.quest ? 'disconnected' : 'error', error: message }); }

  open(role: 'host' | 'guest', self: PartyMember, code = '', server = '') {
    this.leave();
    if (typeof RTCPeerConnection === 'undefined') { this.fail('This browser does not support WebRTC data connections. Try a current Chrome, Safari, Firefox, or Edge browser.'); return; }
    const roomCode = role === 'host' ? makeCode() : code.toUpperCase().replace(/[^A-Z2-9]/g, '');
    if (!/^[A-Z2-9]{6}$/.test(roomCode)) { this.fail('Enter the six-character code shown on your friend\'s screen.'); return; }
    const options: PeerOptions = { debug: 0 };
    if (server.trim()) {
      try {
        const url = new URL(server);
        if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
        if (location.protocol === 'https:' && url.protocol !== 'https:') { this.fail('A secure game page needs an HTTPS/WSS signaling server. Use an HTTPS local PeerServer address.'); return; }
        options.host = url.hostname; options.port = Number(url.port || (url.protocol === 'https:' ? 443 : 80)); options.path = url.pathname; options.secure = url.protocol === 'https:';
        options.config = { iceServers: [] };
      } catch { this.fail('Enter a full local PeerServer URL, such as https://your-lan-server:9000/peerjs.'); return; }
    }
    this.update({ status: 'connecting', role, self, code: roomCode, other: null, error: '', dungeon: 'crypt' });
    const epoch = this.epoch;
    try {
      const peer = new Peer(role === 'host' ? PREFIX + roomCode : `${PREFIX}guest-${makeCode()}-${Date.now().toString(36)}`, options);
      this.peer = peer;
      this.timeout = setTimeout(() => { if (this.epoch === epoch) this.fail('Connection timed out. Keep the host room open, use the same service and game version, and check that Wi-Fi client isolation or a firewall is not blocking WebRTC.'); }, 25000);
      peer.on('open', () => {
        if (this.epoch !== epoch) return;
        if (role === 'host') { if (this.timeout) clearTimeout(this.timeout); this.timeout = null; this.update({ status: 'lobby' }); }
        else this.bind(peer.connect(PREFIX + roomCode, { reliable: true, serialization: 'binary', metadata: { protocol: PROTOCOL } }), epoch);
      });
      peer.on('connection', connection => {
        if (this.epoch !== epoch || role !== 'host' || this.connection || this.state.status === 'playing') { connection.on('open', () => { connection.send({ protocol: PROTOCOL, kind: 'reject', seq: 0, payload: 'This room is full or already on a quest.' }); connection.close(); }); return; }
        this.bind(connection, epoch);
      });
      peer.on('error', error => {
        if (this.epoch !== epoch) return;
        const descriptions: Record<string, string> = { 'peer-unavailable': 'Room not found. Check the code and ask the host to keep the room open.', 'unavailable-id': 'That room code is already in use. Create a new room.', 'network': 'Cannot reach the room service. Default rooms need internet for signaling.', 'browser-incompatible': 'WebRTC is not supported by this browser.', 'webrtc': 'The direct connection failed. Try the same Wi-Fi, disable client isolation, or use your own signaling/TURN setup.' };
        if (this.connection?.open && ['network', 'socket-error', 'socket-closed'].includes(error.type)) return;
        this.fail(descriptions[error.type] || `Connection failed (${error.type}). Try creating a new room.`);
      });
      peer.on('disconnected', () => { if (this.epoch === epoch && !this.connection?.open) this.fail('Disconnected from the room service. Create or join a new room.'); });
    } catch { this.fail('The connection could not be started in this browser.'); }
  }

  private bind(connection: DataConnection, epoch: number) {
    this.connection = connection;
    connection.on('open', () => {
      if (epoch !== this.epoch) return;
      this.lastHeard = Date.now();
      this.send('hello', this.state.self);
      this.heartbeat = setInterval(() => {
        if (Date.now() - this.lastHeard > 14000) { this.fail('Your partner is no longer responding. The quest is paused; earned progress is kept.'); connection.close(); return; }
        this.send('ping', Date.now());
      }, 2500);
    });
    connection.on('data', raw => {
      if (epoch !== this.epoch || !object(raw) || raw.protocol !== PROTOCOL || typeof raw.kind !== 'string') return;
      this.lastHeard = Date.now();
      if (raw.kind === 'reject') { this.fail(typeof raw.payload === 'string' ? raw.payload : 'Room rejected the connection.'); return; }
      if (typeof raw.seq !== 'number' || raw.seq <= this.received) return;
      this.received = raw.seq;
      const data = raw.payload;
      if (raw.kind === 'ping') { this.send('pong', data); return; }
      if (raw.kind === 'pong' && typeof data === 'number') { this.update({ ping: Math.min(9999, Date.now() - data) }); return; }
      if (raw.kind === 'hello' || raw.kind === 'member') {
        const member = parseMember(data); if (!member) { this.fail('The other player sent an incompatible hero profile. Both devices need the same game version.'); return; }
        if (this.state.status === 'playing') return;
        if (this.timeout) clearTimeout(this.timeout); this.timeout = null;
        this.update({ other: member, status: 'lobby' });
        if (this.isHost) { if (!isBiomeUnlocked(member, this.state.dungeon)) this.setDungeon('crypt'); this.send('dungeon', this.state.dungeon); }
        return;
      }
      if (raw.kind === 'dungeon' && !this.isHost && typeof data === 'string' && dungeons.some(d => d.id === data)) {
        const id = data as DungeonId;
        if (!this.state.self || !isBiomeUnlocked(this.state.self, id)) { this.send('not-unlocked', null); return; }
        if (id !== this.state.dungeon) { this.update({ dungeon: id, self: { ...this.state.self, ready: false } }); this.send('member', this.state.self); }
        return;
      }
      if (raw.kind === 'not-unlocked' && this.isHost) { this.setDungeon('crypt'); return; }
      if (raw.kind === 'start' && !this.isHost && object(data) && typeof data.id === 'string' && typeof data.dungeon === 'string' && this.state.status === 'lobby' && this.state.self && this.state.other) {
        if (!this.state.self.ready || !this.state.other.ready) return;
        if (!dungeons.some(d => d.id === data.dungeon) || !isBiomeUnlocked(this.state.self, data.dungeon as DungeonId)) return;
        this.begin({ id: data.id, dungeon: data.dungeon as DungeonId, host: this.state.other, guest: this.state.self }); return;
      }
      if (raw.kind === 'leave') { this.fail('Your partner left the party. Earned progression is preserved.'); return; }
      if (raw.kind === 'game' && this.state.status === 'playing' && object(data) && data.quest === this.quest?.id && typeof data.kind === 'string') this.gameListeners.forEach(listener => listener({ kind: data.kind as string, payload: data.payload }));
    });
    connection.on('close', () => { if (epoch !== this.epoch) return; if (this.heartbeat) clearInterval(this.heartbeat); this.heartbeat = null; this.fail('The party connection closed. Rejoin with a new room code to play again.'); });
    connection.on('error', () => { if (epoch === this.epoch) this.fail('The direct WebRTC connection was interrupted.'); });
  }

  private send(kind: string, payload: unknown, transient = false) {
    if (!this.connection?.open) return;
    if (transient && this.connection.dataChannel?.bufferedAmount > 200000) return;
    try { this.connection.send({ protocol: PROTOCOL, kind, payload, seq: ++this.sent }); } catch { this.fail('Unable to send to your partner. The connection has closed.'); }
  }
  sendGame(kind: string, payload: unknown, transient = false) { if (this.quest) this.send('game', { quest: this.quest.id, kind, payload }, transient); }
  setMember(member: PartyMember) { if (this.state.status !== 'lobby') return; this.update({ self: member }); this.send('member', member); }
  setReady(ready: boolean) { if (this.state.self) this.setMember({ ...this.state.self, ready }); }
  setDungeon(dungeon: DungeonId) {
    if (!this.isHost || this.state.status !== 'lobby' || !this.state.self || !isBiomeUnlocked(this.state.self, dungeon) || this.state.other && !isBiomeUnlocked(this.state.other, dungeon)) return;
    this.update({ dungeon, self: { ...this.state.self, ready: false }, other: this.state.other ? { ...this.state.other, ready: false } : null });
    this.send('dungeon', dungeon); this.send('member', this.state.self);
  }
  start() {
    const { self, other, dungeon } = this.state;
    if (!this.isHost || !this.connected || !self?.ready || !other?.ready || !isBiomeUnlocked(self, dungeon) || !isBiomeUnlocked(other, dungeon)) return;
    const id = `quest-${Date.now()}-${this.state.code}`;
    this.send('start', { id, dungeon }); this.begin({ id, dungeon, host: self, guest: other });
  }
  private begin(quest: PartyLaunch) { this.quest = quest; this.update({ status: 'playing' }); this.launchListeners.forEach(listener => listener(quest)); }
  leave() {
    this.send('leave', null); this.epoch++;
    if (this.timeout) clearTimeout(this.timeout); if (this.heartbeat) clearInterval(this.heartbeat);
    this.timeout = null; this.heartbeat = null; this.peer?.destroy(); this.peer = null; this.connection = null;
    this.quest = null; this.sent = 0; this.received = -1; this.state = initial(); this.listeners.forEach(listener => listener());
  }
}