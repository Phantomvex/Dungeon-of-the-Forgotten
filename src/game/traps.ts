import type { DungeonId } from './content';

export type TrapKind = 'darts' | 'crusher' | 'firejet' | 'spores' | 'roots' | 'shark' | 'whirlpool' | 'icicles' | 'quicksand' | 'rift';
export interface FloorTrap { id: number; kind: TrapKind; x: number; y: number; time: number; fired: boolean; }
export const biomeTraps: Record<DungeonId, TrapKind[]> = { crypt: ['darts', 'crusher'], foundry: ['firejet', 'crusher'], hollows: ['spores', 'roots'], drowned: ['shark', 'whirlpool'], frostkeep: ['icicles', 'icicles'], dynasty: ['darts', 'quicksand'], astral: ['rift', 'rift'] };
export const trapDescriptions: Record<DungeonId, string> = {
  crypt: 'Watch for arrow slits and the shadow of falling stone.',
  foundry: 'Furnace jets glow before firing. Move away from the crushing presses.',
  hollows: 'Swelling spore pods and writhing roots warn before they strike.',
  drowned: 'A circling fin signals a shark breach. Swim away from the whirlpools.',
  frostkeep: 'Crystalline shadows mark falling icicles. Ice slows unprepared travelers.',
  dynasty: 'Quicksand pulls at your feet. Watch the tomb walls for dart slits.',
  astral: 'A growing violet ring marks a gravity rupture. Leave before it collapses.',
};
const cycles: Record<TrapKind, number> = { darts: 4.5, crusher: 5.5, firejet: 4.8, spores: 6, roots: 5.2, shark: 6.2, whirlpool: 7, icicles: 5.7, quicksand: 7, rift: 6.2 };
export const trapPhase = (trap: FloorTrap) => trap.time % cycles[trap.kind];

interface TrapActions {
  area: (x: number, y: number, radius: number, damage: number, slow: number, pull: boolean) => void;
  shoot: (x: number, y: number, angle: number, color: string, poison: boolean) => void;
  burst: (x: number, y: number, color: string, count: number, power: number) => void;
}

export function updateTrap(trap: FloorTrap, dt: number, actions: TrapActions) {
  trap.time += dt;
  const phase = trapPhase(trap), kind = trap.kind;
  if (phase < 2) trap.fired = false;
  if (kind === 'whirlpool') { if (phase > 2.2 && phase < 5.4) actions.area(trap.x, trap.y, 42, 5, .45, true); return; }
  if (kind === 'quicksand') { if (phase > 1.5 && phase < 5.8) actions.area(trap.x, trap.y, 35, 3, .6, true); return; }
  if (phase >= 3 && !trap.fired) {
    trap.fired = true;
    const color = kind === 'spores' || kind === 'roots' ? '#a1d095' : kind === 'shark' ? '#b2e5eb' : '#e3ab70';
    actions.burst(trap.x, trap.y, color, 13, kind === 'crusher' ? 85 : 40);
    if (kind === 'darts') for (let i = -1; i <= 1; i++) actions.shoot(trap.x - 47, trap.y + i * 9, 0, '#bfb293', false);
    if (kind === 'spores') for (let n = 0; n < 8; n++) actions.shoot(trap.x, trap.y, n * Math.PI / 4, '#aad699', true);
  }
  if (phase < 3 || phase > 4.05) return;
  if (kind === 'crusher') actions.area(trap.x, trap.y, 21, 24, 0, false);
  if (kind === 'firejet') actions.area(trap.x, trap.y, 30, 15, 0, false);
  if (kind === 'roots') actions.area(trap.x, trap.y, 28, 7, 2, false);
  if (kind === 'shark') actions.area(trap.x - 44 + (phase - 3) * 88, trap.y, 19, 22, 0, false);
  if (kind === 'icicles') actions.area(trap.x, trap.y, 23, 20, 1.5, false);
  if (kind === 'rift') actions.area(trap.x, trap.y, 38, 14, .6, true);
}

export function drawTrap(ctx: CanvasRenderingContext2D, trap: FloorTrap) {
  const phase = trapPhase(trap), active = phase >= 3 && phase <= 4.05, warning = phase > 2 && phase < 3;
  const x = Math.round(trap.x), y = Math.round(trap.y), kind = trap.kind;
  const rect = (color: string, dx: number, dy: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x + dx, y + dy, w, h); };
  ctx.save();
  if (warning || ['whirlpool', 'quicksand', 'rift'].includes(kind)) {
    const color = kind === 'shark' || kind === 'whirlpool' ? '#92d0db' : kind === 'roots' || kind === 'spores' ? '#9acb7a' : '#da9974';
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = .35 + (phase % 1) * .45;
    ctx.beginPath(); ctx.ellipse(x, y, kind === 'shark' ? 56 : 28, kind === 'shark' ? 13 : 18, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (kind === 'icicles') {
    ctx.strokeStyle = '#9bd5e0'; ctx.globalAlpha = warning ? .8 : .25; ctx.beginPath(); ctx.ellipse(x, y, 25, 13, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    for (let i = -1; i <= 1; i++) { const offset = active ? 0 : -45; rect('#517f9e', i * 13 - 3, -25 + offset, 6, 24); rect('#c9f1ed', i * 13 - 2, -23 + offset, 2, 17); rect('#94cbd5', i * 13 - 1, -1 + offset, 2, 6); }
  } else if (kind === 'quicksand' || kind === 'rift') {
    for (let i = 0; i < 4; i++) { ctx.strokeStyle = kind === 'rift' ? i % 2 ? '#b692dc' : '#70538d' : i % 2 ? '#b59155' : '#735532'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 10 + i * 9, 5 + i * 5, kind === 'rift' ? trap.time * .2 : 0, trap.time + i, trap.time + i + Math.PI * 1.65); ctx.stroke(); }
    if (kind === 'rift' && active) { ctx.fillStyle = '#dfbeff'; ctx.fillRect(x - 1, y - 30, 3, 40); }
  } else if (kind === 'darts') {
    rect('#44463a', -54, -20, 10, 40); rect('#141b19', -48, -12, 4, 6); rect('#141b19', -48, 6, 4, 6);
    if (warning) { rect('#f1b47c', -48, -11, 2, 4); rect('#f1b47c', -48, 7, 2, 4); }
    ctx.globalAlpha = .25; rect('#aa9674', -40, -15, 94, 1); rect('#aa9674', -40, 14, 94, 1);
  } else if (kind === 'crusher') {
    rect('#10140f', -20, -15, 40, 31); rect('#77715a', -23, -17, 3, 35); rect('#77715a', 20, -17, 3, 35);
    if (active) { rect('#706d5d', -19, -23, 38, 32); rect('#a9a185', -19, -23, 38, 4); rect('#47493e', -19, 6, 38, 6); rect('#4d5046', -5, -17, 11, 15); }
    else { ctx.globalAlpha = warning ? .65 : .25; rect('#050706', -18, -13, 36, 28); }
  } else if (kind === 'firejet') {
    rect('#5d4431', -14, -11, 28, 21); rect('#22160f', -10, -7, 20, 13);
    for (let i = -8; i < 11; i += 5) rect('#a27646', i, -9, 2, 18);
    if (warning) rect('#df8b42', -9, -3, 18, 3);
    if (active) for (let i = -12; i < 13; i += 4) { const h = 24 + Math.sin(trap.time * 24 + i) * 9; rect('#eb7b31', i, -h, 4, h); rect('#ffd186', i + 1, -h + 8, 2, h - 6); }
  } else if (kind === 'spores') {
    rect('#4e6140', -3, -3, 6, 14); rect('#9aac71', -9, -11, 18, 10); rect('#426a4c', -12, -5, 24, 8); rect('#c6e3a8', -7, -9, 3, 2); rect('#c6e3a8', 4, -8, 3, 3);
    if (warning) { rect('#d1efa5', -3, -15, 5, 5); rect('#b9d789', -12, -10, 3, 3); }
  } else if (kind === 'roots') {
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + trap.time * .2, length = active ? 28 : 16; ctx.strokeStyle = active ? '#a7b774' : '#516d40'; ctx.lineWidth = active ? 3 : 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * length * .5, y + Math.sin(a) * length * .5 - (active ? 8 : 0)); ctx.lineTo(x + Math.cos(a + .3) * length, y + Math.sin(a + .3) * length); ctx.stroke(); }
  } else if (kind === 'shark') {
    ctx.strokeStyle = '#448b9b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 58, 16, 0, 0, Math.PI * 2); ctx.stroke();
    const offset = active ? -44 + (phase - 3) * 88 : Math.sin(trap.time * 1.8) * 30;
    ctx.translate(offset, active ? -Math.sin((phase - 3) / 1.05 * Math.PI) * 14 : 0);
    if (active) {
      rect('#2d515d', -23, -5, 39, 11); rect('#8aabb1', -18, -7, 29, 5); rect('#c5d7d4', -13, 3, 26, 4); rect('#477c8c', -5, -17, 6, 14); rect('#51889a', -1, -19, 3, 7);
      rect('#3f7785', -27, -10, 6, 9); rect('#3f7785', -27, 5, 6, 8); rect('#162936', 14, -2, 6, 7); rect('#eaf2df', 14, -2, 2, 3); rect('#eaf2df', 17, 2, 2, 3); rect('#ecbc92', 8, -3, 2, 2);
      for (let i = 0; i < 5; i++) rect('#a8e1e2', -25 + i * 11, 12 + Math.sin(i + trap.time * 8) * 3, 3, 2);
    } else if (warning) { rect('#4f7e8c', -3, -11, 5, 11); rect('#9ac7ce', 1, -15, 2, 11); rect('#b2dcde', -7, 0, 18, 1); }
  } else {
    for (let i = 0; i < 5; i++) { ctx.strokeStyle = i % 2 ? '#447e9a' : '#7bbdce'; ctx.lineWidth = i === 0 ? 2 : 1; ctx.beginPath(); ctx.ellipse(x, y, 7 + i * 8, 4 + i * 5, trap.time * .3, trap.time * 2 + i, trap.time * 2 + i + Math.PI * 1.6); ctx.stroke(); }
    rect('#0a263d', -5, -4, 10, 8);
  }
  ctx.restore();
}