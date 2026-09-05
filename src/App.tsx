import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { artifacts, characters, ownsHero, loadProgress, loadSettings, type CharacterId, type Progress, type RunRecord, type Settings as SettingsType } from './data';
import { transact, type ShopAction } from './economy';
import { type BoostId, type BoostState, type DungeonId } from './game/content';
import { grantExperience, normalizeHero, type HeroProgress } from './progression';
import { DungeonAudio } from './game/audio';
import Icon from './components/Icon';
import CharacterSelect from './components/CharacterSelect';
import Armory from './components/Armory';
import Settings from './components/Settings';
import Game from './components/Game';
import SaveManager from './components/SaveManager';
import { makeSave, persistProgress, saveManually, type ParsedSave } from './saves';
import { artwork } from './assets';
import { isBiomeUnlocked, recordBiomeClear } from './campaign';
import Cheats, { type CheatAction } from './components/Cheats';
import PartyLobby from './components/PartyLobby';
import { PartySession } from './network/party';
import MenuCast from './components/MenuCast';

type Screen = 'menu' | 'characters' | 'armory' | 'game' | 'party';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState(loadSettings);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savesOpen, setSavesOpen] = useState(false);
  const [cheatsOpen, setCheatsOpen] = useState(false);
  const [party] = useState(() => new PartySession());
  const [partyActive, setPartyActive] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(() => { try { return JSON.parse(localStorage.getItem('forgotten-manual-save') || 'null')?.savedAt || null; } catch { return null; } });
  const [character, setCharacter] = useState<CharacterId>('knight');
  const [dungeon, setDungeon] = useState<DungeonId>('crypt');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [activeMenu, setActiveMenu] = useState(0);
  const [toast, setToast] = useState('');
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [audio] = useState(() => new DungeonAudio());
  const menuRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const appRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  const commitProgress = useCallback((next: Progress) => {
    progressRef.current = next;
    setProgress(next);
    try { persistProgress(next); } catch { setStorageAvailable(false); }
  }, []);

  useEffect(() => {
    audio.configure(settings);
    try { localStorage.setItem('forgotten-settings', JSON.stringify(settings)); } catch { setStorageAvailable(false); }
  }, [settings, audio]);
  useEffect(() => {
    try { persistProgress(progressRef.current); } catch { setStorageAvailable(false); }
  }, []);
  useEffect(() => () => audio.dispose(), [audio]);
  useEffect(() => () => party.leave(), [party]);
  useEffect(() => party.onLaunch(quest => {
    const member = party.isHost ? quest.host : quest.guest;
    const hero = characters.find(candidate => candidate.id === member.hero);
    if (!hero || !ownsHero(progressRef.current, hero, adminUnlocked) || !isBiomeUnlocked(progressRef.current, quest.dungeon)) { party.leave(); setToast('That hero or dungeon is locked in your current save.'); return; }
    setCharacter(member.hero); setDungeon(quest.dungeon); setPartyActive(true); setScreen('game'); audio.play('door');
  }), [party, audio, adminUnlocked]);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timeout); }, [toast]);
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  const navigate = useCallback((next: Screen) => { if (next !== 'game' && next !== 'party') { party.leave(); setPartyActive(false); } audio.play('ui'); setScreen(next); }, [audio, party]);
  const openSettings = useCallback(() => { audio.play('ui'); setSettingsOpen(true); }, [audio]);
  const selectMenu = useCallback((index: number) => {
    if (index === 0) navigate('characters');
    else if (index === 1) navigate('armory');
    else openSettings();
  }, [navigate, openSettings]);

  useEffect(() => {
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || settingsOpen || savesOpen || cheatsOpen || screen === 'game') return;
      if (event.code === 'Escape' && screen !== 'menu') { event.preventDefault(); navigate('menu'); return; }
      if (screen !== 'menu') return;
      if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
        event.preventDefault();
        const next = (activeMenu + (event.code === 'ArrowDown' ? 1 : 2)) % 3;
        setActiveMenu(next); menuRefs.current[next]?.focus(); audio.play('ui');
      }
      if (event.code === 'Enter' && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); selectMenu(activeMenu); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen, settingsOpen, savesOpen, cheatsOpen, activeMenu, selectMenu, navigate, audio]);

  const recordRun = useCallback((run: RunRecord) => { const previous = progressRef.current; if (!previous.runs.some(r => r.id === run.id)) commitProgress({ ...previous, runs: [run, ...previous.runs] }); }, [commitProgress]);
  const bankLoot = useCallback((gold: number, shards: number, boost?: BoostId) => {
    const previous = progressRef.current;
    commitProgress({ ...previous, gold: previous.gold + gold, shards: previous.shards + shards, inventory: boost ? { ...previous.inventory, [boost]: Math.min(999, previous.inventory[boost] + 1) } : previous.inventory });
  }, [commitProgress]);
  const saveBoosts = useCallback((activeBoosts: BoostState) => commitProgress({ ...progressRef.current, activeBoosts }), [commitProgress]);
  const saveHeroProgress = useCallback((id: CharacterId, mastery: HeroProgress) => commitProgress({ ...progressRef.current, heroes: { ...progressRef.current.heroes, [id]: normalizeHero(mastery) } }), [commitProgress]);
  const clearBiome = useCallback((id: DungeonId) => { const next = recordBiomeClear(progressRef.current, id); if (next !== progressRef.current) commitProgress(next); }, [commitProgress]);
  const applyCheat = (action: CheatAction) => {
    if (!adminUnlocked) return 'Admin access required. Unlock Cheats with the admin password first.';
    if (partyActive || screen === 'game') return 'Finish the current run first. Cheats cannot change an active quest.';
    if (!Number.isSafeInteger(action.amount) || action.amount < 1 || action.amount > 1000000) return 'Enter a positive whole number up to 1,000,000.';
    const previous = progressRef.current;
    if (action.kind === 'xp') {
      const hero = characters.find(c => c.id === action.hero); if (!hero || !ownsHero(previous, hero, adminUnlocked)) return 'Choose an owned hero.';
      const mastery = grantExperience(previous.heroes[hero.id], action.amount); commitProgress({ ...previous, heroes: { ...previous.heroes, [hero.id]: mastery } });
      return `${hero.short} received testing XP. Level ${mastery.level}/15. Attribute limits are still enforced.`;
    }
    if (!Number.isSafeInteger(previous[action.kind] + action.amount)) return 'This would exceed the wallet limit.';
    commitProgress({ ...previous, [action.kind]: previous[action.kind] + action.amount }); audio.play('coin');
    return `Added ${action.amount.toLocaleString()} ${action.kind === 'shards' ? 'Soul Shards' : 'gold'} to this device. Saved.`;
  };
  const shopTransaction = useCallback((action: ShopAction) => {
    const result = transact(progressRef.current, action, adminUnlocked);
    if (result.ok) { commitProgress(result.progress); audio.play('coin'); }
    return { ok: result.ok, message: result.message };
  }, [commitProgress, audio, adminUnlocked]);
  const unlockAdmin = (password: string) => { if (password !== 'admin1') return false; setAdminUnlocked(true); return true; };
  const changeSettings = useCallback((value: SettingsType) => { setSettings(value); audio.configure(value); void audio.unlock(); }, [audio]);
  const saveNow = () => {
    try { const at = saveManually(progressRef.current, settings); setSavedAt(at); setStorageAvailable(true); audio.play('ui'); setToast('Essentials saved. Export a backup before changing the preview URL.'); return { ok: true, message: 'Manual snapshot saved on this device. Your essential progression is safe in this browser.' }; }
    catch { setStorageAvailable(false); setToast('Local storage is unavailable. Use Export Backup to keep your progress.'); return { ok: false, message: 'Local save failed. Export a JSON backup instead; it does not need local storage.' }; }
  };
  const importSave = (save: ParsedSave) => {
    if (screen === 'game') return { ok: false, message: 'Finish the active run before restoring a backup.' };
    const previous = progressRef.current;
    let oldManual: string | null = null;
    let captured = false;
    try {
      oldManual = localStorage.getItem('forgotten-manual-save'); captured = true;
      localStorage.setItem('forgotten-pre-import', JSON.stringify(makeSave(previous, settings)));
      const nextSettings = save.settings || settings;
      const at = saveManually(save.progress, nextSettings);
      commitProgress(save.progress); setSettings(nextSettings); audio.configure(nextSettings); setSavedAt(at); setStorageAvailable(true);
      return { ok: true, message: 'Backup restored. Your heroes, wallets, mastery, and purchased boosts are ready. No currency was duplicated.' };
    } catch {
      if (captured) try {
        localStorage.setItem('forgotten-progress', JSON.stringify(previous));
        localStorage.setItem('forgotten-settings', JSON.stringify(settings));
        if (oldManual) localStorage.setItem('forgotten-manual-save', oldManual); else localStorage.removeItem('forgotten-manual-save');
      } catch { /* Keep the pre-import snapshot as a further recovery option. */ }
      return { ok: false, message: 'Restoration could not be saved on this device. Your in-memory progression has not been replaced. Enable browser storage and try again.' };
    }
  };
  const fullScreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (appRef.current?.requestFullscreen) await appRef.current.requestFullscreen();
      else setToast('Fullscreen is not available in this browser.');
    } catch { setToast('Fullscreen is unavailable in this preview. Try opening the game in its own tab.'); }
  };

  const equippedArtifact = artifacts.find(a => a.id === progress.artifact && a.unlocked(progress))?.id || null;

  return <div ref={appRef} style={{ '--gate-art': `url("${artwork('/images/dungeon-gate.png')}")` } as CSSProperties} className={`dungeon-app ${settings.crt ? 'crt-enabled' : ''} ${screen === 'game' ? 'playing' : ''}`} onPointerDownCapture={() => void audio.unlock()}>
    {screen === 'menu' && <MenuCast />}
    <div className={`ambient-scene ${screen !== 'menu' ? 'scene-dimmed' : ''}`} aria-hidden="true"><div className="dungeon-background" /><div className="scene-shade" /><div className="torch-light torch-left" /><div className="torch-light torch-right" /><div className="embers">{Array.from({ length: 17 }, (_, index) => <i key={index} style={{ '--x': `${46 + (index * 19 % 50)}%`, '--y': `${48 + (index * 7 % 45)}%`, '--duration': `${5 + index % 6}s`, '--delay': `${-index * 1.3}s`, '--drift': `${(index % 2 ? 1 : -1) * (12 + index * 3)}px` } as CSSProperties} />)}</div><div className="scene-vignette" /></div>

    <div className="app-content" inert={settingsOpen || savesOpen || cheatsOpen}>
      {screen !== 'game' && <header className="site-header"><button className="brand-lockup" onClick={() => navigate('menu')} aria-label="Dungeon of the Forgotten main menu"><span className="brand-mark"><Icon name="gate" size={29} /></span><span>FORGOTTEN<span>A DUNGEON WITHOUT END</span></span></button><div className="header-actions"><button className="header-save-button" onClick={saveNow} aria-label="Save progress now"><Icon name="save" size={17} /><span>SAVE</span></button><button className="icon-button" onClick={() => setSavesOpen(true)} aria-label="Save manager, export and import backups" title="Export / import your essentials"><Icon name="archive" size={18} /></button><span className="header-divider" /><button className="sound-button" onClick={() => changeSettings({ ...settings, sound: !settings.sound })} aria-label={settings.sound ? 'Mute audio' : 'Enable audio'} aria-pressed={settings.sound}><Icon name={settings.sound ? 'sound' : 'muted'} size={17} /><span>SOUND {settings.sound ? 'ON' : 'OFF'}</span></button><button className="icon-button fullscreen-button" onClick={() => void fullScreen()} aria-label="Toggle fullscreen"><Icon name="fullscreen" size={18} /></button><button className="icon-button" onClick={openSettings} aria-label="Open settings"><Icon name="settings" size={19} /></button></div></header>}

      {screen === 'menu' && <main className="main-menu"><section className="menu-composition"><div className="hero-eyebrow"><span /> A PIXEL-ART ACTION ROGUELIKE <span /></div><h1 className="game-title" aria-label="Dungeon of the Forgotten"><span className="title-first">DUNGEON</span><span className="title-connector"><i />OF THE<i /></span><span className="title-last">FORGOTTEN</span></h1><p className="hero-description">Some things are buried for a reason.<br />The depths are calling. Will you answer?</p><nav className="menu-options" aria-label="Main menu">{[
        { label: 'ENTER THE DUNGEON', icon: 'sword' as const },
        { label: 'THE ARMORY', icon: 'armory' as const },
        { label: 'SETTINGS', icon: 'settings' as const },
      ].map((option, index) => <button key={option.label} ref={element => { menuRefs.current[index] = element; }} className={`menu-button ${index === 0 ? 'gold-button' : 'outline-button'} ${activeMenu === index ? 'active' : ''}`} onClick={() => selectMenu(index)} onMouseEnter={() => setActiveMenu(index)} onFocus={() => setActiveMenu(index)} style={{ '--order': index } as CSSProperties}><Icon name={option.icon} size={20} /><span>{option.label}</span>{index === 0 ? <Icon name="arrow" size={19} /> : <span className="menu-number">0{index + 1}</span>}</button>)}</nav><div className="menu-secondary-actions"><button onClick={() => navigate('party')}><Icon name="shield" size={16} />PLAY TOGETHER</button><button onClick={() => setCheatsOpen(true)}><Icon name="bolt" size={15} />CHEATS</button></div><div className="menu-bottom-ornament" aria-hidden="true"><span /><Icon name="sword" size={14} /><span /></div></section></main>}

      {screen === 'characters' && <CharacterSelect onBack={() => navigate('menu')} onStart={(id, place) => { const hero = characters.find(c => c.id === id); if (!hero || !ownsHero(progressRef.current, hero, adminUnlocked) || !isBiomeUnlocked(progressRef.current, place)) return; setCharacter(id); setDungeon(place); audio.play('door'); setScreen('game'); }} progress={progress} onSound={() => audio.play('ui')} onTransaction={shopTransaction} adminUnlocked={adminUnlocked} onAdminUnlock={unlockAdmin} />}
      {screen === 'party' && <PartyLobby session={party} progress={progress} admin={adminUnlocked} onBack={() => navigate('menu')} />}
      {screen === 'armory' && <Armory progress={progress} adminUnlocked={adminUnlocked} persistent={storageAvailable} onProgress={value => { commitProgress(value); audio.play('ui'); }} onBack={() => navigate('menu')} />}
      {screen === 'game' && <Game characterId={character} settings={settings} artifact={equippedArtifact} audio={audio} dungeon={dungeon} activeBoosts={progress.activeBoosts} heroProgress={progress.heroes[character]} onHeroProgress={saveHeroProgress} onLoot={bankLoot} onBoosts={saveBoosts} onBiomeClear={clearBiome} session={partyActive ? party : null} settingsOpen={settingsOpen || savesOpen} onSettings={openSettings} onRecord={recordRun} onMenu={() => navigate('menu')} onRetry={() => navigate('characters')} onSave={saveNow} onBackups={() => setSavesOpen(true)} />}

      {screen !== 'game' && <footer className="site-footer"><div className="build-info"><span className="build-dot" />v1.4.0<span className="footer-divider" />{storageAvailable ? 'BETTER TOGETHER' : 'SESSION-ONLY SAVE'}</div><span className="footer-motto">DEATH IS ONLY THE BEGINNING.</span><div className="footer-keyboard">{screen === 'menu' ? <><span className="navigation-key"><Icon name="up" size={13} /><Icon name="down" size={13} /></span><span>NAVIGATE</span><kbd>ENTER</kbd><span>SELECT</span></> : <><kbd>ESC</kbd><span>RETURN TO MENU</span></>}</div></footer>}
    </div>

    {settingsOpen && <Settings settings={settings} persistent={storageAvailable} onChange={changeSettings} onClose={() => { setSettingsOpen(false); audio.play('ui'); }} />}
    {cheatsOpen && <Cheats progress={progress} admin={adminUnlocked} onUnlock={unlockAdmin} onApply={applyCheat} onClose={() => setCheatsOpen(false)} />}
    {savesOpen && <SaveManager progress={progress} settings={settings} inRun={screen === 'game'} persistent={storageAvailable} savedAt={savedAt} onSave={saveNow} onImport={importSave} onClose={() => setSavesOpen(false)} />}
    {settings.scanlines && <div className="scanlines" aria-hidden="true" />}
    {settings.crt && <div className="crt-effect" aria-hidden="true" />}
    {toast && <div className="app-toast" role="status"><Icon name="fullscreen" size={16} />{toast}</div>}
  </div>;
}
