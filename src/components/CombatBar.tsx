import { useState, type PointerEvent, type KeyboardEvent } from 'react';
import { formatTime, keyLabel, type Action, type Character, type Settings } from '../data';
import { abilitiesFor, abilityCostLabel } from '../game/abilities';
import { resourceFor } from '../progression';
import { sealDefinitions } from '../game/rewards';
import type { GameHUD } from '../game/engine';
import Icon from './Icon';

export default function CombatBar({ hero, settings, hud, onAction, onInventory, inert }: { hero: Character; settings: Settings; hud: GameHUD; onAction: (action: Action, down: boolean) => void; onInventory: () => void; inert: boolean }) {
  const abilities = abilitiesFor(hero), resource = resourceFor(hero);
  const [focused, setFocused] = useState(0);
  const seal = hud.seals.find(item => item.id === hud.equippedSeal);
  const click = (action: Action) => { onAction(action, true); onAction(action, false); };
  const hold = (action: Action) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => { event.currentTarget.setPointerCapture(event.pointerId); onAction(action, true); },
    onPointerUp: () => onAction(action, false), onPointerCancel: () => onAction(action, false), onLostPointerCapture: () => onAction(action, false),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => { if (event.key === 'Enter' || event.code === 'Space') { event.preventDefault(); if (!event.repeat) onAction(action, true); } },
    onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => { if (event.key === 'Enter' || event.code === 'Space') { event.preventDefault(); onAction(action, false); } },
  });
  const active = abilities[focused];
  return <footer className="combat-bar tidy-combat-bar" inert={inert}>
    <div className="combat-dock">
    <div className="combat-ability-row" aria-label="Six hero abilities">{abilities.map((ability, index) => {
      const locked = hud.heroProgress.level < ability.level, cooldown = hud.cooldowns[index] || 0;
      const availableEnergy = resource.kind === 'stamina' ? hud.infiniteStamina ? Infinity : hud.stamina : resource.kind === 'blood' ? hud.hp / hud.maxHp * 100 : hud.energy;
      const insufficient = ability.cost > 0 && (resource.kind === 'blood' ? availableEnergy <= ability.cost : availableEnergy < ability.cost);
      return <button key={ability.id} onMouseEnter={() => setFocused(index)} onFocus={() => setFocused(index)} className={`combat-slot ${locked ? 'locked' : cooldown > 0 && index > 0 ? 'cooling' : 'ready'} ${focused === index ? 'focused-slot' : ''} ${insufficient && !locked ? 'low-energy' : ''} ${index === 5 ? 'ultimate-slot' : ''}`} aria-label={`${ability.name}${locked ? `, unlocks at level ${ability.level}` : `, ${abilityCostLabel(hero, ability)}`}`} aria-disabled={locked} title={`${ability.description}\nLevel ${ability.level} / ${abilityCostLabel(hero, ability)} / ${ability.cooldown}s`} {...(index === 0 ? hold('attack') : { onClick: () => click(ability.action) })}>
        <div className="combat-slot-icon"><Icon name={ability.icon} size={25} />{locked ? <span className="combat-lock"><Icon name="lock" size={12} />{ability.level}</span> : cooldown > 0 && index > 0 ? <strong>{Math.ceil(cooldown)}</strong> : null}<kbd>{keyLabel(settings.bindings[ability.action])}</kbd>{!locked && index > 0 && <i style={{ height: `${Math.min(100, cooldown / ability.cooldown * 100)}%` }} />}</div><span><strong>{ability.name}</strong><small>{locked ? `UNLOCK AT LEVEL ${ability.level}` : index === 5 ? `${abilityCostLabel(hero, ability)} / ULTIMATE` : abilityCostLabel(hero, ability)}</small></span>
      </button>;
    })}</div>
    <div className="combat-focus-detail"><strong>{active.name}</strong><span>{hud.heroProgress.level < active.level ? `UNLOCKS AT LEVEL ${active.level}` : `${abilityCostLabel(hero, active)}${focused > 0 ? ` / ${active.cooldown}s COOLDOWN` : ' / HOLD TO ATTACK'}`}</span></div>
    <div className="combat-utility-row"><div className="combat-utilities"><button aria-label={`Dodge (${keyLabel(settings.bindings.dodge)})`} onClick={() => click('dodge')} title="Dodge using movement stamina"><Icon name="arrow" size={15} /><span>DODGE</span><kbd>{keyLabel(settings.bindings.dodge)}</kbd></button><button aria-label={`Hold to sprint (${keyLabel(settings.bindings.sprint)})`} {...hold('sprint')} title="Hold to sprint"><Icon name="sprint" size={15} /><span>SPRINT</span><kbd>{keyLabel(settings.bindings.sprint)}</kbd></button><button aria-label={`Interact (${keyLabel(settings.bindings.interact)})`} onClick={() => click('interact')}><Icon name="key" size={15} /><span>INTERACT</span><kbd>{keyLabel(settings.bindings.interact)}</kbd></button><button aria-label={seal ? `Cast ${sealDefinitions[seal.kind].power}` : 'No boss seal equipped'} className={`seal-action ${seal ? 'has-seal' : ''}`} onClick={() => click('seal')} title={seal ? sealDefinitions[seal.kind].description : 'Find and equip a boss seal in the run inventory'}><Icon name="crown" size={17} /><span>{hud.sealCooldown > 0 ? `${Math.ceil(hud.sealCooldown)}s` : seal ? 'SEAL READY' : 'NO SEAL'}</span><kbd>{keyLabel(settings.bindings.seal)}</kbd></button><button aria-label="Open run inventory" className="inventory-shortcut" onClick={onInventory}><Icon name="armory" size={15} /><span>RUN BAG</span>{hud.heroProgress.points > 0 && <em>{hud.heroProgress.points}</em>}<kbd>{keyLabel(settings.bindings.inventory)}</kbd></button></div></div>
    </div><div className="dock-side-meta"><span><Icon name="coin" size={13} />{hud.gold}</span><span><Icon name="gem" size={13} />{hud.shards}</span><small>{formatTime(hud.seconds)}</small></div>
  </footer>;
}