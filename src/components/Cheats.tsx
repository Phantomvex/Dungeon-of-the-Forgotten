import { useEffect, useRef, useState, type FormEvent } from 'react';
import { characters, ownsHero, type Progress, type CharacterId } from '../data';
import Icon from './Icon';
import Modal from './Modal';

export type CheatAction = { kind: 'gold' | 'shards'; amount: number } | { kind: 'xp'; amount: number; hero: CharacterId };
export default function Cheats({ progress, admin, onUnlock, onApply, onClose }: { progress: Progress; admin: boolean; onUnlock: (password: string) => boolean; onApply: (action: CheatAction) => string; onClose: () => void }) {
  const [kind, setKind] = useState<'gold' | 'shards' | 'xp'>('shards');
  const [amount, setAmount] = useState('1000');
  const [hero, setHero] = useState<CharacterId>('knight');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (admin) kindRef.current?.focus();
    else passwordRef.current?.focus();
  }, [admin]);

  const authenticate = (event: FormEvent) => {
    event.preventDefault();
    const granted = onUnlock(password);
    setPassword('');
    if (!granted) {
      setAuthError('Incorrect password. Cheats are restricted to admins.');
      passwordRef.current?.focus();
    } else setAuthError('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!admin) return;
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value < 1 || value > 1000000) { setMessage('Enter a whole number from 1 to 1,000,000.'); return; }
    setMessage(onApply(kind === 'xp' ? { kind, amount: value, hero } : { kind, amount: value }));
  };

  return <Modal label={admin ? 'Admin testing cheats' : 'Admin access required'} className="cheats-modal shop-dialog" onClose={onClose}>
    <div className="modal-heading">
      <div><span className="eyebrow">{admin ? 'ADMIN ACCESS GRANTED' : 'ADMIN ONLY'}</span><h2>Cheats</h2></div>
      <button className="icon-button" aria-label="Close cheats" onClick={onClose}><Icon name="close" /></button>
    </div>
    {admin ? <div className="cheats-body">
      <p>Test the shop and hero abilities without another grind. Changes affect your local save. Export a backup first if you want to keep a clean profile.</p>
      <div className="cheat-wallet"><span><Icon name="coin" size={17} />{progress.gold.toLocaleString()} GOLD</span><span><Icon name="gem" size={17} />{progress.shards.toLocaleString()} SHARDS</span></div>
      <form onSubmit={submit}>
        <label htmlFor="cheat-kind">WHAT TO ADD</label>
        <select ref={kindRef} id="cheat-kind" value={kind} onChange={event => { setKind(event.target.value as typeof kind); setMessage(''); }}>
          <option value="shards">Soul Shards</option><option value="gold">Gold</option><option value="xp">Hero XP (testing only)</option>
        </select>
        {kind === 'xp' && <><label htmlFor="cheat-hero">OWNED HERO</label><select id="cheat-hero" value={hero} onChange={event => setHero(event.target.value as CharacterId)}>{characters.filter(c => ownsHero(progress, c, admin)).map(c => <option key={c.id} value={c.id}>{c.name} / LV. {progress.heroes[c.id].level}</option>)}</select></>}
        <label htmlFor="cheat-amount">CUSTOM AMOUNT</label>
        <input id="cheat-amount" type="number" min="1" max="1000000" step="1" required value={amount} onChange={event => setAmount(event.target.value)} />
        <button className="gold-button" type="submit"><Icon name={kind === 'gold' ? 'coin' : kind === 'shards' ? 'gem' : 'bolt'} size={17} />ADD {Number(amount || 0).toLocaleString()} {kind === 'xp' ? 'XP' : kind.toUpperCase()}</button>
      </form>
      {message && <p className="cheat-message" role="status">{message}</p>}
      <small>Level 15 and attribute budgets still apply. Cheats are unavailable during a quest and do not unlock biomes. Admin access ends when you reload the game.</small>
    </div> : <div className="cheats-body cheat-auth">
      <div className="cheat-lock-emblem"><Icon name="lock" size={32} /></div>
      <p>These testing tools are restricted to admins. Enter the admin password to access gold, Soul Shards, and hero XP cheats.</p>
      <form onSubmit={authenticate}>
        <label htmlFor="cheat-admin-password">ADMIN PASSWORD</label>
        <input ref={passwordRef} id="cheat-admin-password" type="password" autoComplete="current-password" autoCapitalize="none" spellCheck={false} required value={password} onChange={event => { setPassword(event.target.value); setAuthError(''); }} aria-invalid={!!authError} aria-describedby={authError ? 'cheat-auth-error' : 'cheat-auth-note'} />
        {authError && <p className="form-error" id="cheat-auth-error" role="alert">{authError}</p>}
        <button className="gold-button" type="submit"><Icon name="lock" size={17} />UNLOCK ADMIN CHEATS<Icon name="arrow" size={16} /></button>
      </form>
      <small id="cheat-auth-note">Access lasts for this game session only and is not included in saves or exports. This is a local game lock, not server-side authentication.</small>
    </div>}
  </Modal>;
}