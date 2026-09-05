import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { characters, formatTime, keyLabel, type Action, type CharacterId, type RunRecord, type Settings } from '../data';
import { boosts, chestRarities, dungeons, type BoostId, type BoostState, type DungeonId } from '../game/content';
import { DungeonEngine, type GameHUD } from '../game/engine';
import type { DungeonAudio } from '../game/audio';
import Icon from './Icon';
import Modal from './Modal';
import HeroPortrait from './HeroPortrait';
import { resourceFor, xpToNext, type HeroProgress } from '../progression';
import BossCountdown from './BossCountdown';
import CombatBar from './CombatBar';
import RunInventory from './RunInventory';
import BossEncounter from './BossEncounter';
import type { PartySession } from '../network/party';
import { useTouchControls } from '../hooks/useTouchControls';

export default function Game({ characterId, settings, artifact, audio, dungeon, activeBoosts, heroProgress, onHeroProgress, onLoot, onBoosts, settingsOpen, onSettings, onRecord, onMenu, onRetry, onSave, onBackups, onBiomeClear, session = null }: {
  characterId: CharacterId; settings: Settings; artifact: string | null; audio: DungeonAudio; settingsOpen: boolean;
  dungeon: DungeonId; activeBoosts: BoostState; onLoot: (gold: number, shards: number, boost?: BoostId) => void; onBoosts: (boosts: BoostState) => void;
  heroProgress: HeroProgress; onHeroProgress: (id: CharacterId, progress: HeroProgress) => void;
  onSettings: () => void; onRecord: (run: RunRecord) => void; onMenu: () => void; onRetry: () => void;
  onSave: () => void; onBackups: () => void;
  onBiomeClear: (id: DungeonId) => void; session?: PartySession | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DungeonEngine | null>(null);
  const recordRef = useRef(onRecord);
  recordRef.current = onRecord;
  const lootRef = useRef(onLoot), boostsRef = useRef(onBoosts);
  const masteryRef = useRef(onHeroProgress); masteryRef.current = onHeroProgress;
  lootRef.current = onLoot; boostsRef.current = onBoosts;
  const clearRef = useRef(onBiomeClear); clearRef.current = onBiomeClear;
  const initialRef = useRef({ settings, artifact, audio, dungeon, activeBoosts, heroProgress, session });
  const character = characters.find(c => c.id === characterId)!;
  const [paused, setPaused] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [run, setRun] = useState<RunRecord | null>(null);
  const [connectionError, setConnectionError] = useState(() => session && !session.connected ? session.getSnapshot().error || 'The party connection closed before the quest could start.' : '');
  const [hud, setHUD] = useState<GameHUD>({ hp: character.hp, maxHp: character.hp, floor: 1, gold: 0, kills: 0, special: 0, specialMax: character.cooldown, dodge: 0, seconds: 0, hint: '', notice: '', floorName: dungeons.find(d => d.id === dungeon)!.name, floorTime: 0, boss: null, stamina: character.stamina, maxStamina: character.stamina, infiniteStamina: characterId === 'phantom', shards: 0, dungeon: dungeons.find(d => d.id === dungeon)!.name, extra1: 0, extra2: 0, activeBoosts, statuses: [], loot: null, heroProgress, xpNext: xpToNext(heroProgress.level), energy: 100, maxEnergy: 100, resource: resourceFor(character).name, cooldowns: [0, 0, 0, 0, 0, 0], nextBoss: 3, bossDefeated: false, seals: [], equippedSeal: null, sealCooldown: 0, charms: {}, levelNotice: '', track: '', stage: 'dungeon', objective: 'Find the descent', biome: dungeon, elitesSlain: 0, elite: null });
  const isPhantom = characterId === 'phantom';
  const resource = resourceFor(character);
  const touch = useTouchControls();
  const blocked = paused || settingsOpen || inventoryOpen || !!run || hud.stage === 'intro' || !!connectionError || !!hud.party?.paused;

  useEffect(() => {
    if (!canvasRef.current) return;
    const { settings: initialSettings, artifact: initialArtifact, audio: initialAudio, dungeon: initialDungeon, activeBoosts: initialBoosts, heroProgress: initialMastery } = initialRef.current;
    const engine = new DungeonEngine(canvasRef.current, characterId, initialSettings, initialArtifact, initialAudio, {
      onHUD: setHUD,
      onPause: () => setPaused(value => !value),
      onEnd: record => { setRun(record); setPaused(false); setInventoryOpen(false); setConfirmLeave(false); recordRef.current(record); },
      onLoot: (gold, shards, boost) => lootRef.current(gold, shards, boost),
      onBoosts: remaining => boostsRef.current(remaining),
      onHeroProgress: progress => masteryRef.current(characterId, progress),
      onInventory: () => setInventoryOpen(true),
      onBiomeClear: id => clearRef.current(id),
    }, { dungeon: initialDungeon, activeBoosts: initialBoosts, heroProgress: initialMastery }, initialRef.current.session);
    engineRef.current = engine;
    return () => { engine.destroy(); engineRef.current = null; };
  }, [characterId]);

  useEffect(() => { engineRef.current?.updateSettings(settings); }, [settings]);
  useEffect(() => { if (!session) return; return session.subscribe(() => { const state = session.getSnapshot(); if (state.status === 'disconnected' || state.status === 'error') setConnectionError(state.error); }); }, [session]);
  useEffect(() => { engineRef.current?.setPaused(paused || settingsOpen || inventoryOpen || !!run || hud.stage === 'intro', settingsOpen || inventoryOpen || hud.stage === 'intro'); }, [paused, settingsOpen, inventoryOpen, run, hud.stage]);
  useEffect(() => {
    if (run) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [run]);

  const controls = (action: Action) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); engineRef.current?.input(action, true); },
    onPointerUp: () => engineRef.current?.input(action, false),
    onPointerCancel: () => engineRef.current?.input(action, false),
    onLostPointerCapture: () => engineRef.current?.input(action, false),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => { if (event.key === 'Enter' || event.code === 'Space') { event.preventDefault(); if (!event.repeat) engineRef.current?.input(action, true); } },
    onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => { if (event.key === 'Enter' || event.code === 'Space') { event.preventDefault(); engineRef.current?.input(action, false); } },
  });

  return <main className={`game-screen expanded-game mastery-game compact-game screen-enter ${touch ? 'touch-device' : 'keyboard-device'} ${isPhantom ? 'phantom-game' : ''} ${resource.kind === 'blood' ? 'killison-game' : ''}`}>
    <header className="game-hud" inert={blocked}>
      <div className="player-status"><div className="player-portrait"><HeroPortrait hero={character} /></div><div><div className="player-name">{character.short}<button onClick={() => setInventoryOpen(true)} aria-label="View hero mastery">LV. {hud.heroProgress.level}<small>/15</small></button></div><div className="health-track" role="meter" aria-label="Health" aria-valuenow={hud.hp} aria-valuemin={0} aria-valuemax={hud.maxHp}><div style={{ width: `${hud.hp / hud.maxHp * 100}%` }} /><span><Icon name="heart" size={11} />{hud.hp.toLocaleString()} / {hud.maxHp.toLocaleString()} HP</span></div><div className={`stamina-track ${hud.infiniteStamina ? 'infinite' : ''}`} role="meter" aria-label="Stamina" aria-valuenow={hud.stamina} aria-valuemin={0} aria-valuemax={hud.maxStamina}><div style={{ width: `${hud.infiniteStamina ? 100 : hud.stamina / hud.maxStamina * 100}%` }} /><span><Icon name={hud.infiniteStamina ? 'infinity' : 'bolt'} size={10} />{hud.infiniteStamina ? 'INFINITE STAMINA' : `${hud.stamina} / ${hud.maxStamina} STA`}</span></div>{resource.kind !== 'stamina' && resource.kind !== 'blood' ? <div className="energy-track" role="meter" aria-label={resource.name} aria-valuenow={hud.energy} aria-valuemin={0} aria-valuemax={hud.maxEnergy} style={{ '--energy-color': resource.color } as CSSProperties}><div style={{ width: `${hud.energy / hud.maxEnergy * 100}%` }} /><span>{hud.energy} / {hud.maxEnergy} {resource.short}</span></div> : resource.kind === 'blood' ? <span className="blood-resource-label">RITUALS SACRIFICE HP / HITS STEAL LIFE</span> : null}<div className="hud-xp-track" title={`${hud.heroProgress.xp} / ${hud.xpNext || 'MAX'} XP`}><span style={{ width: `${hud.xpNext ? hud.heroProgress.xp / hud.xpNext * 100 : 100}%` }} /></div></div></div>
      <div className="floor-status"><span className="micro-label">{hud.dungeon.toUpperCase()}</span><strong>{hud.stage === 'boss' || hud.stage === 'intro' ? 'GUARDIAN ARENA' : `FLOOR ${String(hud.floor).padStart(2, '0')}`}</strong><span className="floor-objective">{hud.objective}</span></div>
      <div className="encounter-controls"><BossCountdown floor={hud.floor} nextBoss={hud.nextBoss} defeated={hud.bossDefeated} fighting={!!hud.boss} /><button className="icon-button" onClick={() => setPaused(true)} aria-label="Pause game"><Icon name="pause" size={19} /></button></div>
    </header>

    <div className="game-stage"><div className="game-viewport">
      <canvas ref={canvasRef} className="dungeon-canvas" aria-label={`Dungeon game. Move with ${keyLabel(settings.bindings.up)}, ${keyLabel(settings.bindings.left)}, ${keyLabel(settings.bindings.down)}, ${keyLabel(settings.bindings.right)}. Attack with ${keyLabel(settings.bindings.attack)} or click. Press Escape to pause.`} tabIndex={0} />
      {hud.floorTime < 4 && !run && hud.stage === 'dungeon' && <div className="floor-announcement" key={hud.floor}><span>DESCENT {String(hud.floor).padStart(2, '0')}</span><h2>{hud.floorName}</h2><i /></div>}
      {hud.boss && <div className="boss-status"><div><Icon name="crown" size={18} /><span>{hud.boss.name}</span><small>PHASE {hud.boss.phase === 1 ? 'I' : 'II'}</small></div><div className="boss-health"><span style={{ width: `${hud.boss.hp / hud.boss.maxHp * 100}%` }} /></div></div>}
      {hud.elite && !hud.boss && <div className="elite-status" style={{ '--elite-color': hud.elite.color } as CSSProperties}><span><Icon name="skull" size={14} />ROAMING MINI-BOSS</span><h3>{hud.elite.name}</h3><div><i style={{ width: `${Math.max(0, hud.elite.hp) / hud.elite.maxHp * 100}%` }} /></div></div>}
      {hud.hint && !run && <div className="interaction-hint"><kbd>{keyLabel(settings.bindings.interact)}</kbd>{hud.hint}</div>}
      {hud.notice && !run && <div className="game-notice" role="status">{hud.notice}</div>}
      {hud.levelNotice && !run && <div className="level-up-notice" key={hud.levelNotice} role="status"><Icon name="crown" size={21} /><span>{hud.levelNotice}</span></div>}
      {hud.party && !run && <div className="party-game-status"><Icon name="shield" size={15} /><span>{hud.party.name}</span><strong>{hud.party.hp > 0 ? `${hud.party.hp} HP` : 'DOWNED'}</strong><small>{hud.party.host ? 'YOU LEAD' : 'COMPANION'}</small></div>}
      {hud.party?.paused && !paused && !run && !settingsOpen && <div className="shared-pause-note"><Icon name="pause" size={18} />Your companion paused the quest. Both heroes and all timers are safe.</div>}
      {hud.hp <= 0 && hud.party && !run && <div className="shared-pause-note downed-note"><Icon name="heart" size={19} />You are downed. Your companion can stand beside you and Interact to revive.</div>}
      <div className="run-buffs">{boosts.filter(boost => hud.activeBoosts[boost.id] > 0).map(boost => <div key={boost.id} title={boost.description} style={{ color: boost.color }}><Icon name={boost.icon} size={14} /><span>{boost.name}</span><strong>{formatTime(Math.ceil(hud.activeBoosts[boost.id]))}</strong></div>)}{hud.statuses.map(status => <div className="hero-status-effect" key={status.split(' ').slice(0, -1).join(' ')}><Icon name="bolt" size={12} />{status}</div>)}</div>
      {hud.loot && !run && <div className="loot-notification" key={hud.loot.id} role="status" style={{ '--loot-color': chestRarities[hud.loot.rarity].color } as CSSProperties}><Icon name={hud.loot.title?.includes('SEAL') ? 'crown' : 'chest'} size={27} /><div><span className="loot-rarity">{hud.loot.title || `${hud.loot.rarity.toUpperCase()} CACHE`}</span><div className="loot-values">{hud.loot.gold > 0 && <span><Icon name="coin" size={13} />+{hud.loot.gold}</span>}{hud.loot.shards > 0 && <span><Icon name="gem" size={13} />+{hud.loot.shards}</span>}{!!hud.loot.xp && <span>+{hud.loot.xp} XP</span>}{!!hud.loot.points && <small>+{hud.loot.points} ATTRIBUTE</small>}{hud.loot.gold + hud.loot.shards > 0 && <small>BANKED</small>}</div><p>{hud.loot.message}</p></div></div>}
    </div></div>

    <CombatBar hero={character} settings={settings} hud={hud} onAction={(action, down) => engineRef.current?.input(action, down)} onInventory={() => setInventoryOpen(true)} inert={blocked} />

    <div className="touch-controls" aria-label="Touch movement controls" inert={blocked}><div className="touch-dpad"><button {...controls('up')} aria-label="Move up"><Icon name="up" size={22} /></button><button {...controls('left')} aria-label="Move left"><Icon name="back" size={22} /></button><button {...controls('down')} aria-label="Move down"><Icon name="down" size={22} /></button><button {...controls('right')} aria-label="Move right"><Icon name="arrow" size={22} /></button></div><p>Six powers. One hero.<br />Tap a power to cast.</p><button className="icon-button" {...controls('map')} aria-label="Toggle minimap"><Icon name="map" size={22} /></button></div>

    {inventoryOpen && !run && <RunInventory hud={hud} hero={character} onClose={() => setInventoryOpen(false)} onEquip={id => engineRef.current?.equipSeal(id)} onAttribute={attribute => engineRef.current?.spendAttribute(attribute)} />}
    {hud.stage === 'intro' && !run && !settingsOpen && !connectionError && <BossEncounter biome={dungeon} waiting={!!hud.party?.bossReady} onBegin={() => engineRef.current?.beginBossEncounter()} />}
    {connectionError && !run && <Modal label="Party connection lost" className="pause-modal"><div className="pause-emblem"><Icon name="shield" size={35} /></div><h2>The link went quiet.</h2><p>{connectionError} Your already-earned currency and mastery remain saved.</p><div className="pause-actions"><button className="gold-button" onClick={() => engineRef.current?.finish('retreated')}>END RUN & KEEP PROGRESS</button></div></Modal>}

    {paused && !settingsOpen && !inventoryOpen && !run && !connectionError && hud.stage !== 'intro' && <Modal label={confirmLeave ? 'End your run?' : 'Game paused'} onClose={() => confirmLeave ? setConfirmLeave(false) : setPaused(false)} className="pause-modal">
      <div className="pause-emblem"><Icon name={confirmLeave ? 'gate' : 'pause'} size={33} /></div>
      <span className="eyebrow">{confirmLeave ? 'THE GATE IS STILL OPEN' : 'THE DARKNESS CAN WAIT'}</span><h2>{confirmLeave ? 'Leave the depths?' : 'Take a breath.'}</h2>
      <p>{confirmLeave ? 'Hero levels and banked currency are saved. Your seals, charms, and dungeon-found buffs will be lost when this run ends.' : 'Your descent and all boost timers are paused.'}</p>
      <div className="pause-actions">{confirmLeave ? <><button className="gold-button" onClick={() => setConfirmLeave(false)}>KEEP FIGHTING<Icon name="sword" size={17} /></button><button className="outline-button danger" onClick={() => engineRef.current?.finish('retreated')}>END RUN & SAVE</button></> : <><button className="gold-button" onClick={() => setPaused(false)}><Icon name="play" size={16} />RESUME THE DESCENT<Icon name="arrow" size={17} /></button><button className="outline-button" onClick={() => setInventoryOpen(true)}><Icon name="armory" size={17} />RUN INVENTORY & MASTERY</button><button className="outline-button" onClick={onSettings}><Icon name="settings" size={17} />SETTINGS</button><button className="text-button" onClick={() => setConfirmLeave(true)}>END THIS RUN</button></>}</div>
      {!confirmLeave && <p className="pause-score"><Icon name="sound" size={13} />{hud.track}</p>}
      {!confirmLeave && <div className="pause-save-actions"><button className="text-button" onClick={onSave}><Icon name="save" size={14} />SAVE NOW</button><button className="text-button" onClick={onBackups}><Icon name="archive" size={14} />EXPORT / BACKUPS</button></div>}
      <div className="pause-floor">FLOOR {String(hud.floor).padStart(2, '0')}<span />{formatTime(hud.seconds)}</div>
    </Modal>}

    {run && <Modal label="Run complete" className="results-modal"><div className="result-emblem"><Icon name={run.outcome === 'fallen' ? 'skull' : 'gate'} size={44} /></div><span className="eyebrow">{run.outcome === 'fallen' ? 'ANOTHER SOUL FOR THE STONE' : 'NOT ALL WHO DESCEND ARE LOST'}</span><h2>{run.outcome === 'fallen' ? 'The dungeon remembers.' : 'Live to descend again.'}</h2><p>{run.outcome === 'fallen' ? 'Your flame fades. Your mastery remains.' : 'Sometimes the bravest step is the one back into the light.'}</p><div className="result-stats"><div><Icon name="gate" size={21} /><strong>{String(run.floor).padStart(2, '0')}</strong><span>FLOOR REACHED</span></div><div><Icon name="skull" size={21} /><strong>{run.kills}</strong><span>ENEMIES SLAIN</span></div><div><Icon name="coin" size={21} /><strong>{run.gold}</strong><span>GOLD BANKED</span></div><div><Icon name="gem" size={21} /><strong>{run.shards || 0}</strong><span>SHARDS BANKED</span></div></div><div className="run-results-meta"><span><Icon name="chest" size={14} />{run.chests || 0} CHESTS OPENED</span><span><Icon name="clock" size={14} />{formatTime(run.seconds)} SURVIVED</span></div><div className="record-saved"><Icon name="check" size={15} />Hero progression and currency saved.</div><div className="run-progression-summary">{character.short}: Level {run.heroLevel || 1} / 15. +{run.xpEarned || 0} XP this run. {run.bosses || 0} guardians defeated.<small>All run-only seals, charms, and dungeon buffs have faded.</small></div><div className="result-actions"><button className="gold-button" onClick={onRetry}><Icon name="shop" size={18} />HEROES, MASTERY & NEXT RUN<Icon name="arrow" size={18} /></button><button className="outline-button" onClick={onMenu}>RETURN TO MAIN MENU</button></div></Modal>}
  </main>;
}