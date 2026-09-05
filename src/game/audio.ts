import type { Settings } from '../data';
import type { DungeonId } from './content';

export type SoundEffect = 'ui' | 'attack' | 'hit' | 'special' | 'coin' | 'hurt' | 'death' | 'door' | 'fire' | 'step' | 'shadow' | 'oblivion' | 'treasure';

export class DungeonAudio {
  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private settings: Settings | null = null;
  private beat = 0;
  private scene: DungeonId | 'menu' = 'menu';
  private floor = 0;
  private boss = false;
  private melody: number[] = [];
  private tempo = 72;
  trackName = 'The Forgotten Gate';

  setScene(scene: DungeonId | 'menu', floor: number, boss = false) {
    if (this.scene === scene && this.floor === floor && this.boss === boss) return;
    this.scene = scene; this.floor = floor; this.boss = boss; this.beat = 0;
    const profiles = { menu: { name: 'The Forgotten Gate', tempo: 62 }, crypt: { name: 'Stone & Whispers', tempo: 70 }, foundry: { name: 'Iron Pulse', tempo: 132 }, hollows: { name: 'Lanterns in the Green', tempo: 96 }, drowned: { name: 'Beneath the Choir', tempo: 64 }, frostkeep: { name: 'The Glass Lullaby', tempo: 60 }, dynasty: { name: 'Procession of Dust', tempo: 108 }, astral: { name: 'Orbit of the Lost', tempo: 82 } };
    const profile = profiles[scene];
    this.tempo = (boss ? 146 : profile.tempo) + (floor % 4) * 3;
    this.trackName = scene === 'menu' ? profile.name : `${boss ? 'The Guardian Stirs' : profile.name} / ${String(floor).padStart(2, '0')}`;
    let seed = (floor * 2654435761 + Object.keys(profiles).indexOf(scene) * 374761393 + Number(boss) * 99891) >>> 0;
    this.melody = Array.from({ length: 32 }, (_, index) => {
      seed = (Math.imul(seed ^ seed >>> 15, 2246822519) + index) >>> 0;
      return index % 8 === 0 ? 0 : (seed % 10) - 2;
    });
    if (this.timer) clearInterval(this.timer);
    if (this.context) this.timer = setInterval(() => this.ambient(), 60000 / this.tempo / 2);
  }

  configure(settings: Settings) {
    this.settings = settings;
    if (!this.context) return;
    this.musicGain!.gain.setTargetAtTime(settings.sound ? settings.music / 100 * 0.22 : 0, this.context.currentTime, 0.1);
    this.sfxGain!.gain.setTargetAtTime(settings.sound ? settings.sfx / 100 * 0.3 : 0, this.context.currentTime, 0.03);
  }

  async unlock() {
    if (!this.settings?.sound) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.musicGain = this.context.createGain();
        this.sfxGain = this.context.createGain();
        this.musicGain.connect(this.context.destination);
        this.sfxGain.connect(this.context.destination);
        this.configure(this.settings);
        this.ambient();
        this.timer = setInterval(() => this.ambient(), 60000 / this.tempo / 2);
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch { /* Audio remains optional when a browser denies access. */ }
  }

  private tone(frequency: number, duration: number, gain: number, type: OscillatorType, bus: GainNode, endFrequency?: number) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(gain, now + Math.min(0.08, duration / 5));
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.start();
    oscillator.stop(now + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  private noise(duration: number, volume: number, frequency = 1200, bus: GainNode | null = this.sfxGain) {
    if (!this.context || !this.sfxGain) return;
    const count = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, count, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < count; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / count);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(filter); filter.connect(gain); gain.connect(bus || this.sfxGain);
    source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  private ambient() {
    if (!this.settings?.sound || !this.musicGain || this.context?.state !== 'running') return;
    const chip = this.settings.chiptune, step = this.beat % 32;
    const base = this.scene === 'foundry' ? 65.406 : this.scene === 'hollows' ? 73.416 : this.scene === 'drowned' ? 49 : this.scene === 'frostkeep' ? 82.407 : this.scene === 'dynasty' ? 61.735 : this.scene === 'astral' ? 58.27 : 55;
    const root = base * 2 ** (((this.floor * 3) % 7 - (this.boss ? 3 : 0)) / 12);
    const scale = this.scene === 'hollows' && !this.boss ? [0, 2, 4, 7, 9, 12, 14, 16] : this.scene === 'dynasty' ? [0, 1, 4, 5, 7, 8, 11, 12] : this.boss ? [0, 1, 3, 6, 7, 8, 10, 12] : [0, 2, 3, 5, 7, 8, 10, 12];
    const chord = [0, 5, 3, 4][Math.floor(step / 8)];
    const bass = root * 2 ** (scale[chord] / 12);
    if (step % 8 === 0) {
      this.tone(bass, 4 * 60 / this.tempo, .48, chip ? 'triangle' : 'sine', this.musicGain);
      this.tone(bass * 1.5, 3 * 60 / this.tempo, .12, chip ? 'square' : 'sine', this.musicGain);
    }
    const note = this.melody.length ? this.melody[step] : [0, -1, 4, -1, 2, -1, 3, 0][step % 8];
    if (note >= 0 && (this.scene !== 'menu' || step % 4 === 0)) {
      const octave = this.scene === 'hollows' || this.scene === 'drowned' ? 4 : 2;
      const pitch = root * octave * 2 ** (scale[note % scale.length] / 12);
      this.tone(pitch, this.scene === 'foundry' || this.boss ? .2 : .65, this.scene === 'drowned' ? .16 : .2, chip ? 'square' : this.scene === 'foundry' ? 'triangle' : 'sine', this.musicGain);
      if (this.scene === 'drowned' || this.scene === 'frostkeep' || this.scene === 'astral') this.tone(pitch * 2.005, 1.5, .06, 'sine', this.musicGain);
    }
    if (this.scene === 'foundry' || this.boss) {
      if (step % 4 === 0) this.tone(100, .15, .5, 'sine', this.musicGain, 35);
      if (step % 4 === 2) this.noise(.08, .12, 1200, this.musicGain);
      if (step % 2 === 1) this.noise(.025, .035, 6500, this.musicGain);
    } else if ((this.scene === 'hollows' || this.scene === 'dynasty') && step % 4 === 1) this.tone(340, .08, .1, 'triangle', this.musicGain, 95);
    if (step % 12 === 0) this.noise(.1 + Math.random() * .1, .03, this.scene === 'drowned' ? 500 : 1700, this.musicGain);
    if (step % 16 === 3 && this.scene !== 'menu') this.noise(this.scene === 'drowned' ? .65 : .35, .025, this.scene === 'frostkeep' ? 2200 : this.scene === 'dynasty' ? 900 : this.scene === 'drowned' ? 450 : 1300, this.sfxGain);
    this.beat++;
  }

  play(effect: SoundEffect) {
    if (!this.settings?.sound) return;
    void this.unlock();
    if (!this.sfxGain) return;
    const wave = this.settings.chiptune ? 'square' : 'triangle';
    switch (effect) {
      case 'ui': this.tone(340, 0.09, 0.25, wave, this.sfxGain, 460); break;
      case 'attack': this.noise(0.13, 0.5, 2500); this.tone(170, 0.12, 0.4, 'triangle', this.sfxGain, 55); break;
      case 'hit': this.noise(0.15, 0.7, 700); this.tone(90, 0.16, 0.7, 'triangle', this.sfxGain, 35); break;
      case 'special': this.noise(0.4, 0.7, 1900); this.tone(190, 0.5, 0.6, wave, this.sfxGain, 40); break;
      case 'coin': this.tone(740, 0.18, 0.28, 'sine', this.sfxGain, 1300); break;
      case 'hurt': this.tone(170, 0.18, 0.5, 'sawtooth', this.sfxGain, 70); break;
      case 'death': this.tone(160, 1.4, 0.7, 'triangle', this.sfxGain, 30); break;
      case 'door': this.noise(0.6, 0.6, 280); this.tone(65, 0.7, 0.6, 'sine', this.sfxGain, 30); break;
      case 'fire': this.noise(0.24, 0.45, 3500); this.tone(330, 0.19, 0.3, 'sine', this.sfxGain, 90); break;
      case 'step': this.noise(0.075, 0.11, 350); break;
      case 'shadow': this.tone(85, .3, .5, 'sine', this.sfxGain, 32); this.tone(420, .25, .15, 'triangle', this.sfxGain, 120); this.noise(.18, .25, 750); break;
      case 'oblivion': this.tone(140, 1.8, .7, 'sine', this.sfxGain, 25); this.tone(310, 1.2, .3, 'triangle', this.sfxGain, 55); this.noise(.8, .6, 450); break;
      case 'treasure': this.tone(523.25, .75, .3, 'sine', this.sfxGain); this.tone(659.25, .9, .22, 'sine', this.sfxGain); this.tone(783.99, 1.1, .2, 'sine', this.sfxGain); break;
    }
  }

  dispose() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.context?.close();
    this.context = null;
  }
}