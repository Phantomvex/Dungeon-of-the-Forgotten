import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { DungeonId } from '../game/content';
import { drawBoss } from '../game/bosses';
import { bossProfiles } from '../game/rewards';
import Icon from './Icon';
import Modal from './Modal';

export default function BossEncounter({ biome, onBegin, waiting = false }: { biome: DungeonId; onBegin: () => void; waiting?: boolean }) {
  const [line, setLine] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const boss = bossProfiles[biome];
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d'); if (!ctx) return;
    let frame = 0;
    const draw = (time: number) => {
      ctx.clearRect(0, 0, 220, 170); ctx.imageSmoothingEnabled = false;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const glow = ctx.createRadialGradient(110, 86, 10, 110, 86, 85); glow.addColorStop(0, `${boss.color}28`); glow.addColorStop(1, `${boss.color}00`);
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 220, 170);
      ctx.save(); ctx.translate(110, 139); ctx.scale(1.6, 1.6); drawBoss(ctx, biome, 0, 0, reduced ? 0 : time / 1000, false, 1); ctx.restore();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
  }, [biome, boss]);
  return <Modal label={`${boss.name} speaks`} className="boss-encounter-modal"><div className="boss-encounter" style={{ '--boss-color': boss.color } as CSSProperties}>
    <div className="encounter-location"><Icon name="gate" size={15} />PORTAL CROSSED<span>{boss.arena}</span></div>
    <div className="encounter-character"><canvas ref={canvas} width={220} height={170} role="img" aria-label={boss.name} /><span>{boss.epithet}</span><h2>{boss.name}</h2></div>
    <div className="boss-dialogue" key={line} aria-live="polite"><span className="dialogue-rule" /><p>{boss.dialogue[line]}</p></div>
    <div className="dialogue-footer"><button className="text-button" disabled={waiting} onClick={onBegin}>SKIP DIALOGUE</button><span>{line + 1} / {boss.dialogue.length}</span><button className="gold-button" disabled={waiting} onClick={() => line < boss.dialogue.length - 1 ? setLine(line + 1) : onBegin()}>{waiting ? 'WAITING FOR YOUR COMPANION' : line < boss.dialogue.length - 1 ? 'CONTINUE' : 'FACE THE GUARDIAN'}<Icon name={line < boss.dialogue.length - 1 ? 'arrow' : 'sword'} size={17} /></button></div>
    <small className="encounter-safety-note">Combat and boost timers are paused until you begin.</small>
  </div></Modal>;
}