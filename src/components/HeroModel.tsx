import { useEffect, useRef } from 'react';
import type { Character } from '../data';
import { drawHero, drawWeaponSwing } from '../game/sprites';
import Icon from './Icon';

export default function HeroModel({ hero }: { hero: Character }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strike = useRef(-10);
  const clock = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    const start = performance.now();
    const draw = (timestamp: number) => {
      const time = (timestamp - start) / 1000;
      clock.current = time;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      ctx.clearRect(0, 0, 120, 112); ctx.imageSmoothingEnabled = false;
      const glow = ctx.createRadialGradient(60, 65, 6, 60, 65, 49);
      glow.addColorStop(0, `${hero.color}24`); glow.addColorStop(1, `${hero.color}00`);
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 120, 112);
      ctx.strokeStyle = `${hero.color}59`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(60, 89, 43, 11, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + (reduced ? 0 : time * .2); ctx.fillStyle = `${hero.color}99`; ctx.fillRect(60 + Math.cos(a) * 39, 89 + Math.sin(a) * 9, 2, 2); }
      const progress = Math.max(0, (time - strike.current) / .55);
      ctx.save(); ctx.translate(60, 87); ctx.scale(hero.id === 'phantom' ? 2.5 : 2, hero.id === 'phantom' ? 2.5 : 2);
      drawHero(ctx, hero.id, 0, 0, reduced ? 0 : time, false, -.4, false, progress < 1 ? progress : 0);
      if (progress < 1) {
        if (['slash', 'daggers', 'fists'].includes(hero.style)) drawWeaponSwing(ctx, hero.id, 0, -4, -.4, progress, 2, hero.color, 28);
        else { for (let n = 0; n < 6; n++) { const a = n * Math.PI / 3 + time, r = 9 + progress * 23; ctx.fillStyle = hero.color; ctx.fillRect(Math.cos(a) * r, -6 + Math.sin(a) * r * .5, 3, 3); ctx.fillStyle = '#ece4cc'; ctx.fillRect(Math.cos(a) * r, -6 + Math.sin(a) * r * .5, 1, 1); } }
      }
      ctx.restore();
      frame = requestAnimationFrame(draw);
    };
    strike.current = -10;
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [hero]);
  return <button className="hero-model-preview" onClick={() => { strike.current = clock.current; }} title="Preview this hero's combat model" aria-label={`Preview ${hero.name} attack animation`}><canvas ref={canvasRef} width={120} height={112} aria-hidden="true" /><span><Icon name="play" size={10} />PREVIEW STRIKE</span></button>;
}