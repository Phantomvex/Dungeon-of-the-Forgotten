import type { DungeonId, EnemyKind } from './content';
import { bossProfiles } from './rewards';

export const eliteProfiles: Record<DungeonId, { name: string; type: EnemyKind; color: string }[]> = {
  crypt: [{ name: 'The Bone Castellan', type: 'brute', color: '#d4b986' }, { name: 'Gravebell Harrower', type: 'wraith', color: '#bca0d3' }],
  foundry: [{ name: 'Furnace Executioner', type: 'sentinel', color: '#e69c66' }, { name: 'Cinderwing Alpha', type: 'imp', color: '#eeb270' }],
  hollows: [{ name: 'The Rot Matriarch', type: 'spider', color: '#b3c886' }, { name: 'Ancient Sporekeeper', type: 'shroom', color: '#a7d5a9' }],
  drowned: [{ name: 'The Saltbound Herald', type: 'wraith', color: '#9ccbd5' }, { name: 'Barnacle Colossus', type: 'brute', color: '#a5b7ad' }],
  frostkeep: [{ name: 'Frostmaw Champion', type: 'sentinel', color: '#afdce5' }, { name: 'Winter\'s Lament', type: 'wraith', color: '#bac7ed' }],
  dynasty: [{ name: 'The Tomb Vizier', type: 'archer', color: '#dfb774' }, { name: 'Scarab Warcaller', type: 'goblin', color: '#cdb583' }],
  astral: [{ name: 'The Rift Warden', type: 'sentinel', color: '#c7a6e9' }, { name: 'Star-Eaten Harbinger', type: 'wraith', color: '#b7b3eb' }],
};

export function drawBoss(ctx: CanvasRenderingContext2D, biome: DungeonId, x: number, y: number, time: number, flash: boolean, phase: number) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = '#070b0bab'; ctx.beginPath(); ctx.ellipse(0, 7, 32, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.scale(1.65, 1.65); ctx.translate(-22, -41);
  const color = bossProfiles[biome].color;
  const rect = (fill: string, px: number, py: number, w: number, h: number) => { ctx.fillStyle = flash ? '#fff2ce' : fill; ctx.fillRect(px, py, w, h); };
  const bob = Math.round(Math.sin(time * 3)), step = Math.round(Math.sin(time * 5));
  if (biome === 'crypt') {
    rect('#512c30', 3, 12, 38, 32); rect('#7b3b38', 3, 23, 6, 23); rect('#34252a', 10, 15, 26, 29);
    rect('#aaa088', 14, 0, 16, 13); rect('#d0c4a4', 15, 0, 14, 3); rect('#2a2620', 16, 5, 4, 4); rect('#2a2620', 25, 5, 4, 4);
    rect(phase === 2 ? '#fff0b1' : '#e9904c', 17, 6, 2, 2); rect('#eeac68', 26, 6, 2, 2); rect('#ac9b7a', 17, 12, 11, 4);
    rect('#b38d4e', 12, -4, 20, 5); for (let i = 0; i < 4; i++) rect('#dfbc74', 12 + i * 6, -9 - i % 2 * 2, 3, 6 + i % 2 * 2);
    rect('#a0a28e', 10, 17, 25, 7); rect('#b29a67', 13, 28, 19, 3); rect('#7c846f', 13, 32, 7, 12 + step); rect('#7c846f', 25, 32, 7, 12 - step);
    rect('#807552', 40, 0, 3, 39); rect('#d2d3b7', 40, -8, 4, 32); rect('#bc9f67', 35, 24, 13, 3);
  } else if (biome === 'foundry') {
    rect('#484a43', 6, 9, 34, 26); rect('#707367', 6, 9, 34, 5); rect('#383a35', 14, 2, 19, 10); rect('#a09570', 15, 1, 17, 3);
    rect('#ed9952', 17, 7, 13, 2); rect('#241b17', 13, 17, 21, 15); rect('#be5f30', 16, 19, 15, 11); rect('#f2af50', 19, 20, 9, 8); rect('#ffe4a0', 22, 23, 3, 4);
    for (let i = 0; i < 4; i++) rect('#474b43', 15 + i * 5, 17, 2, 15);
    rect('#5c5d50', -3, 12, 10, 21); rect('#5c5d50', 39, 12, 10, 21); rect('#918362', -3, 12, 10, 3); rect('#918362', 39, 12, 10, 3);
    rect('#646653', 8, 34, 11, 13 + step); rect('#646653', 27, 34, 11, 13 - step);
    rect('#ba773f', 5, -4, 5, 19); rect('#ba773f', 37, -6, 5, 19); if (phase === 2) { rect('#ed8c42', 6, -11 + bob, 3, 10); rect('#f8bd6d', 38, -14 - bob, 3, 10); }
  } else if (biome === 'hollows') {
    rect('#53674a', 9, 20, 29, 17); rect('#899b6c', 14, 11, 18, 24); rect('#263e33', 3, 5, 40, 13); rect('#4a9872', 7, -1, 32, 14); rect('#8acb97', 13, -7, 22, 12);
    rect('#bddcaa', 11, 3, 7, 3); rect('#bddcaa', 30, 0, 5, 4); rect('#21472e', 16, 19, 4, 4); rect('#21472e', 26, 19, 4, 4); rect('#d8edb9', 17, 20, 2, 2); rect('#d8edb9', 27, 20, 2, 2);
    for (let i = 0; i < 5; i++) { rect('#566e43', 2 + i * 9, 34, 5, 9 + (i % 2 ? step : -step)); rect('#749455', i * 10, 42, 9, 3); }
    rect('#789b58', -4, 18, 9, 4); rect('#789b58', 40, 18, 9, 4); if (phase === 2) rect('#cfe8a7', 19, 28, 10, 3);
  } else if (biome === 'drowned') {
    rect('#30556a', 10, 12, 27, 28); rect('#568597', 15, 13, 17, 19); rect('#889f9c', 15, 1, 18, 14); rect('#305168', 17, 4, 14, 8);
    rect('#c7eee0', 18, 6, 3, 2); rect('#c7eee0', 27, 6, 3, 2); rect('#b4b485', 13, -3, 23, 4); for (let i = 0; i < 4; i++) rect('#d1ca94', 13 + i * 7, -7, 2, 5);
    for (let i = 0; i < 4; i++) { const sway = Math.round(Math.sin(time * 3 + i) * 3); rect('#486c78', 7 + i * 9, 34, 5, 9); rect('#729697', 3 + i * 11 + sway, 42, 10, 3); }
    rect('#98b9b3', 42, -8, 3, 50); rect('#c0e2d1', 34, -8, 3, 18); rect('#c0e2d1', 50, -8, 3, 18); rect('#98b9b3', 34, 8, 19, 3);
    rect('#c7bf92', 15, 28, 18, 3);
  } else if (biome === 'frostkeep') {
    rect('#355276', 13, 15, 21, 23); rect('#7196b5', 10, 30, 27, 12); rect('#a4c9d4', 6, 40, 35, 5);
    rect('#527ca0', 17, 0, 14, 16); rect('#c6dcdf', 19, 5, 10, 9); rect('#477190', 19, 7, 10, 3); rect('#ebffff', 20, 8, 2, 1); rect('#ebffff', 26, 8, 2, 1);
    for (let i = 0; i < 5; i++) rect('#c6f3f2', 13 + i * 5, -5 - i % 2 * 5, 2, 8 + i % 2 * 5);
    rect('#b9dce0', 11, 17, 24, 3); rect('#9ec8d4', 21, 19, 5, 21); rect('#b9dce0', 6, 20, 6, 13); rect('#b9dce0', 35, 20, 6, 13);
    for (let i = 0; i < 3; i++) { const a = time + i * Math.PI * 2 / 3; rect('#b1eaf0', 21 + Math.cos(a) * 25, 17 + Math.sin(a) * 12, 3, 8); }
  } else if (biome === 'dynasty') {
    rect('#635032', 10, 15, 27, 27); rect('#ad8d56', 14, 17, 19, 22); rect('#2e3738', 17, 3, 15, 15); rect('#394c52', 11, -1, 27, 18);
    for (let i = 0; i < 5; i++) rect('#bf9b57', 11, i * 4, 27, 2);
    rect('#a78a57', 18, 5, 13, 11); rect('#252b29', 19, 9, 4, 2); rect('#252b29', 27, 9, 4, 2); rect('#ffdc88', 20, 9, 2, 1); rect('#ffdc88', 28, 9, 2, 1);
    rect('#d9ba77', 10, 19, 28, 4); rect('#355158', 13, 27, 22, 3); rect('#ccb985', 18, 32, 14, 13); rect('#79674c', 14, 42, 9, 5); rect('#79674c', 29, 42, 9, 5);
    rect('#c5ab6c', 3, 0, 3, 42); rect('#e1c787', 0, -4, 9, 5); rect('#38585d', 39, 23, 7, 15);
  } else {
    ctx.translate(0, bob);
    rect('#2b2443', 12, 5, 24, 27); rect('#51416e', 8, 19, 31, 16); rect('#776093', 13, 18, 6, 20); rect('#776093', 30, 18, 5, 20);
    rect('#b18ecf', 19, -1, 13, 4); rect('#141428', 18, 4, 14, 10); rect('#edd8ff', 20, 8, 4, 1); rect('#edd8ff', 27, 8, 3, 1);
    rect('#c6afd8', 23, 17, 4, 15); rect('#ecc7a0', 18, 23, 14, 3);
    for (let i = 0; i < 4; i++) rect('#4d395f', 9 + i * 9, 33, 5, 10 + Math.round(Math.sin(time * 4 + i) * 3));
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(24, 15, 32, 11, time * .5, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 5; i++) { const a = time * .7 + i * Math.PI * .4; rect(i % 2 ? '#d5b578' : '#ba9ce3', 23 + Math.cos(a) * 32, 14 + Math.sin(a) * 16, 3, 3); }
  }
  if (phase === 2) { ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = .55; ctx.beginPath(); ctx.ellipse(23, 42, 29, 8, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}