import { characters, type CharacterId } from '../data';
import type { EnemyKind } from './content';
import { drawReworkedHero } from './hero-art';

type Painter = CanvasRenderingContext2D;

export function drawHero(ctx: Painter, kind: CharacterId, x: number, y: number, time: number, moving: boolean, facing: number, flash = false, pose = 0) {
  if (kind === 'phantom') drawLegacyHero(ctx, kind, x, y, time, moving, facing, flash, pose);
  else drawReworkedHero(ctx, kind, x, y, time, moving, facing, flash, pose);
}

function drawLegacyHero(ctx: Painter, kind: CharacterId, x: number, y: number, time: number, moving: boolean, facing: number, flash = false, pose = 0) {
  ctx.save();
  ctx.translate(Math.round(x) - 8, Math.round(y) - 14);
  if (pose > 0 && pose < 1) { ctx.translate(8, 15); ctx.rotate(Math.sin(pose * Math.PI) * (Math.cos(facing) < 0 ? -.12 : .12)); ctx.translate(-8, -15); }
  const step = moving ? Math.round(Math.sin(time * 15)) : 0;
  const rect = (color: string, a: number, b: number, w: number, h: number) => { ctx.fillStyle = flash ? '#fff5d3' : color; ctx.fillRect(a, b, w, h); };
  rect('#080a09', 2, 17, 14, 3);
  if (kind === 'killison' || kind === 'malachar') {
    if (kind === 'malachar') { ctx.translate(-3, -4); ctx.scale(1.2, 1.2); rect('#b2976d', 5, -12, 3, 7); rect('#b2976d', 13, -12, 3, 7); }
    const pulse = Math.sin(time * 4) > 0;
    rect('#361b25', -3, 5, 23, 17); rect('#582130', -1, 8, 20, 12); rect('#201b24', 2, 15, 5, 7 + step); rect('#201b24', 11, 15, 5, 7 - step);
    rect('#854137', 3, 0, 12, 10); rect('#be7157', 5, 2, 9, 6); rect('#292329', 1, -4, 4, 7); rect('#292329', 14, -4, 4, 7); rect('#a18461', 1, -7, 2, 5); rect('#a18461', 17, -7, 2, 5);
    rect('#eadb98', 5, 4, 3, 1); rect('#eadb98', 11, 4, 3, 1); rect('#3b1720', 7, 7, 5, 2);
    rect('#39303b', 1, 10, 17, 7); rect('#b8935d', 1, 9, 6, 2); rect('#b8935d', 12, 9, 6, 2); rect('#33252d', -2, 8, 5, 5); rect('#33252d', 17, 8, 5, 5);
    rect(pulse ? '#fa967d' : '#c76562', 8, 11, 4, 5); rect('#ebc390', 9, 12, 2, 2); rect('#9f754c', 3, 17, 13, 2);
    rect('#6f443c', 23, -2, 2, 26); rect('#deb587', 22, -6, 4, 8); rect('#b4aa99', 25, -7, 4, 5); rect('#e4c7ae', 28, -7, 2, 10); rect('#ad5356', 21, 6, 8, 2);
    rect('#b95756', -3, 14, 5, 5); rect('#f5b793', -2, 13, 3, 2);
  } else if (kind === 'phantom') {
    const float = Math.round(Math.sin(time * 3) * 1.5);
    ctx.translate(-2, -3 + float);
    rect('#291b48', 0, 3, 20, 17); rect('#4d3372', 2, 4, 16, 16);
    rect('#151324', 4, 2, 13, 18); rect('#1c182d', 1, 16, 19, 5);
    for (let i = 0; i < 5; i++) rect(i % 2 ? '#714ea1' : '#2f2445', 2 + i * 4, 20, 2, 3 + Math.round(Math.sin(time * 5 + i) * 2));
    rect('#3b3057', 4, 7, 14, 8); rect('#7e639d', 3, 7, 5, 2); rect('#7e639d', 14, 7, 5, 2);
    rect('#b597de', 9, 8, 3, 7); rect('#ebe3ff', 10, 9, 1, 2);
    rect('#171321', 6, -1, 10, 8); rect('#604880', 5, -4, 2, 6); rect('#604880', 15, -4, 2, 6);
    rect('#aa81d4', 6, -5, 2, 3); rect('#aa81d4', 14, -5, 2, 3); rect('#8a69b6', 8, -3, 6, 2);
    rect('#cbb1ff', 7, 2, 3, 1); rect('#cbb1ff', 12, 2, 3, 1); rect('#ffffff', 8, 2, 1, 1); rect('#ffffff', 13, 2, 1, 1);
    rect('#58456c', 21, -3, 2, 27); rect('#c5a4ff', 20, -6, 9, 2); rect('#9370cf', 27, -4, 3, 2);
    rect('#e6d6ff', 29, -2, 2, 6); rect('#b794ed', 27, 4, 3, 4); rect('#9b78d5', 25, 8, 3, 3);
    rect('#f5eaff', 20, -7, 7, 1);
  } else if (!['knight', 'rogue', 'mage'].includes(kind)) {
    drawRecruit(ctx, kind, time, step, flash);
  } else if (kind === 'knight') {
    rect('#421e22', 1, 6, 14, 13);
    rect('#6e3030', 2, 8, 3, 11);
    rect('#171c1d', 5, 14, 3, 5 + step);
    rect('#171c1d', 10, 14, 3, 5 - step);
    rect('#889089', 4, 7, 10, 8);
    rect('#555f60', 5, 10, 8, 5);
    rect('#b0b3a0', 4, 7, 10, 2);
    rect('#ac9a65', 5, 14, 8, 2);
    rect('#404b4c', 5, 0, 8, 7);
    rect('#a2a592', 6, 0, 6, 2);
    rect('#6e7d79', 5, 2, 8, 2);
    rect('#101717', 5, 4, 8, 2);
    rect('#e7bb63', 7, 4, 4, 1);
    rect('#454a40', 0, 9, 6, 9);
    rect('#b39a5b', 0, 9, 6, 1);
    rect('#b39a5b', 2, 10, 1, 7);
    if (pose <= 0 || pose >= 1) { rect('#798784', 15, 2, 2, 13); rect('#d7d8bd', 15, 2, 1, 11); rect('#b19a60', 13, 14, 6, 2); rect('#4b3324', 15, 16, 2, 3); }
  } else if (kind === 'rogue') {
    rect('#32283e', 2, 4, 13, 14);
    rect('#4f3b65', 4, 0, 8, 3);
    rect('#382e4b', 2, 3, 12, 6);
    rect('#14151b', 4, 4, 8, 4);
    rect('#c4a1f0', 5, 5, 2, 1);
    rect('#c4a1f0', 10, 5, 2, 1);
    rect('#665773', 4, 9, 9, 4);
    rect('#9c81a4', 5, 13, 7, 1);
    rect('#282731', 4, 14, 3, 5 + step);
    rect('#282731', 10, 14, 3, 5 - step);
    rect('#b1acbe', 0, 11, 2, 7);
    rect('#d7c9e3', 16, 10, 2, 7);
    rect('#897197', 0, 10, 4, 2);
    rect('#897197', 14, 9, 4, 2);
  } else {
    rect('#632d28', 4, 6, 10, 11);
    rect('#4b2223', 2, 14, 14, 5);
    rect('#ab6940', 5, 6, 2, 12);
    rect('#d49b4f', 5, 12, 9, 1);
    rect('#76382b', 5, 0, 7, 2);
    rect('#8b4631', 3, 2, 11, 3);
    rect('#4a2525', 2, 5, 13, 3);
    rect('#191618', 5, 4, 7, 4);
    rect('#f8c35f', 6, 5, 1, 1);
    rect('#f8c35f', 10, 5, 1, 1);
    rect('#95623d', 17, 1, 2, 18);
    rect('#e77b2e', 15, -2, 6, 5);
    rect('#f3b04a', 16, -4 + (Math.sin(time * 12) > 0 ? 1 : 0), 4, 6);
    rect('#fff0a4', 17, -1, 2, 3);
    rect('#181718', 4, 18, 3, 2 + step);
    rect('#181718', 11, 18, 3, 2 - step);
  }
  if (Math.cos(facing) < -0.5 && kind === 'knight') rect('#b89c65', 2, 12, 2, 2);
  if (!['phantom', 'killison', 'malachar'].includes(kind)) {
    const hero = characters.find(c => c.id === kind)!;
    rect('#d9caa0', 3, 8, 1, 2); rect(hero.color, 12, 10, 1, 3); rect('#958261', 7, 15, 3, 1);
    if (moving) { rect('#726b55', 4, 20 + step, 3, 1); rect('#726b55', 10, 20 - step, 3, 1); }
  }
  ctx.restore();
}

export function drawWeaponSwing(ctx: Painter, kind: CharacterId, x: number, y: number, direction: number, phase: number, combo: number, color: string, range: number) {
  const windup = phase < .32;
  const sweep = windup ? -.95 - phase * .6 : -1.15 + Math.min(1, (phase - .32) / .48) * 2.7;
  const angle = direction + sweep * (combo === 1 ? -1 : 1);
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  if (!windup && phase < .88) {
    for (let layer = 0; layer < 2; layer++) {
      ctx.globalAlpha = (.22 - layer * .07) * (combo === 2 ? 1.2 : 1);
      ctx.fillStyle = layer === 0 ? '#fff1ca' : color;
      const r = Math.min(33, range) - layer * 3, trail = (combo === 1 ? 1 : -1) * (.48 + layer * .12);
      ctx.beginPath(); ctx.arc(0, 0, r, angle, angle + trail, combo !== 1); ctx.arc(0, 0, r - 3, angle + trail, angle, combo === 1); ctx.closePath(); ctx.fill();
    }
  }
  ctx.globalAlpha = 1; ctx.rotate(angle); ctx.scale(.6, .6);
  const rect = (c: string, a: number, b: number, w: number, h: number) => { ctx.fillStyle = c; ctx.fillRect(a, b, w, h); };
  rect('#775137', 7, -2, 13, 4); rect('#d1ab68', 17, -7, 3, 14);
  if (kind === 'warden' || kind === 'frostguard') { rect(kind === 'frostguard' ? '#6e98b2' : '#6c7a68', 26, -10, 13, 20); rect('#c0e2db', 26, -10, 13, 3); rect('#99bcc0', 30, -7, 4, 14); }
  else if (kind === 'berserker') { rect('#a4b0a1', 25, -12, 10, 24); rect('#dfe0b7', 33, -10, 3, 20); rect('#526360', 25, -3, 4, 6); }
  else if (kind === 'monk') { rect('#c4d1a2', 17, -4, 12, 8); rect('#f8d789', 26, -5, 8, 10); rect('#fff2bc', 29, -3, 5, 5); }
  else {
    const length = kind === 'rogue' || kind === 'duneblade' ? 17 : ['killison', 'reaper', 'malachar'].includes(kind) ? 34 : 28;
    rect('#657c79', 19, -3, length, 6); rect('#e4e7c8', 19, -3, length - 2, 2); rect(color, 20, 0, length - 2, 1);
    rect('#d9dec0', 19 + length, -2, 3, 4); rect('#f0eed4', 22 + length, -1, 2, 2);
    if (['reaper', 'killison', 'malachar'].includes(kind)) { rect(color, 40, -10, 3, 20); rect('#f0d7cb', 43, -7, 3, 14); }
    if (kind === 'rogue' || kind === 'duneblade') { rect(color, 10, 8, 13, 3); rect('#e0d6cb', 19, 7, 14, 2); }
  }
  ctx.restore();
}

function drawRecruit(ctx: Painter, kind: CharacterId, time: number, step: number, flash: boolean) {
  const hero = characters.find(c => c.id === kind)!;
  const color = hero.color;
  const rect = (c: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = flash ? '#fff4d7' : c; ctx.fillRect(x, y, w, h); };
  const armored = ['paladin', 'warden', 'berserker', 'frostguard'].includes(kind);
  const cloth = ({ paladin: '#77714f', frost: '#375d74', ranger: '#3b573a', berserker: '#753c34', storm: '#2d5264', plague: '#3f4834', reaper: '#5f263c', warden: '#656b57', monk: '#4c7656', oracle: '#574374', tidecaller: '#2b5965', duneblade: '#795d3e', frostguard: '#516c87', seraph: '#6d4b88' } as Record<string, string>)[kind] || '#554958';
  if (kind === 'seraph') {
    const flap = Math.round(Math.sin(time * 3) * 2);
    rect('#ab97b4', -5, 4 + flap, 10, 4); rect('#d2c3ae', -7, 1 + flap, 5, 4); rect('#8c789e', -3, 8 + flap, 6, 6);
    rect('#ab97b4', 12, 4 - flap, 10, 4); rect('#d2c3ae', 20, 1 - flap, 5, 4); rect('#8c789e', 14, 8 - flap, 6, 6);
    rect('#d5bb7e', 2, -5, 13, 1); rect('#d5bb7e', 0, -4, 2, 3); rect('#d5bb7e', 15, -4, 2, 3);
  }
  rect(cloth, 2, 5, 13, 12); rect('#1b2520', 4, 15, 3, 5 + step); rect('#1b2520', 10, 15, 3, 5 - step);
  rect(color, 4, 7, 10, armored ? 7 : 3); rect(cloth, 6, 9, 6, 5); rect('#c5ad72', 5, 14, 8, 1);
  rect(cloth, 4, 0, 9, 7); rect(color, 5, 0, 7, 2); rect('#1b2222', 5, 3, 7, 3);
  rect('#efdbb2', 6, 4, 2, 1); rect('#efdbb2', 10, 4, 2, 1);
  if (armored) {
    rect(color, 1, 7, 5, 4); rect(color, 12, 7, 5, 4); rect('#626154', 0, 12, 4, 5);
    if (kind === 'warden' || kind === 'frostguard') { rect(color, 2, -2, 13, 3); rect('#b9e9e5', 7, 4, 4, 1); rect('#697c91', 18, 3, 2, 16); rect(color, 15, 0, 8, 8); rect('#d1ede9', 15, 0, 8, 2); }
    else if (kind === 'paladin') { rect('#dbc784', 0, 9, 6, 10); rect('#897142', 2, 10, 2, 7); rect('#e6dda9', 17, 1, 2, 14); rect('#d1b65d', 15, 14, 6, 2); }
    else { rect('#b59b78', 5, 1, 8, 4); rect('#9b5637', 5, 5, 8, 4); rect('#916136', 0, 7, 2, 13); rect('#916136', 17, 7, 2, 13); rect('#afafa1', -3, 5, 6, 6); rect('#afafa1', 16, 5, 6, 6); }
  } else if (kind === 'ranger') {
    rect('#6c8a50', 1, 0, 13, 2); rect('#334b32', 12, -2, 2, 5);
    rect('#c49b60', 17, 3, 2, 15); rect('#c49b60', 15, 1, 2, 3); rect('#c49b60', 15, 17, 2, 3); rect('#d2ceaa', 14, 3, 1, 14);
    rect('#b9b89a', 13, 10, 9, 1); rect('#d7d6b9', 21, 9, 2, 3);
  } else if (kind === 'duneblade') {
    rect('#c9ac7d', 2, -1, 12, 3); rect('#554230', 4, 5, 9, 3); rect('#bd9b60', 13, 7, 8, 2);
    rect('#e7d3ab', 0, 7, 2, 9); rect('#e7d3ab', 17, 5, 2, 10); rect('#b79659', -1, 15, 4, 2); rect('#b79659', 16, 14, 4, 2);
  } else if (kind === 'tidecaller') {
    rect('#a5cfc8', 4, -3, 9, 2); rect('#bee4de', 7, -5, 3, 3); rect('#7299a3', 18, -3, 2, 23); rect('#c4e5df', 14, -4, 2, 8); rect('#c4e5df', 22, -4, 2, 8); rect('#b1d8d5', 14, 3, 10, 2);
    rect('#87d5d2', -2, 12, 5, 4); rect('#e0f5de', -1, 12, 2, 2);
  } else if (kind === 'monk') {
    rect('#c3a480', 4, 0, 9, 6); rect('#425b37', 4, 2, 9, 1); rect('#f2cf7d', 0, 10, 4, 4); rect('#f2cf7d', 15, 10, 4, 4); rect('#bedd94', 1, 9, 2, 2);
  } else if (kind === 'plague') {
    rect('#c1c2a2', 6, 3, 6, 3); rect('#d8d2b3', 11, 4, 5, 2); rect('#121c15', 8, 3, 2, 2); rect('#171c15', 2, 0, 14, 2);
    rect('#91bb67', 16, 10, 5, 6); rect('#cce6a4', 17, 10, 2, 2); rect('#846846', 17, 8, 3, 2);
  } else if (kind === 'reaper') {
    rect('#8b3850', 2, 14, 13, 5); rect('#70454d', 18, -3, 2, 23); rect('#ccc1cb', 16, -4, 8, 2); rect('#e4cdd7', 23, -2, 2, 8); rect('#bc7c9e', 22, 6, 2, 3);
  } else {
    rect(cloth, 2, 15, 14, 4); rect(color, 4, 8, 2, 9); rect('#80714e', 17, 1, 2, 19);
    const bob = Math.round(Math.sin(time * 5));
    rect(color, 15, -4 + bob, 6, 7); rect('#e4f2ee', 17, -2 + bob, 2, 3);
    if (kind === 'frost') { rect('#b8e6f6', 12, -1 + bob, 12, 1); rect('#b8e6f6', 17, -7 + bob, 1, 12); }
    if (kind === 'storm') { rect('#b5dafa', 13, 1 + bob, 3, 2); rect('#b5dafa', 12, 3 + bob, 2, 3); }
    if (kind === 'oracle') { rect('#cba7f5', 3, -2, 12, 1); rect('#edcc7c', 7, -3, 4, 2); rect('#dfcaff', 14, -5 + bob, 2, 2); }
  }
}

export function drawEnemy(ctx: Painter, kind: EnemyKind, x: number, y: number, time: number, flash: boolean, phase: number) {
  ctx.save();
  const scale = kind === 'boss' ? 2.7 : kind === 'brute' || kind === 'sentinel' ? 1.35 : kind === 'slime' && phase === 2 ? .62 : 1;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  ctx.translate(-8, -14);
  const rect = (color: string, a: number, b: number, w: number, h: number) => { ctx.fillStyle = flash ? '#fff3d8' : color; ctx.fillRect(a, b, w, h); };
  const step = Math.round(Math.sin(time * 9 + x));
  rect('#080909', 1, 17, 15, 3);
  if (kind === 'bat') {
    const flap = Math.round(Math.sin(time * 18 + x) * 4);
    rect('#69557b', 3, 6, 10, 7); rect('#957fa4', 5, 5, 6, 3); rect('#302b43', 1, 3 + flap, 4, 10); rect('#302b43', 12, 3 + flap, 4, 10);
    rect('#7c688d', -5, 4 + flap, 7, 3); rect('#7c688d', 15, 4 + flap, 7, 3); rect('#66516f', -8, 1 + flap, 4, 5); rect('#66516f', 21, 1 + flap, 4, 5);
    rect('#c66870', 5, 8, 2, 1); rect('#c66870', 10, 8, 2, 1); rect('#c5b7bd', 7, 12, 1, 2); rect('#c5b7bd', 10, 12, 1, 2);
  } else if (kind === 'slime') {
    const hop = Math.round(Math.max(0, Math.sin(time * 4 + x)) * 4);
    rect('#3a5931', 0, 11 - hop, 17, 7); rect('#66844a', 2, 7 - hop, 13, 10); rect('#97b75e', 4, 5 - hop, 9, 8);
    rect('#d2df92', 5, 7 - hop, 3, 2); rect('#263521', 5, 12 - hop, 2, 2); rect('#263521', 11, 12 - hop, 2, 2); rect('#779449', 1, 16, 16, 2);
  } else if (kind === 'goblin') {
    rect('#748654', 4, 1, 9, 7); rect('#8b9d62', 1, 2, 15, 3); rect('#142417', 5, 4, 2, 1); rect('#142417', 10, 4, 2, 1);
    rect('#5d452c', 3, 9, 11, 6); rect('#9d8850', 5, 9, 7, 2); rect('#87925a', 1, 10, 2, 5); rect('#87925a', 14, 10, 2, 5);
    rect('#41442c', 4, 15, 3, 4 + step); rect('#41442c', 11, 15, 3, 4 - step); rect('#d2cdae', 17, 10, 2, 7); rect('#8b733e', 15, 14, 5, 1);
  } else if (kind === 'spider') {
    for (let i = 0; i < 4; i++) { rect('#695b45', -4 + step, 4 + i * 4, 8, 2); rect('#695b45', 12, 4 + i * 4 + step, 8, 2); }
    rect('#3d3433', 3, 4, 11, 12); rect('#817447', 5, 2, 7, 10); rect('#594142', 4, 10, 9, 7);
    rect('#bf745d', 5, 11, 2, 2); rect('#bf745d', 10, 11, 2, 2); rect('#d3c498', 5, 16, 2, 3); rect('#d3c498', 10, 16, 2, 3);
  } else if (kind === 'imp') {
    rect('#873b29', 3, 5, 11, 10); rect('#c56635', 4, 1, 9, 7); rect('#eaaa68', 3, -2, 2, 5); rect('#eaaa68', 12, -2, 2, 5);
    rect('#f4db8b', 5, 4, 2, 1); rect('#f4db8b', 10, 4, 2, 1); rect('#ce7741', 4, 10, 9, 4);
    rect('#642c25', -3, 5 + step, 6, 7); rect('#642c25', 14, 5 - step, 6, 7); rect('#8d422c', 4, 15, 3, 4 + step); rect('#8d422c', 10, 15, 3, 4 - step);
    rect('#f6b349', 17, 11, 4, 4); rect('#ffdf86', 18, 10, 2, 3);
  } else if (kind === 'shroom') {
    rect('#bec6a4', 5, 8, 7, 10); rect('#829879', 4, 15, 4, 4 + step); rect('#829879', 10, 15, 4, 4 - step);
    rect('#2f6955', -1, 3, 19, 7); rect('#499c79', 1, 0, 15, 6); rect('#80c49c', 5, -2, 7, 4); rect('#c6eed2', 3, 3, 3, 2); rect('#c6eed2', 12, 2, 2, 2);
    rect('#243d31', 6, 11, 1, 2); rect('#243d31', 10, 11, 1, 2); rect('#e3ecc7', 1, 8, 14, 1);
  } else if (kind === 'sentinel') {
    rect('#474a45', 2, 5, 14, 11); rect('#777a6a', 4, 6, 10, 3); rect('#606158', 4, -2, 10, 8); rect('#8b8270', 5, -2, 8, 2);
    rect('#ef9950', 6, 2, 6, 1); rect('#bd6235', 7, 9, 4, 5); rect('#f3b259', 8, 10, 2, 2);
    rect('#626758', -2, 6, 5, 10); rect('#626758', 15, 6, 5, 10); rect('#6c7161', 3, 16, 4, 4 + step); rect('#6c7161', 11, 16, 4, 4 - step);
  } else if (kind === 'wraith') {
    rect('#293c3c', 4, 1, 8, 4);
    rect('#466064', 2, 5, 12, 9);
    rect('#344e51', 1, 13, 14, 4);
    rect('#547879', 2, 16, 3, 2 + step);
    rect('#547879', 10, 16, 3, 2 - step);
    rect('#12282a', 4, 5, 8, 4);
    rect('#a4e3c7', 5, 6, 2, 1);
    rect('#a4e3c7', 10, 6, 2, 1);
  } else {
    const bone = kind === 'boss' ? '#a5a28d' : '#bcb9a0';
    if (kind === 'boss') {
      rect(phase === 2 ? '#742b24' : '#362b2b', 0, 5, 17, 14);
      rect('#9e783d', 3, -3, 11, 3);
      rect('#d2ab58', 3, -5, 2, 3);
      rect('#d2ab58', 7, -6, 2, 4);
      rect('#d2ab58', 12, -5, 2, 3);
    }
    rect('#4d4d42', 4, 1, 10, 6);
    rect(bone, 4, 0, 9, 6);
    rect('#d2cfaf', 5, 0, 7, 2);
    rect(kind === 'boss' ? '#ec6539' : '#251e1a', 5, 3, 2, 2);
    rect(kind === 'boss' ? '#ec6539' : '#251e1a', 10, 3, 2, 2);
    rect(bone, 6, 6, 5, 2);
    rect('#8c8c77', 7, 8, 2, 7);
    rect(bone, 4, 9, 9, 2);
    rect('#a4a18a', 5, 12, 7, 1);
    rect(bone, 2, 9, 2, 6);
    rect(bone, 13, 9, 2, 6);
    rect(bone, 4, 15, 3, 4 + step);
    rect(bone, 10, 15, 3, 4 - step);
    rect('#818984', 16, 3, 2, 11);
    rect('#9f8050', 14, 13, 6, 1);
    if (kind === 'brute') { rect('#62665c', 2, 8, 13, 4); rect('#aaa386', 15, 3, 6, 5); }
    if (kind === 'archer') { rect('#514731', 3, -1, 11, 4); rect('#5b4f35', 1, 7, 4, 10); rect('#b29562', 17, 2, 2, 15); rect('#b29562', 15, 0, 2, 3); rect('#b29562', 15, 17, 2, 3); rect('#d4cbac', 14, 3, 1, 14); }
  }
  ctx.restore();
}