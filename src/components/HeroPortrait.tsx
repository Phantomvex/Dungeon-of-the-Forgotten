import { useEffect, useRef } from 'react';
import type { Character } from '../data';
import { loadArtwork } from '../assets';
import { drawHero } from '../game/sprites';

export default function HeroPortrait({ hero, className = '' }: { hero: Character; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false;
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const fallback = () => {
      ctx.fillStyle = '#11161a'; ctx.fillRect(0, 0, 240, 360);
      ctx.save(); ctx.translate(120, 260); ctx.scale(6, 6); drawHero(ctx, hero.id, 0, 0, 0, false, 0); ctx.restore();
    };
    fallback();
    void loadArtwork(hero.image).then(image => {
      if (disposed) return;
      const rows = hero.image.endsWith('.svg') ? 1 : 2;
      const sw = hero.portrait === undefined ? image.naturalWidth : image.naturalWidth / 5;
      const sh = hero.portrait === undefined ? image.naturalHeight : image.naturalHeight / rows;
      const sx = hero.portrait === undefined ? 0 : (hero.portrait % 5) * sw;
      const sy = hero.portrait === undefined ? 0 : Math.floor(hero.portrait / 5) * sh;
      ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, 240, 360);
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, 240, 360);
    }).catch(() => { if (!disposed) fallback(); });
    return () => { disposed = true; };
  }, [hero]);
  return <canvas ref={ref} width={240} height={360} className={`hero-portrait ${className}`} role="img" aria-label={hero.name} />;
}