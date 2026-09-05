import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { characters, artifacts, ownsHero, formatTime, type CharacterId, type Progress } from '../data';
import { heroStats } from '../progression';
import { boosts, chestRarities, type DungeonId } from '../game/content';
import type { ShopAction, ShopResult } from '../economy';
import Icon from './Icon';
import HeroPortrait from './HeroPortrait';
import Modal from './Modal';
import HeroMastery from './HeroMastery';
import HeroModel from './HeroModel';
import DungeonPicker from './DungeonPicker';
import { isBiomeUnlocked } from '../campaign';

type Tab = 'heroes' | 'shop' | 'boosts';
type Dialog = 'phantom' | 'exchange' | 'purchase' | null;

export default function CharacterSelect({ onBack, onStart, progress, onSound, onTransaction, adminUnlocked, onAdminUnlock }: {
  onBack: () => void; onStart: (id: CharacterId, dungeon: DungeonId) => void; progress: Progress; onSound: () => void;
  onTransaction: (action: ShopAction) => ShopResult; adminUnlocked: boolean; onAdminUnlock: (password: string) => boolean;
}) {
  const [selected, setSelected] = useState<CharacterId>('knight');
  const [dungeon, setDungeon] = useState<DungeonId>('crypt');
  const [tab, setTab] = useState<Tab>('heroes');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [goldAmount, setGoldAmount] = useState(100);
  const [pendingPurchase, setPendingPurchase] = useState<ShopAction | null>(null);
  const character = characters.find(c => c.id === selected)!;
  const artifact = artifacts.find(a => a.id === progress.artifact && a.unlocked(progress));
  const available = ownsHero(progress, character, adminUnlocked);
  const roster = tab === 'shop' ? characters.filter(c => c.price > 0).sort((a, b) => a.price - b.price) : [
    ...characters.filter(c => c.price === 0), characters.find(c => c.id === 'phantom')!,
    ...characters.filter(c => c.price > 0 && ownsHero(progress, c)),
  ];
  const activeBoosts = boosts.filter(b => progress.activeBoosts[b.id] > 0);
  const openDialog = (next: Dialog) => { setError(''); setPassword(''); setDialog(next); };
  const pick = (id: CharacterId, prompt = true) => { setSelected(id); onSound(); if (id === 'phantom' && !adminUnlocked && prompt) openDialog('phantom'); };
  const switchTab = (next: Tab) => {
    setTab(next); setNotice(''); onSound();
    if (next === 'shop') setSelected(characters.find(c => c.price > 0)!.id);
    if (next === 'heroes' && character.price > 0 && !available) setSelected('knight');
  };
  const transact = (action: ShopAction) => { const result = onTransaction(action); if (result.ok) { setNotice(result.message); setDialog(null); } else setError(result.message); return result; };
  const purchase = (action: ShopAction) => { setPendingPurchase(action); openDialog('purchase'); };
  const unlock = (event: FormEvent) => { event.preventDefault(); if (onAdminUnlock(password)) { setDialog(null); setNotice('Admin access granted. The Phantom answers your call.'); onSound(); } else { setError('Incorrect password. The void remains sealed.'); setPassword(''); } };
  const pendingHero = pendingPurchase?.type === 'hero' ? characters.find(c => c.id === pendingPurchase.id) : null;
  const pendingBoost = pendingPurchase?.type === 'boost' ? boosts.find(b => b.id === pendingPurchase.id) : null;
  const pending = pendingHero || pendingBoost;
  const purchaseCurrency = pendingBoost ? 'GOLD' : 'SHARDS';
  const purchaseBalance = pendingBoost ? progress.gold : progress.shards;
  useEffect(() => { if (!isBiomeUnlocked(progress, dungeon)) setDungeon('crypt'); }, [progress, dungeon]);

  return <>
    <main className="secondary-screen character-screen expanded-fate screen-enter" inert={!!dialog}>
      <div className="screen-heading">
        <button className="back-link" onClick={onBack}><Icon name="back" size={16} /> MAIN MENU</button>
        <div className="eyebrow">MORE SOULS. NEW DEPTHS. YOUR NEXT CHAPTER.</div>
        <h1>Choose your fate<span>.</span></h1>
        <p>The darkness does not care who you were. Only what you become.</p>
      </div>

      <div className="fate-toolbar">
        <div className="panel-tabs" role="tablist" aria-label="Hero and shop sections">
          {([{ id: 'heroes', label: 'YOUR HEROES', icon: 'shield' }, { id: 'shop', label: 'HERO SHOP', icon: 'shop' }, { id: 'boosts', label: 'BOOSTS', icon: 'bolt' }] as const).map(item => <button key={item.id} role="tab" id={`fate-tab-${item.id}`} aria-selected={tab === item.id} aria-controls="fate-panel" onClick={() => switchTab(item.id)} className={tab === item.id ? 'active' : ''}><Icon name={item.icon} size={17} />{item.label}{item.id === 'shop' && <span className="tab-count">{characters.filter(c => c.price > 0).length}</span>}</button>)}
        </div>
        <div className="wallet" aria-label="Your wallet"><span title="Banked gold"><Icon name="coin" size={17} /><strong>{progress.gold.toLocaleString()}</strong><small>GOLD</small></span><span className="shard-balance" title="Soul shards"><Icon name="gem" size={17} /><strong>{progress.shards.toLocaleString()}</strong><small>SHARDS</small></span><button className="exchange-button" onClick={() => { setGoldAmount(Math.min(100, Math.floor(progress.gold / 10) * 10)); openDialog('exchange'); }}><Icon name="exchange" size={15} />EXCHANGE</button></div>
      </div>
      {notice && <div className="shop-notice" role="status"><Icon name="check" size={15} /><span>{notice}</span><button aria-label="Dismiss notice" className="icon-button" onClick={() => setNotice('')}><Icon name="close" size={13} /></button></div>}

      <section id="fate-panel" role="tabpanel" aria-labelledby={`fate-tab-${tab}`}>
        {tab !== 'boosts' ? <>
          {tab === 'shop' && <div className="shop-intro"><span>New allies. Permanent unlocks.</span><p>Soul Shards recruit heroes. Gold stocks your boost bag. Leveling is earned through XP, never purchased. Hero prices are unchanged.</p></div>}
          <div className={`character-roster expanded-roster ${tab === 'shop' ? 'shop-roster' : ''}`} role="radiogroup" aria-label="Choose your hero">
            {roster.map((c, index) => {
              const owned = ownsHero(progress, c, adminUnlocked);
              const stats = heroStats(c, progress.heroes[c.id]);
              return <button className={`character-card ${selected === c.id ? 'selected' : ''} ${c.id === 'phantom' ? 'phantom-card' : ''} ${c.id === 'killison' ? 'killison-card' : ''} ${!owned && c.id !== 'phantom' ? 'unowned-card' : ''}`} key={c.id} role="radio" aria-checked={selected === c.id} tabIndex={selected === c.id || !roster.some(c => c.id === selected) && index === 0 ? 0 : -1} style={{ '--character-color': c.color, '--order': Math.min(index, 4) } as CSSProperties}
                onClick={() => pick(c.id)} onKeyDown={event => { if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); const next = (index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : roster.length - 1)) % roster.length; pick(roster[next].id, false); (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus(); } }}>
                <div className="character-art"><HeroPortrait hero={c} /><div className="character-art-shade" />{c.id === 'phantom' && <div className="phantom-aura" />}</div>
                <span className="character-number">{owned ? `LV ${progress.heroes[c.id].level}` : c.id === 'killison' ? 'MYTHIC' : String(index + 1).padStart(2, '0')}</span>
                <span className="selection-mark">{selected === c.id ? <Icon name="check" size={14} /> : !owned ? <Icon name="lock" size={12} /> : null}</span>
                <div className="character-card-label"><span className="character-role">{c.role}</span><h2>{c.name}</h2><div className="character-traits"><span><Icon name="heart" size={12} />{stats.hp.toLocaleString()} HP</span><span><Icon name={c.id === 'phantom' ? 'infinity' : 'bolt'} size={12} />{c.id === 'phantom' ? 'MAX' : stats.stamina} STA</span></div><div className={`hero-ownership ${c.id === 'phantom' ? 'admin-ownership' : ''}`}>{c.id === 'phantom' ? <><Icon name={adminUnlocked ? 'check' : 'lock'} size={11} />{adminUnlocked ? 'ADMIN ACCESS GRANTED' : 'ADMIN ACCESS ONLY'}</> : c.price === 0 ? <><span className="free-dot" />FREE HERO</> : owned ? <><Icon name="check" size={11} />IN YOUR ROSTER</> : <><Icon name="gem" size={13} />{c.price.toLocaleString()} SOUL SHARDS</>}</div></div>
              </button>;
            })}
          </div>

          <div className={`hero-detail ${selected === 'phantom' ? 'phantom-detail' : ''}`} key={selected}>
            <div className="hero-detail-summary mastery-hero-summary"><HeroModel hero={character} /><div><span className="micro-label">{selected === 'killison' ? 'MYTHIC / BLOOD IS THE PRICE' : selected === 'phantom' ? 'THE STRONGEST. NO EXCEPTIONS.' : 'SELECTED HERO'}</span><h2>{character.name}</h2><p>{character.description}</p><div className="hero-passive-summary"><Icon name="shield" size={16} /><span><strong>{character.passive}</strong>{character.passiveText}</span></div></div></div>
            <HeroMastery hero={character} mastery={progress.heroes[selected]} owned={available} onTransaction={onTransaction} />
            {!available && <div className="hero-purchase-row"><span>{selected === 'phantom' ? 'Password-protected. Not available for purchase.' : 'Unlock once. Yours for every future descent.'}</span><button className={selected === 'phantom' ? 'phantom-button' : 'gold-button small'} onClick={() => selected === 'phantom' ? openDialog('phantom') : purchase({ type: 'hero', id: selected })}><Icon name={selected === 'phantom' ? 'lock' : 'gem'} size={16} />{selected === 'phantom' ? 'UNLOCK THE PHANTOM' : `RECRUIT FOR ${character.price} SHARDS`}<Icon name="arrow" size={15} /></button></div>}
          </div>
        </> : <>
          <div className="shop-intro"><span>Put your gold to work.</span><p>Ten useful boosts, bought with gold. Buy, then activate for five minutes of gameplay. Menus, dialogue, and pauses never use your time.</p></div>
          <div className="boost-shop">{boosts.map(boost => <article className="boost-item" key={boost.id} style={{ '--boost-color': boost.color } as CSSProperties}><div className="boost-item-top"><span className="boost-vial"><Icon name={boost.icon} size={29} /></span><span className="boost-duration"><Icon name="clock" size={12} />5 MIN</span></div><span className="micro-label">{boost.effect}</span><h2>{boost.name}</h2><p>{boost.description}</p><div className="boost-inventory"><span>IN YOUR BAG <strong>{progress.inventory[boost.id]}</strong></span><span>{progress.activeBoosts[boost.id] > 0 ? `${formatTime(progress.activeBoosts[boost.id])} READY` : 'NOT ACTIVE'}</span></div><button className="outline-button small" onClick={() => purchase({ type: 'boost', id: boost.id })}><Icon name="coin" size={14} />BUY FOR {boost.price} GOLD</button><button className="boost-activate" disabled={progress.inventory[boost.id] < 1} onClick={() => { const result = transact({ type: 'activate', id: boost.id }); if (!result.ok) setNotice(result.message); }}><Icon name="play" size={13} />{progress.activeBoosts[boost.id] > 0 ? 'ADD 5 MORE MINUTES' : 'ACTIVATE FOR NEXT RUN'}</button></article>)}</div>
          <div className="treasure-guide"><div><Icon name="chest" size={24} /><h3>Not every treasure is currency.</h3><p>Chests can hold XP, attribute points, supplies, or run-only relics instead of coins.</p></div><div className="rarity-guide">{Object.entries(chestRarities).map(([id, rarity]) => <span key={id} title={rarity.reward} style={{ color: rarity.color }}><i style={{ background: rarity.color }} />{rarity.name}<small>{rarity.weight}%</small></span>)}</div></div>
        </>}
      </section>

      {tab !== 'boosts' && <DungeonPicker progress={progress} selected={dungeon} onSelect={id => { setDungeon(id); onSound(); }} />}

      <div className="selection-footer"><div className="loadout-summary"><div className="equipped-artifact"><Icon name={tab !== 'heroes' ? 'shield' : artifact ? artifact.icon : 'shield'} size={19} /><div><span className="micro-label">{tab !== 'heroes' ? 'SELECTED HERO' : 'EQUIPPED ARTIFACT'}</span><p>{tab !== 'heroes' ? character.name : artifact ? artifact.name : 'None. Your story is yet to be written.'}</p></div></div>{activeBoosts.length > 0 && <div className="ready-boosts">{activeBoosts.map(boost => <span key={boost.id} title={`${boost.name}: ${formatTime(progress.activeBoosts[boost.id])} remaining`}><Icon name={boost.icon} size={13} />{formatTime(progress.activeBoosts[boost.id])}</span>)}</div>}</div><button className={`gold-button begin-button ${selected === 'phantom' ? 'phantom-begin' : ''}`} onClick={() => available ? onStart(selected, dungeon) : selected === 'phantom' ? openDialog('phantom') : purchase({ type: 'hero', id: selected })}><Icon name={selected === 'phantom' ? 'ghost' : available ? 'sword' : 'gem'} size={19} /><span>{available ? 'BEGIN THE DESCENT' : selected === 'phantom' ? 'UNLOCK THE PHANTOM' : `RECRUIT FOR ${character.price} SHARDS`}</span><Icon name="arrow" size={19} /></button></div>
      <p className="fate-save-note"><Icon name="coin" size={12} />Hero levels, attributes, and currency persist. Boss seals and dungeon charms are lost when your run ends.</p>
    </main>

    {dialog === 'phantom' && <Modal label="Unlock The Phantom" className="phantom-modal" onClose={() => setDialog(null)}><button className="icon-button dialog-close" aria-label="Close Phantom unlock" onClick={() => setDialog(null)}><Icon name="close" /></button><div className="phantom-unlock-art"><HeroPortrait hero={characters.find(c => c.id === 'phantom')!} /></div><div className="phantom-unlock-body"><span className="eyebrow">ADMIN ACCESS ONLY</span><h2>The void knows its master.</h2><p>Overwhelming base stats. Six shadow abilities, awakened through hero level 15. Even the void has a journey.</p><form onSubmit={unlock}><label htmlFor="phantom-password">ENTER ADMIN PASSWORD</label><input id="phantom-password" type="password" autoComplete="off" value={password} onChange={event => { setPassword(event.target.value); setError(''); }} placeholder="Password" autoFocus required aria-describedby={error ? 'phantom-error' : undefined} />{error && <p className="form-error" id="phantom-error" role="alert">{error}</p>}<button className="phantom-button" type="submit"><Icon name="ghost" size={19} />AWAKEN THE PHANTOM<Icon name="arrow" size={17} /></button></form><small>Local single-player access. Unlocks for this session; not server authentication.</small></div></Modal>}
    {dialog === 'exchange' && <Modal label="Exchange gold for soul shards" className="shop-dialog" onClose={() => setDialog(null)}><div className="modal-heading"><div><span className="eyebrow">THE SOUL EXCHANGE</span><h2>Gold becomes possibility.</h2></div><button className="icon-button" aria-label="Close exchange" onClick={() => setDialog(null)}><Icon name="close" /></button></div><form className="exchange-form" onSubmit={event => { event.preventDefault(); transact({ type: 'exchange', gold: goldAmount }); }}><p>Optionally trade gold for hero recruitment shards. Keep some gold for boosts and supplies. Hero leveling only uses earned XP.</p><div className="exchange-rate"><span><Icon name="coin" size={23} />10 GOLD</span><Icon name="arrow" size={20} /><span><Icon name="gem" size={23} />1 SOUL SHARD</span></div><label htmlFor="exchange-amount">GOLD TO EXCHANGE <span>{progress.gold.toLocaleString()} AVAILABLE</span></label><div className="exchange-input"><input id="exchange-amount" type="number" min="10" step="10" max={Math.floor(progress.gold / 10) * 10} value={goldAmount || ''} onChange={e => { setGoldAmount(Number(e.target.value)); setError(''); }} placeholder="Enter gold amount" required /><button type="button" className="text-button" disabled={progress.gold < 10} onClick={() => setGoldAmount(Math.floor(progress.gold / 10) * 10)}>MAX</button></div><div className="exchange-receive"><span>YOU RECEIVE</span><strong><Icon name="gem" size={19} />{Math.max(0, Math.floor(goldAmount / 10))} SOUL SHARDS</strong></div>{error && <p className="form-error" role="alert">{error}</p>}{progress.gold < 10 && <p className="form-help">You need at least 10 gold. Your next chest is waiting in the dungeon.</p>}<button className="gold-button" type="submit" disabled={goldAmount < 10 || goldAmount > progress.gold || goldAmount % 10 !== 0}><Icon name="exchange" size={18} />CONFIRM EXCHANGE</button></form></Modal>}
    {dialog === 'purchase' && pending && <Modal label={`Purchase ${pending.name}`} className="shop-dialog purchase-dialog" onClose={() => setDialog(null)}><div className="modal-heading"><div><span className="eyebrow">{pendingHero ? 'A NEW ALLY AWAITS' : 'PREPARE FOR THE DEPTHS'}</span><h2>{pending.name}</h2></div><button className="icon-button" aria-label="Cancel purchase" onClick={() => setDialog(null)}><Icon name="close" /></button></div><div className="purchase-body">{pendingHero && <div className="purchase-portrait"><HeroPortrait hero={pendingHero} /></div>}<p>{pendingHero ? `${pendingHero.description} This is a permanent hero unlock.` : `${pendingBoost?.description} Adds one 5-minute boost to your inventory. Activate it whenever you are ready.`}</p><div className="purchase-cost"><span>COST</span><strong><Icon name={pendingBoost ? 'coin' : 'gem'} size={20} />{pending.price.toLocaleString()} {purchaseCurrency}</strong></div><div className="purchase-balance">YOUR BALANCE <span>{purchaseBalance.toLocaleString()} {purchaseCurrency}</span></div>{purchaseBalance < pending.price && <p className="form-help">You need {(pending.price - purchaseBalance).toLocaleString()} more {purchaseCurrency.toLowerCase()}. {pendingBoost ? 'Collect gold from chests, enemies, and breakable urns.' : 'Seek rarer treasure, defeat guardians, or exchange gold.'}</p>}{error && <p className="form-error" role="alert">{error}</p>}<button className="gold-button" disabled={purchaseBalance < pending.price} onClick={() => pendingPurchase && transact(pendingPurchase)}><Icon name={pendingHero ? 'shield' : 'coin'} size={18} />{pendingHero ? 'CONFIRM RECRUITMENT' : 'BUY BOOST WITH GOLD'}</button>{pendingHero && <button className="text-button" onClick={() => { setGoldAmount(Math.min(100, Math.floor(progress.gold / 10) * 10)); openDialog('exchange'); }}>NEED SHARDS? EXCHANGE GOLD<Icon name="arrow" size={14} /></button>}</div></Modal>}
  </>;
}