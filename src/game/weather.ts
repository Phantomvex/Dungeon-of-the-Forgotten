import type { DungeonId } from './content';

export function drawWeather(ctx: CanvasRenderingContext2D, biome: DungeonId, width: number, height: number, time: number, reduced = false) {
  const t = reduced ? 0 : time;
  const intensity = .65 + Math.sin(t / 28) * .25;
  ctx.save();
  const count = biome === 'crypt' ? 14 : biome === 'drowned' || biome === 'frostkeep' ? 40 : 26;
  for (let i = 0; i < count; i++) {
    const seed = (i * 137.7 + i * i * 3.17), speed = 7 + i % 9;
    let x = (seed * 2.31 + t * (biome === 'dynasty' ? 26 : biome === 'frostkeep' ? 6 : 2)) % width;
    let y = (seed + t * (biome === 'drowned' ? speed * 3.4 : biome === 'frostkeep' ? speed : -speed * .35)) % height;
    if (y < 0) y += height; if (x < 0) x += width;
    ctx.globalAlpha = (.12 + (i % 4) * .05) * intensity;
    ctx.fillStyle = biome === 'foundry' ? '#e4a369' : biome === 'hollows' ? '#a0cca3' : biome === 'frostkeep' ? '#d3e8ec' : biome === 'drowned' ? '#90c8db' : biome === 'dynasty' ? '#cbb78b' : biome === 'astral' ? '#c9b4e5' : '#b3ae93';
    const w = biome === 'dynasty' ? 5 : i % 5 === 0 ? 2 : 1, h = biome === 'drowned' ? 7 : biome === 'foundry' ? 2 : 1;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
    if (biome === 'astral' && i % 7 === 0) { ctx.fillRect(Math.round(x) - 2, Math.round(y), 5, 1); ctx.fillRect(Math.round(x), Math.round(y) - 2, 1, 5); }
  }
  ctx.restore();
}