import { useEffect, useRef } from 'react';
import type { Dungeon } from '../game/content';
import { loadArtwork } from '../assets';

export default function DungeonArtwork({ dungeon }: { dungeon: Dungeon }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d'); if (!ctx) return;
    let disposed = false;
    ctx.fillStyle = dungeon.palette.floor[0]; ctx.fillRect(0, 0, 480, 240);
    for (let y = 0; y < 240; y += 24) for (let x = 0; x < 480; x += 48) { ctx.fillStyle = dungeon.palette.wall; ctx.fillRect(x + (y % 48 ? 24 : 0), y, 45, 21); }
    ctx.fillStyle = '#0a0e12'; ctx.fillRect(180, 50, 120, 190); ctx.strokeStyle = dungeon.color; ctx.lineWidth = 6; ctx.strokeRect(178, 49, 124, 195);
    void loadArtwork(dungeon.image).then(image => { if (!disposed) { ctx.imageSmoothingEnabled = false; ctx.drawImage(image, 0, 0, 480, 240); } }).catch(() => {});
    return () => { disposed = true; };
  }, [dungeon]);
  return <canvas ref={ref} width={480} height={240} className="dungeon-artwork" role="img" aria-label={dungeon.name} />;
}