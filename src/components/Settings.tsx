import { useEffect, useState } from 'react';
import { defaultSettings, keyLabel, type Action, type Settings as SettingsType } from '../data';
import Icon from './Icon';
import Modal from './Modal';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button className={`toggle ${checked ? 'on' : ''}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><span /><i>{checked ? 'ON' : 'OFF'}</i></button>;
}

const bindingNames: Record<Action, string> = { up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right', attack: 'Primary attack / Lv. 1', special: 'Ability 2 / Lv. 3', dodge: 'Dodge / roll', sprint: 'Sprint (hold)', interact: 'Interact', map: 'Toggle minimap', extra1: 'Ability 3 / Lv. 5', extra2: 'Ability 4 / Lv. 8', extra3: 'Ability 5 / Lv. 11', extra4: 'Ultimate / Lv. 15', seal: 'Equipped boss seal', inventory: 'Run inventory' };

export default function Settings({ settings, onChange, onClose, persistent = true }: { settings: SettingsType; onChange: (settings: SettingsType) => void; onClose: () => void; persistent?: boolean }) {
  const [tab, setTab] = useState<'audio' | 'video' | 'controls'>('audio');
  const [listening, setListening] = useState<Action | null>(null);
  const [message, setMessage] = useState('');
  const change = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => onChange({ ...settings, [key]: value });

  useEffect(() => {
    if (!listening) return;
    const handleKey = (event: KeyboardEvent) => {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.code === 'Escape') { setListening(null); return; }
      if (['Tab', 'MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'F1', 'F3', 'F5', 'F6', 'F7', 'F10', 'F11', 'F12'].includes(event.code) || event.metaKey || event.ctrlKey || event.altKey) { setMessage('That key is reserved by the browser. Choose another.'); return; }
      const bindings = { ...settings.bindings };
      const conflict = (Object.keys(bindings) as Action[]).find(action => bindings[action] === event.code && action !== listening);
      if (conflict) bindings[conflict] = bindings[listening];
      bindings[listening] = event.code;
      onChange({ ...settings, bindings });
      setMessage(conflict ? `Bindings swapped with ${bindingNames[conflict].toLowerCase()}.` : `${bindingNames[listening]} updated.`);
      setListening(null);
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [listening, settings, onChange]);

  return <Modal label="Dungeon settings" onClose={onClose} className="settings-modal">
    <div className="modal-heading"><div><span className="eyebrow">MAKE THE DARKNESS YOUR OWN</span><h2>Settings</h2></div><button className="icon-button" aria-label="Close settings" onClick={onClose}><Icon name="close" /></button></div>
    <div className="panel-tabs" role="tablist" aria-label="Settings categories">
      {(['audio', 'video', 'controls'] as const).map(name => <button key={name} role="tab" aria-selected={tab === name} className={tab === name ? 'active' : ''} onClick={() => { setTab(name); setListening(null); setMessage(''); }}><Icon name={name === 'audio' ? 'sound' : name === 'video' ? 'fullscreen' : 'keyboard'} size={16} />{name.toUpperCase()}</button>)}
    </div>
    <div className="settings-body" role="tabpanel" aria-label={`${tab} settings`}>
      {tab === 'audio' && <>
        <div className="setting-row"><div><h3>Dungeon audio</h3><p>Let the forgotten halls come alive.</p></div><Toggle label="Enable all audio" checked={settings.sound} onChange={value => change('sound', value)} /></div>
        <div className={`setting-row ${!settings.sound ? 'setting-muted' : ''}`}><div><h3>Music volume</h3><p>Atmospheric dungeon synth.</p></div><div className="slider-control"><input aria-label="Music volume" type="range" min="0" max="100" value={settings.music} onChange={e => change('music', +e.target.value)} /><output>{settings.music}%</output></div></div>
        <div className={`setting-row ${!settings.sound ? 'setting-muted' : ''}`}><div><h3>Sound effects</h3><p>Every blade, footfall, and flickering flame.</p></div><div className="slider-control"><input aria-label="Sound effects volume" type="range" min="0" max="100" value={settings.sfx} onChange={e => change('sfx', +e.target.value)} /><output>{settings.sfx}%</output></div></div>
        <div className="setting-row"><div><h3>8-bit chiptune mode</h3><p>Trade the synth for an old-school soundtrack.</p></div><Toggle label="8-bit chiptune mode" checked={settings.chiptune} onChange={value => change('chiptune', value)} /></div>
        <p className="settings-note"><Icon name="sound" size={15} /> Audio begins after your first interaction. Headphones recommended.</p>
      </>}
      {tab === 'video' && <>
        <div className="setting-row"><div><h3>CRT scanlines</h3><p>A little nostalgia between the pixels.</p></div><Toggle label="CRT scanlines" checked={settings.scanlines} onChange={value => change('scanlines', value)} /></div>
        <div className="setting-row"><div><h3>CRT curvature</h3><p>Softly curved edges and a vintage vignette.</p></div><Toggle label="CRT curvature" checked={settings.crt} onChange={value => change('crt', value)} /></div>
        <div className="setting-row"><div><h3>Screen-shake intensity</h3><p>Feel the weight of every heavy attack.</p></div><div className="slider-control"><input aria-label="Screen-shake intensity" type="range" min="0" max="100" value={settings.shake} onChange={e => change('shake', +e.target.value)} /><output>{settings.shake}%</output></div></div>
        <div className="video-preview"><div className="preview-art" /><span>LIVE PREVIEW</span><p>The way it was meant to be remembered.</p></div>
      </>}
      {tab === 'controls' && <>
        <p className="controls-intro">Select a binding, then press a key. <kbd>ESC</kbd> cancels.</p>
        <div className="keybindings">{(Object.keys(bindingNames) as Action[]).map(action => <div className="binding-row" key={action}><span>{bindingNames[action]}</span><button className={`keybinding ${listening === action ? 'listening' : ''}`} onClick={() => { setListening(action); setMessage(''); }} aria-label={`Rebind ${bindingNames[action]}, currently ${keyLabel(settings.bindings[action])}`}>{listening === action ? 'PRESS A KEY' : keyLabel(settings.bindings[action])}</button></div>)}</div>
        <p className="settings-note" aria-live="polite"><Icon name="keyboard" size={15} />{message || 'Mouse: left-click to attack, right-click for your special. ESC pauses.'}</p>
      </>}
    </div>
    <div className="settings-footer"><button className="text-button" onClick={() => { onChange(structuredClone(defaultSettings)); setListening(null); setMessage('Default settings restored.'); }}>RESTORE DEFAULTS</button><span className="autosave-indicator"><span />{persistent ? 'AUTO-SAVED' : 'SESSION ONLY'}</span><button className="gold-button small" onClick={onClose}>SAVE & RETURN<Icon name="arrow" size={16} /></button></div>
  </Modal>;
}