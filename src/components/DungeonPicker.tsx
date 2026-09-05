import { useState, type CSSProperties } from 'react';
import type { Progress } from '../data';
import { dungeons, type DungeonId } from '../game/content';
import { isBiomeUnlocked } from '../campaign';
import DungeonArtwork from './DungeonArtwork';
import Icon from './Icon';

export default function DungeonPicker({ progress, selected, onSelect }: { progress: Progress; selected: DungeonId; onSelect: (id: DungeonId) => void }) {
  const [message, setMessage] = useState('');
  const choose = (index: number) => {
    const place = dungeons[index];
    if (!isBiomeUnlocked(progress, place.id)) { setMessage(`Defeat the guardian of ${dungeons[index - 1].name} first. Biomes unlock in order.`); return; }
    setMessage(''); onSelect(place.id);
  };
  return <section className="dungeon-picker campaign-picker" aria-label="Choose an unlocked dungeon"><div className="section-subheading"><span className="micro-label">CHOOSE YOUR DESCENT</span><span>{dungeons.filter(d => isBiomeUnlocked(progress, d.id)).length} / {dungeons.length} BIOMES UNLOCKED</span></div><p className="campaign-rule">Defeat each biome's guardian to open the next path. The Forsaken Halls are always open.</p><div className="dungeon-options" role="radiogroup" aria-label="Biome campaign">{dungeons.map((place, index) => {
    const unlocked = isBiomeUnlocked(progress, place.id), cleared = progress.clearedBiomes.includes(place.id);
    return <button key={place.id} role="radio" aria-checked={selected === place.id} aria-disabled={!unlocked} tabIndex={selected === place.id ? 0 : -1} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1; const next = (index + step + dungeons.length) % dungeons.length; (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus(); if (isBiomeUnlocked(progress, dungeons[next].id)) choose(next); } }} onClick={() => choose(index)} className={`dungeon-option ${selected === place.id ? 'selected' : ''} ${!unlocked ? 'biome-locked' : ''}`} style={{ '--dungeon-color': place.color } as CSSProperties}><DungeonArtwork dungeon={place} /><div className="dungeon-option-shade" /><div><span>CHAPTER {String(index + 1).padStart(2, '0')} / {cleared ? 'CONQUERED' : unlocked ? 'AVAILABLE' : 'LOCKED'}</span><h3>{place.name}</h3><p>{unlocked ? place.description : `Defeat ${dungeons[index - 1].name} to unlock.`}</p></div><span className="dungeon-check"><Icon name={!unlocked ? 'lock' : cleared ? 'check' : selected === place.id ? 'check' : 'gate'} size={15} /></span></button>;
  })}</div>{message && <p className="campaign-lock-message" role="status"><Icon name="lock" size={14} />{message}</p>}</section>;
}