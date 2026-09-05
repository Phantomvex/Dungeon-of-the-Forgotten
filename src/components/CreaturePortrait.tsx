import { useEffect, useRef } from 'react';
import { drawEnemy } from '../game/sprites';
import { enemies, type EnemyKind } from '../game/content';

export default function CreaturePortrait({ kind }: { kind: EnemyKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw = (time: number) => {
      ctx.clearRect(0, 0, 56, 44);
      ctx.imageSmoothingEnabled = false;
      drawEnemy(ctx, kind, 28, 31, time / 1000, false, 1);
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    draw(0);
    return () => cancelAnimationFrame(frame);
  }, [kind]);
  return <canvas ref={ref} width={56} height={44} className="creature-portrait" aria-label={enemies[kind].name} role="img" />;
}