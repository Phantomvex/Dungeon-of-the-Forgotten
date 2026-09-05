import type { CharacterId } from '../data';

interface Costume { cloth: string; shadow: string; trim: string; metal: string; light: string; skin: string; eyes: string; form: 'plate' | 'hood' | 'robe' | 'demon' | 'monk' | 'mask'; weapon: 'sword' | 'daggers' | 'staff' | 'bow' | 'axes' | 'scythe' | 'hammer' | 'fists' | 'vial' | 'trident'; }
const costumes: Record<Exclude<CharacterId, 'phantom'>, Costume> = {
  knight: { cloth: '#792f35', shadow: '#351e28', trim: '#baa476', metal: '#657778', light: '#abb9ad', skin: '#968275', eyes: '#ebc98c', form: 'plate', weapon: 'sword' },
  rogue: { cloth: '#5a456e', shadow: '#251e34', trim: '#9b86b6', metal: '#3d3c50', light: '#c4bcda', skin: '#8d7b8f', eyes: '#d6bbff', form: 'hood', weapon: 'daggers' },
  mage: { cloth: '#944737', shadow: '#472534', trim: '#caaa65', metal: '#754a38', light: '#e7c187', skin: '#a58b78', eyes: '#ffe49b', form: 'robe', weapon: 'staff' },
  paladin: { cloth: '#a69464', shadow: '#4b4435', trim: '#e1c783', metal: '#a5ac9e', light: '#e7e0bb', skin: '#a39178', eyes: '#fff2b4', form: 'plate', weapon: 'sword' },
  frost: { cloth: '#668ea8', shadow: '#2a455f', trim: '#b5d5de', metal: '#516780', light: '#d9f1f1', skin: '#b9c5c9', eyes: '#d6fdff', form: 'robe', weapon: 'staff' },
  ranger: { cloth: '#627d4e', shadow: '#2b4032', trim: '#b5ba7b', metal: '#596346', light: '#c9c89e', skin: '#b9a28b', eyes: '#dde1ad', form: 'hood', weapon: 'bow' },
  berserker: { cloth: '#834734', shadow: '#3c2a29', trim: '#bba274', metal: '#77766a', light: '#d0c8a7', skin: '#c1997c', eyes: '#e5c486', form: 'plate', weapon: 'axes' },
  storm: { cloth: '#466f84', shadow: '#243c55', trim: '#9ebdcd', metal: '#596d80', light: '#d6eaf2', skin: '#85969f', eyes: '#d3edff', form: 'robe', weapon: 'staff' },
  plague: { cloth: '#465442', shadow: '#232d2c', trim: '#a2af71', metal: '#525b4d', light: '#c8d1a5', skin: '#c5c5ac', eyes: '#c3db89', form: 'mask', weapon: 'vial' },
  reaper: { cloth: '#813c51', shadow: '#391f35', trim: '#b3858e', metal: '#56434e', light: '#d8b5b8', skin: '#c7b6af', eyes: '#f0a2a6', form: 'hood', weapon: 'scythe' },
  warden: { cloth: '#606c51', shadow: '#303f34', trim: '#bec5a0', metal: '#6d7c68', light: '#b2bca0', skin: '#809279', eyes: '#cee8a1', form: 'plate', weapon: 'hammer' },
  monk: { cloth: '#699177', shadow: '#2e4d43', trim: '#e0c27c', metal: '#ae985f', light: '#e4dca5', skin: '#b99c7e', eyes: '#dac99a', form: 'monk', weapon: 'fists' },
  oracle: { cloth: '#81618f', shadow: '#3e2e57', trim: '#d0b280', metal: '#80628a', light: '#dfc9f0', skin: '#b3a4bf', eyes: '#f0dfff', form: 'robe', weapon: 'staff' },
  killison: { cloth: '#802f39', shadow: '#321c29', trim: '#c09d65', metal: '#3d3542', light: '#87705b', skin: '#ae5f4e', eyes: '#ffe0a1', form: 'demon', weapon: 'scythe' },
  tidecaller: { cloth: '#427c86', shadow: '#244456', trim: '#b5d1c4', metal: '#6a9da4', light: '#def0de', skin: '#a1babb', eyes: '#d3fff3', form: 'robe', weapon: 'trident' },
  duneblade: { cloth: '#b0905e', shadow: '#564735', trim: '#e2c48a', metal: '#8e7953', light: '#edddae', skin: '#a38965', eyes: '#f1cc82', form: 'hood', weapon: 'daggers' },
  frostguard: { cloth: '#52769a', shadow: '#2a405c', trim: '#c3dde0', metal: '#7195aa', light: '#d2e5e0', skin: '#a5bac2', eyes: '#d6fbf8', form: 'plate', weapon: 'hammer' },
  seraph: { cloth: '#9674a9', shadow: '#463354', trim: '#d5b679', metal: '#4c4455', light: '#ddcbbb', skin: '#c0b3c2', eyes: '#fff0dc', form: 'plate', weapon: 'sword' },
  malachar: { cloth: '#86313c', shadow: '#331b27', trim: '#d7b375', metal: '#443b45', light: '#ac8a70', skin: '#a0574d', eyes: '#fff0b2', form: 'demon', weapon: 'scythe' },
};

export function drawReworkedHero(ctx: CanvasRenderingContext2D, kind: Exclude<CharacterId, 'phantom'>, x: number, y: number, time: number, moving: boolean, facing: number, flash: boolean, pose: number) {
  const c = costumes[kind], attack = pose > 0 && pose < 1;
  const heavy = ['warden', 'frostguard', 'malachar'].includes(kind), body = heavy ? 20 : c.form === 'robe' ? 14 : 16;
  const step = moving ? Math.round(Math.sin(time * 11)) : 0;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = '#060b0a99'; ctx.beginPath(); ctx.ellipse(0, 4, heavy ? 13 : 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  if (Math.cos(facing) < -.25) ctx.scale(-1, 1);
  ctx.translate(-14, -29);
  const r = (color: string, a: number, b: number, w: number, h: number) => { ctx.fillStyle = flash ? '#f3e4c1' : color; ctx.fillRect(Math.round(a), Math.round(b), w, h); };
  const left = 14 - body / 2, flutter = Math.round(Math.sin(time * 4 + x) * (moving ? 2 : 1));
  if (kind === 'seraph') {
    for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 4; i++) {
      r(i % 2 ? '#c5bbaa' : '#8f7caa', 12 + side * (10 + i * 2), 7 + i * 3 + flutter, 4, 8 - i);
    }
    r(c.trim, 6, -7, 16, 1); r(c.trim, 4, -6, 2, 3); r(c.trim, 22, -6, 2, 3);
  }
  r(c.shadow, left - 2, 9, body + 4, 22); r(c.cloth, left - 2, 11, 4, 18 + flutter); r(c.cloth, left + body - 1, 11, 4, 19 - flutter);
  r('#1b2326', 8, 23, 5, 9 + step); r('#1b2326', 16, 23, 5, 9 - step);
  r(c.metal, 8, 23, 4, 5); r(c.metal, 17, 23, 4, 5); r(c.trim, 8, 26, 4, 1); r(c.trim, 17, 26, 4, 1);
  r('#1d2426', 6, 31 + step, 7, 3); r('#1d2426', 16, 31 - step, 7, 3); r(c.metal, 7, 31 + step, 5, 1); r(c.metal, 17, 31 - step, 5, 1);
  r(c.form === 'plate' || c.form === 'demon' ? c.metal : c.cloth, left, 10, body, 13);
  r(c.light, left + 1, 10, body - 2, 2); r(c.shadow, 12, 13, 4, 8);
  r(c.trim, left + 1, 22, body - 2, 2); r(c.light, 13, 22, 3, 2);
  if (c.form === 'robe') {
    r(c.cloth, 6, 20, 16, 12); r(c.shadow, 11, 22, 6, 10); r(c.trim, 7, 12, 2, 18); r(c.trim, 19, 12, 2, 18); r(c.trim, 8, 23, 12, 1);
  }
  r(c.metal, left - 3, 11, 5, 7); r(c.metal, left + body - 2, 11, 5, 7);
  r(c.trim, left - 3, 11, 5, 2); r(c.trim, left + body - 2, 11, 5, 2);
  r(c.shadow, left - 2, 18, 4, 5); r(c.shadow, left + body - 1, 18, 4, 5);
  r(c.skin, left - 2, 22, 3, 3); r(c.skin, left + body, 22, 3, 3);
  r(c.skin, 11, 7, 6, 4);
  if (c.form === 'plate' && !['berserker', 'seraph'].includes(kind)) {
    r(c.metal, 8, -1, 12, 10); r(c.light, 9, -1, 10, 2); r(c.shadow, 8, 4, 12, 2); r(c.eyes, 10, 4, 3, 1); r(c.eyes, 16, 4, 2, 1); r(c.trim, 13, 1, 2, 8);
    r(c.metal, 7, 6, 3, 4); r(c.metal, 18, 6, 3, 4);
  } else if (c.form === 'demon') {
    r(c.skin, 8, -1, 12, 11); r('#71352f', 10, 5, 8, 4); r(c.eyes, 9, 2, 3, 1); r(c.eyes, 16, 2, 3, 1);
    r('#27232b', 4, -7, 4, 10); r('#27232b', 20, -7, 4, 10); r(c.trim, 3, -9, 3, 5); r(c.trim, 22, -9, 3, 5); r('#5d4b45', 6, -5, 3, 6); r('#5d4b45', 19, -5, 3, 6);
    if (kind === 'malachar') { r(c.trim, 8, -11, 2, 7); r(c.trim, 18, -11, 2, 7); }
    r('#b95052', 11, 13, 7, 6); r('#f0b18b', 13, 13, 2, 6); r('#f0b18b', 11, 15, 7, 1);
  } else if (c.form === 'monk' || kind === 'berserker') {
    r(c.skin, 8, 0, 12, 9); r(kind === 'monk' ? '#392e2c' : '#824a2c', 8, -2, 12, 3); r(c.shadow, 9, 3, 3, 1); r(c.shadow, 16, 3, 3, 1);
    if (kind === 'berserker') { r('#9b643b', 8, 5, 12, 5); r('#c59659', 10, 6, 2, 3); r('#a7997b', left - 3, 9, body + 6, 3); }
    else { r(c.trim, 8, 1, 12, 2); r(c.trim, left - 3, 21, 5, 5); r(c.trim, left + body - 1, 21, 5, 5); }
  } else if (c.form === 'mask') {
    r('#202727', 9, -5, 10, 7); r('#3e4940', 5, 0, 19, 2); r('#c6c8ad', 9, 3, 10, 6); r('#e4dcc0', 17, 5, 6, 2); r('#283d2b', 11, 4, 3, 2);
  } else {
    r(c.shadow, 7, 1, 15, 9); r(c.cloth, 8, -2, 13, 5); r(c.cloth, 6, 2, 4, 8); r(c.cloth, 19, 2, 3, 8);
    r('#19202a', 10, 2, 9, 6); r(c.eyes, 11, 4, 2, 1); r(c.eyes, 16, 4, 2, 1); r(c.trim, 7, 8, 3, 1); r(c.trim, 19, 8, 3, 1);
  }
  if (kind === 'ranger') { r('#a7bb80', 18, -5, 2, 7); r('#829264', 20, -4, 2, 3); r('#765b3c', 4, 7, 2, 15); }
  if (kind === 'oracle' || kind === 'tidecaller') { r(c.trim, 7, -3, 15, 2); r(c.light, 12, -6, 4, 4); }
  if (kind === 'duneblade') { r(c.trim, 8, 7, 13, 3); r(c.cloth, 21, 8 + flutter, 7, 3); }
  if (kind === 'frostguard') { r('#d2dce0', left - 2, 8, body + 4, 3); r('#bde4e7', left - 4, 6, 2, 6); r('#bde4e7', left + body + 2, 5, 2, 7); }
  if (kind === 'warden') { r('#c0dfa1', 13, 13, 2, 7); r('#c0dfa1', 10, 15, 8, 2); r(c.shadow, left + 3, 18, 2, 4); }
  if (!attack || !['sword', 'daggers', 'axes', 'hammer', 'scythe', 'fists'].includes(c.weapon)) {
    if (c.weapon === 'sword') {
      r('#537078', 25, 6, 2, 20); r('#cdd8c8', 25, 6, 1, 16); r(c.trim, 22, 23, 8, 2); r('#5b4030', 25, 25, 2, 5);
      if (kind === 'knight' || kind === 'paladin') { r(c.trim, 0, 15, 8, 13); r(c.shadow, 1, 16, 6, 10); r(c.trim, 3, 18, 2, 7); r(c.trim, 1, 20, 6, 1); }
    } else if (c.weapon === 'daggers') { r('#d1d5d8', 2, 15, 2, 10); r('#d1d5d8', 26, 14, 2, 10); r(c.trim, 0, 23, 6, 2); r(c.trim, 24, 22, 6, 2); }
    else if (c.weapon === 'hammer' || c.weapon === 'axes') { r('#856d48', 26, 7, 2, 25); r(c.metal, 23, 4, 8, 9); r(c.light, 23, 4, 8, 2); if (c.weapon === 'axes') { r('#856d48', 1, 10, 2, 20); r(c.metal, -2, 7, 8, 7); r(c.light, -2, 7, 2, 7); } }
    else if (c.weapon === 'scythe') { r('#836875', 27, -3, 2, 35); r(c.light, 23, -4, 11, 2); r(c.metal, 32, -2, 3, 9); r(c.light, 33, -1, 1, 7); r(c.trim, 28, 15, 3, 2); }
    else if (c.weapon === 'staff' || c.weapon === 'trident') {
      r('#8e7453', 27, 3, 2, 28); r(c.trim, 25, 13, 6, 2);
      if (c.weapon === 'trident') { r(c.light, 22, -4, 2, 10); r(c.light, 32, -4, 2, 10); r(c.light, 27, -7, 2, 13); r(c.trim, 22, 5, 12, 2); }
      else { r(c.trim, 24, -3, 8, 7); r(c.eyes, 26, -5, 4, 8); r('#fff0cf', 27, -2, 2, 3); }
    } else if (c.weapon === 'bow') { r('#b18c55', 28, 8, 2, 18); r('#b18c55', 25, 5, 3, 4); r('#b18c55', 25, 26, 3, 4); r('#d9d4b3', 24, 8, 1, 18); }
    else if (c.weapon === 'vial') { r('#789b5d', 25, 21, 6, 7); r('#c7e297', 26, 22, 2, 3); r('#a38a58', 26, 19, 4, 2); }
  }
  if (['mage', 'frost', 'storm', 'oracle', 'plague', 'tidecaller', 'seraph', 'killison', 'malachar'].includes(kind)) {
    for (let i = 0; i < 3; i++) { const a = time * .9 + i * Math.PI * 2 / 3; r(c.eyes, 14 + Math.cos(a) * 16, 22 + Math.sin(a) * 8, 1, 2); }
  }
  ctx.restore();
}