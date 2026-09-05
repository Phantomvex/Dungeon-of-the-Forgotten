import { useRef, useState, type ChangeEvent } from 'react';
import { characters, type Progress, type Settings } from '../data';
import { downloadSave, parseSave, type ParsedSave } from '../saves';
import Icon from './Icon';
import Modal from './Modal';

export interface SaveResult { ok: boolean; message: string; }
export default function SaveManager({ progress, settings, inRun, persistent, savedAt, onSave, onImport, onClose }: {
  progress: Progress; settings: Settings; inRun: boolean; persistent: boolean; savedAt: string | null;
  onSave: () => SaveResult; onImport: (save: ParsedSave) => SaveResult; onClose: () => void;
}) {
  const [pending, setPending] = useState<ParsedSave | null>(null);
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [reading, setReading] = useState(false);
  const [restoreSettings, setRestoreSettings] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  const report = (result: SaveResult) => { setMessage(result.message); setError(!result.ok); };
  const read = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || inRun) return;
    setReading(true); setMessage(''); setPending(null);
    try {
      if (file.size > 4_000_000) throw new Error('Choose a save file smaller than 4 MB.');
      const parsed = parseSave(await file.text()); setPending(parsed); setFileName(file.name); setError(false);
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : 'The file could not be read. Your save is unchanged.'); }
    finally { setReading(false); }
  };
  const restoreLocal = (key: string, name: string) => {
    if (inRun) return;
    try { const raw = localStorage.getItem(key); if (!raw) throw new Error('No backup has been saved in this slot yet.'); setPending(parseSave(raw)); setFileName(name); setMessage(''); setError(false); }
    catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : 'This backup is unavailable.'); }
  };
  const exportNow = () => { try { downloadSave(progress, settings); report({ ok: true, message: 'Backup download requested. Keep the JSON file somewhere safe before updating the game.' }); } catch { report({ ok: false, message: 'The browser blocked the download. Please allow downloads and try again.' }); } };
  return <Modal label="Save and backups" className="save-manager-modal" onClose={onClose}>
    <div className="modal-heading"><div><span className="eyebrow">YOUR JOURNEY SHOULD SURVIVE THE UPDATE</span><h2>Save & Backups</h2></div><button className="icon-button" onClick={onClose} aria-label="Close save manager"><Icon name="close" /></button></div>
    <div className="save-manager-body">
      <div className="save-status-line"><span className={persistent ? 'save-online-dot' : 'save-warning-dot'} /><strong>{persistent ? 'Local autosave is active' : 'Browser storage is unavailable'}</strong><span>{savedAt ? `Last manual save: ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Make a manual snapshot any time.'}</span></div>
      <div className="save-essentials"><div><Icon name="shield" size={18} /><strong>{progress.unlockedHeroes.length}</strong><span>HEROES OWNED</span></div><div><Icon name="coin" size={18} /><strong>{progress.gold.toLocaleString()}</strong><span>GOLD</span></div><div><Icon name="gem" size={18} /><strong>{progress.shards.toLocaleString()}</strong><span>SOUL SHARDS</span></div><div><Icon name="crown" size={18} /><strong>{Math.max(...Object.values(progress.heroes).map(hero => hero.level))}</strong><span>HIGHEST LEVEL</span></div></div>
      <p className="save-explanation">Ownership, wallets, hero levels, campaign unlocks, attributes, purchased boosts, settings, and run history are included. <strong>Seals, room codes, and the current dungeon are not.</strong></p>
      <div className="save-actions"><button onClick={() => report(onSave())}><Icon name="save" size={25} /><span><strong>Save Now</strong><small>One-click local snapshot</small></span><Icon name="arrow" size={16} /></button><button onClick={exportNow}><Icon name="download" size={25} /><span><strong>Export Backup</strong><small>Download a portable JSON file</small></span><Icon name="arrow" size={16} /></button><button disabled={inRun || reading} onClick={() => input.current?.click()}><Icon name="upload" size={25} /><span><strong>{reading ? 'Reading Backup...' : 'Import Backup'}</strong><small>Review first. Restore when ready.</small></span><Icon name="arrow" size={16} /></button></div>
      <input ref={input} type="file" accept=".json,application/json" onChange={event => void read(event)} hidden aria-label="Choose a game backup JSON file" />
      {inRun && <p className="save-run-note"><Icon name="pause" size={14} />You can save and export during a run. Finish the run before importing to avoid conflicting progress.</p>}
      <div className="backup-local-actions"><span>RECOVER A LOCAL SNAPSHOT</span><button className="text-button" disabled={inRun} onClick={() => restoreLocal('forgotten-manual-save', 'Last manual snapshot')}><Icon name="clock" size={13} />LAST MANUAL SAVE</button><button className="text-button" disabled={inRun} onClick={() => restoreLocal('forgotten-pre-import', 'Before the last import')}><Icon name="back" size={13} />BEFORE LAST IMPORT</button></div>
      {pending && <section className="import-preview" aria-label="Review backup before restoring"><span className="eyebrow">BACKUP VALIDATED / NOT RESTORED YET</span><h3>{fileName}</h3><p>{pending.savedAt ? `Exported ${new Date(pending.savedAt).toLocaleString()}` : 'Legacy save detected. It will be migrated to the current version.'}</p><div><span>{pending.progress.unlockedHeroes.length} heroes</span><span>{pending.progress.gold.toLocaleString()} gold</span><span>{pending.progress.shards.toLocaleString()} shards</span><span>{pending.progress.runs.length} runs</span></div><p className="import-roster">{pending.progress.unlockedHeroes.map(id => characters.find(hero => hero.id === id)?.short || id).join(' / ')}</p><p className="restore-warning">Restoring replaces your current balances and progression; it does not add currency. A recovery snapshot of your current progress is kept before replacement.</p>{pending.settings && <label className="restore-settings"><input type="checkbox" checked={restoreSettings} onChange={event => setRestoreSettings(event.target.checked)} />Also restore audio, video, and keybinding settings</label>}<div className="import-confirm-actions"><button className="text-button" onClick={() => setPending(null)}>CANCEL</button><button className="gold-button small" disabled={inRun} onClick={() => { const result = onImport({ ...pending, settings: restoreSettings ? pending.settings : null }); report(result); if (result.ok) setPending(null); }}><Icon name="upload" size={16} />RESTORE THIS BACKUP</button></div></section>}
      {message && <p className={error ? 'save-feedback error' : 'save-feedback'} role={error ? 'alert' : 'status'}><Icon name={error ? 'shield' : 'check'} size={15} />{message}</p>}
      <p className="portable-save-note"><Icon name="archive" size={17} /><span><strong>Before an update: Export. After an update: Import.</strong>Local storage is tied to this browser and site address. A downloaded backup also works if an update changes the preview URL or clears its storage. There is no cloud account.</span></p>
    </div>
    <div className="settings-footer"><span className="micro-label">VERSIONED SAVES / LEGACY MIGRATION / INTEGRITY CHECK</span><button className="gold-button small" onClick={onClose}>RETURN TO THE GAME<Icon name="arrow" size={15} /></button></div>
  </Modal>;
}