import { useEffect, useRef } from 'react';
import { drawHero } from '../game/sprites';
import type { CharacterId } from '../data';

export default function MenuCast() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let frame = 0;
    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(640, Math.round(rect.width / 1.8)), h = Math.max(360, Math.round(rect.height / 1.8));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const time = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : now / 1000;
      ctx.clearRect(0, 0, w, h); ctx.imageSmoothingEnabled = false;
      const center = w * .71, ground = h * .84, size = Math.min(3.25, w / 290);
      const cast: { hero: CharacterId; offset: number; scale: number; opacity: number }[] = [{ hero: 'seraph', offset: -83, scale: .9, opacity: .64 }, { hero: 'malachar', offset: 82, scale: 1.04, opacity: .7 }, { hero: 'killison', offset: -42, scale: 1, opacity: .87 }, { hero: 'frostguard', offset: 43, scale: .93, opacity: .8 }, { hero: 'phantom', offset: 0, scale: 1.5, opacity: 1 }];
      for (const member of cast) {
        const x = center + member.offset * size, y = ground + (member.hero === 'phantom' ? 10 : 0);
        ctx.save(); ctx.translate(x, y); ctx.scale(size * member.scale, size * member.scale); ctx.globalAlpha = member.opacity;
        drawHero(ctx, member.hero, 0, 0, time, false, 0);
        ctx.restore();
      }
      ctx.save(); ctx.globalCompositeOperation = 'screen'; const glow = ctx.createRadialGradient(center, ground - 40 * size, 0, center, ground - 40 * size, 75 * size); glow.addColorStop(0, 'rgba(128,80,175,.08)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = glow; ctx.fillRect(center - 80 * size, ground - 120 * size, 160 * size, 150 * size); ctx.restore();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={ref} className="menu-cast" aria-hidden="true" />;
}