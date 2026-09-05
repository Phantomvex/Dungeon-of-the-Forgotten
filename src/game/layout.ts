import type { DungeonId } from './content';

export const WORLD_COLS = 66, WORLD_ROWS = 48, WORLD_TILE = 16;
export interface Room { x: number; y: number; w: number; h: number; cx: number; cy: number; }
interface Cell { x: number; y: number; w: number; h: number }
export interface FloorLayout { rooms: Room[]; tiles: number[]; torches: { x: number; y: number }[]; route: number[]; name: string; }
const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const tileCenter = (n: number) => n * WORLD_TILE + 8;
const themes: Record<DungeonId, string[]> = {
  crypt: ['The Ossuary Maze', 'The Broken Reliquary', 'The Long Burial', 'The Pilgrim\'s Cross'],
  foundry: ['The Assembly Lines', 'The Cooling Vaults', 'The Chainworks', 'The Furnace Crossing'],
  hollows: ['The Rooted Grotto', 'The Spore Labyrinth', 'The Tangled Heart', 'The Mossbound Burrows'],
  drowned: ['The Flooded Cloister', 'The Sundered Aqueduct', 'The Tidal Galleries', 'The Saltwater Labyrinth'],
  frostkeep: ['The Shattered Glacier', 'The Icebound Passages', 'The Crystal Wound', 'The Frozen Hollow'],
  dynasty: ['The Jackal\'s Passage', 'The Buried Procession', 'The Sunken Courtyards', 'The Tomb of Mirrors'],
  astral: ['The Broken Orbit', 'The Constellation Walk', 'The Drifting Observatory', 'The Starless Spiral'],
};

export function createLayout(biome: DungeonId, floor: number): FloorLayout {
  const cells: Cell[] = [{ x: 2, y: 2, w: WORLD_COLS - 4, h: WORLD_ROWS - 4 }];
  const target = randomInt(8, 11);
  for (let attempt = 0; cells.length < target && attempt < 100; attempt++) {
    const candidates = cells.filter(cell => cell.w >= 23 || cell.h >= 19).sort((a, b) => b.w * b.h - a.w * a.h);
    if (!candidates.length) break;
    const cell = candidates[randomInt(0, Math.min(2, candidates.length - 1))];
    if (!cell) break;
    const vertical = cell.w >= 23 && (cell.h < 19 || cell.w / cell.h > 1.25 || Math.random() < .45);
    const split = vertical ? randomInt(10, cell.w - 11) : randomInt(8, cell.h - 9);
    const a = vertical ? { ...cell, w: split } : { ...cell, h: split };
    const b = vertical ? { ...cell, x: cell.x + split, w: cell.w - split } : { ...cell, y: cell.y + split, h: cell.h - split };
    cells.splice(cells.indexOf(cell), 1, a, b);
  }
  const tiles = new Array<number>(WORLD_COLS * WORLD_ROWS).fill(0);
  const rooms: Room[] = cells.map(cell => {
    const margin = biome === 'astral' ? 2 : randomInt(1, 2);
    const w = Math.max(7, cell.w - margin * 2), h = Math.max(6, cell.h - margin * 2);
    const x = cell.x + Math.min(margin, cell.w - w), y = cell.y + Math.min(margin, cell.h - h);
    return { x, y, w, h, cx: tileCenter(x + Math.floor(w / 2)), cy: tileCenter(y + Math.floor(h / 2)) };
  }).sort((a, b) => a.x + a.y - b.x - b.y);
  const carve = (x: number, y: number, value = 1) => { if (x > 0 && y > 0 && x < WORLD_COLS - 1 && y < WORLD_ROWS - 1) tiles[y * WORLD_COLS + x] = value; };
  const rounded = ['hollows', 'frostkeep', 'astral'].includes(biome);
  rooms.forEach(room => {
    for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) {
      const nx = (x - room.x - (room.w - 1) / 2) / (room.w / 2), ny = (y - room.y - (room.h - 1) / 2) / (room.h / 2);
      if (!rounded || nx * nx + ny * ny < (biome === 'frostkeep' ? 1.2 : 1.05)) carve(x, y);
    }
    if ((biome === 'crypt' || biome === 'dynasty' || biome === 'foundry') && room.w > 13 && room.h > 9) {
      for (const x of [room.x + 3, room.x + room.w - 4]) for (const y of [room.y + 3, room.y + room.h - 4]) { carve(x, y, 0); if (biome === 'dynasty') carve(x + 1, y, 0); }
    }
  });
  const links = new Map<number, number[]>(); rooms.forEach((_, i) => links.set(i, []));
  const protectedRoute = new Set<number>();
  const connect = (a: number, b: number) => {
    links.get(a)!.push(b); links.get(b)!.push(a);
    let x = Math.floor(rooms[a].cx / WORLD_TILE), y = Math.floor(rooms[a].cy / WORLD_TILE);
    const bx = Math.floor(rooms[b].cx / WORLD_TILE), by = Math.floor(rooms[b].cy / WORLD_TILE);
    const width = biome === 'astral' ? 0 : biome === 'foundry' ? 2 : 1;
    const point = () => { for (let yy = -width; yy <= width; yy++) for (let xx = -width; xx <= width; xx++) { carve(x + xx, y + yy); protectedRoute.add((y + yy) * WORLD_COLS + x + xx); } };
    const horizontal = Math.random() < .5;
    while (x !== bx || y !== by) {
      point();
      if (biome === 'hollows' || biome === 'frostkeep') { if (x !== bx && (y === by || Math.random() < .5)) x += Math.sign(bx - x); else y += Math.sign(by - y); }
      else if (horizontal ? x !== bx : y === by) x += Math.sign(bx - x); else y += Math.sign(by - y);
    }
    point();
  };
  const visited = new Set([0]);
  while (visited.size < rooms.length) {
    let best: [number, number] = [0, 1], shortest = Infinity;
    for (const a of visited) for (let b = 0; b < rooms.length; b++) if (!visited.has(b)) {
      const d = Math.hypot(rooms[a].cx - rooms[b].cx, rooms[a].cy - rooms[b].cy) * (.8 + Math.random() * .4);
      if (d < shortest) { shortest = d; best = [a, b]; }
    }
    connect(...best); visited.add(best[1]);
  }
  for (let i = 0; i < (biome === 'astral' ? 1 : 2); i++) { const a = randomInt(0, rooms.length - 1), b = randomInt(0, rooms.length - 1); if (a !== b && !links.get(a)!.includes(b)) connect(a, b); }
  const distance = new Array(rooms.length).fill(Infinity); distance[0] = 0; const done = new Set<number>();
  while (done.size < rooms.length) {
    let current = -1; for (let i = 0; i < rooms.length; i++) if (!done.has(i) && (current < 0 || distance[i] < distance[current])) current = i;
    done.add(current);
    for (const next of links.get(current)!) distance[next] = Math.min(distance[next], distance[current] + Math.hypot(rooms[current].cx - rooms[next].cx, rooms[current].cy - rooms[next].cy));
  }
  const ordered = rooms.map((room, i) => ({ room, distance: distance[i] })).sort((a, b) => a.distance - b.distance).map(item => item.room);
  ordered.forEach((room, index) => {
    if (index === 0) return;
    for (let y = room.y + 1; y < room.y + room.h - 1; y++) for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
      const cell = y * WORLD_COLS + x;
      if (!tiles[cell] || protectedRoute.has(cell)) continue;
      const nearEdge = x < room.x + 3 || x >= room.x + room.w - 3 || y < room.y + 2;
      if (biome === 'drowned' && (y - room.y) % 6 < 3) tiles[cell] = 2;
      if (biome === 'foundry' && (x - room.x) % 9 < 2 && nearEdge) tiles[cell] = 2;
      if (biome === 'frostkeep' && (x * 3 + y * 2 + floor) % 13 < 4) tiles[cell] = 2;
      if (biome === 'hollows' && nearEdge && (x + y + index) % 7 < 3) tiles[cell] = 2;
      if (biome === 'dynasty' && nearEdge && (x + y) % 6 < 3) tiles[cell] = 2;
      if (biome === 'astral' && nearEdge && (x + y) % 9 < 2) tiles[cell] = 2;
      if (biome === 'crypt' && index % 3 === 1 && y === room.y + room.h - 3 && x < room.x + 6) tiles[cell] = 3;
    }
  });
  const torches = ordered.flatMap(room => [{ x: room.cx - Math.min(60, room.w * 4), y: room.y * WORLD_TILE + 8 }, { x: room.cx + Math.min(60, room.w * 4), y: room.y * WORLD_TILE + 8 }]);
  return { rooms: ordered, tiles, torches, route: [...protectedRoute], name: themes[biome][(floor - 1 + randomInt(0, 3)) % 4] };
}

export function createArena(biome: DungeonId): FloorLayout {
  const tiles = new Array<number>(WORLD_COLS * WORLD_ROWS).fill(0), x = 13, y = 10, w = 39, h = 26;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const nx = (xx - x - w / 2) / (w / 2), ny = (yy - y - h / 2) / (h / 2);
    if (['hollows', 'astral', 'frostkeep'].includes(biome) && nx * nx + ny * ny > 1) continue;
    tiles[yy * WORLD_COLS + xx] = 1;
  }
  const room = { x, y, w, h, cx: tileCenter(x + Math.floor(w / 2)), cy: tileCenter(y + Math.floor(h / 2)) };
  return { rooms: [room], tiles, route: [], name: 'Guardian Arena', torches: [-190, -90, 90, 190].map(offset => ({ x: room.cx + offset, y: y * WORLD_TILE + 10 })) };
}