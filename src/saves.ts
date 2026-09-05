import { characters, migrateProgress, normalizeSettings, type Progress, type Settings } from './data';

export const SAVE_FORMAT = 1;
export interface SaveBundle { game: 'dungeon-of-the-forgotten'; format: number; savedAt: string; progress: Progress; settings: Settings; checksum: string; }
export interface ParsedSave { progress: Progress; settings: Settings | null; savedAt: string | null; }
let backupTime = 0;

function checksum(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function makeSave(progress: Progress, settings: Settings): SaveBundle {
  const payload = { game: 'dungeon-of-the-forgotten' as const, format: SAVE_FORMAT, savedAt: new Date().toISOString(), progress: migrateProgress(progress), settings: normalizeSettings(settings) };
  return { ...payload, checksum: checksum(JSON.stringify(payload)) };
}

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }

export function parseSave(text: string): ParsedSave {
  if (text.length > 4_000_000) throw new Error('This backup is too large. Please choose a Dungeon of the Forgotten save under 4 MB.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('This file is not valid JSON. Your current save has not been changed.'); }
  if (!record(parsed)) throw new Error('This is not a recognized save file.');
  let progress: unknown = parsed;
  let settings: Settings | null = null, savedAt: string | null = null;
  if ('game' in parsed) {
    if (parsed.game !== 'dungeon-of-the-forgotten' || parsed.format !== SAVE_FORMAT) throw new Error('This backup belongs to another game or a newer backup format.');
    const payload = { game: parsed.game, format: parsed.format, savedAt: parsed.savedAt, progress: parsed.progress, settings: parsed.settings };
    if (typeof parsed.checksum !== 'string' || checksum(JSON.stringify(payload)) !== parsed.checksum) throw new Error('The backup integrity check failed. Re-export the original save; nothing has been overwritten.');
    progress = parsed.progress;
    if (record(parsed.settings)) settings = normalizeSettings(parsed.settings);
    savedAt = typeof parsed.savedAt === 'string' && Number.isFinite(Date.parse(parsed.savedAt)) ? parsed.savedAt : null;
  }
  if (!record(progress) || !Array.isArray(progress.runs)) throw new Error('The save is missing its run history and cannot be safely restored.');
  if (typeof progress.version === 'number' && progress.version > 5) throw new Error('This save was created by a newer game version. Update the game before importing it.');
  if (progress.version !== undefined && (!Number.isInteger(progress.version) || Number(progress.version) < 1)) throw new Error('The save version is invalid.');
  for (const name of ['gold', 'shards']) if (name in progress && (typeof progress[name] !== 'number' || !Number.isSafeInteger(progress[name]) || Number(progress[name]) < 0)) throw new Error(`The backup contains an invalid ${name} balance.`);
  if (Number(progress.version) >= 2 && (!Array.isArray(progress.unlockedHeroes) || !('gold' in progress) || !('shards' in progress))) throw new Error('The backup is missing essential wallet or hero-ownership data.');
  if (Array.isArray(progress.unlockedHeroes) && progress.unlockedHeroes.some(id => typeof id !== 'string')) throw new Error('The hero-ownership list is damaged.');
  if (Array.isArray(progress.unlockedHeroes) && progress.unlockedHeroes.some(id => !characters.some(hero => hero.id === id))) throw new Error('This backup includes heroes not available in this game version. Update the game before restoring so ownership is not lost.');
  if (Number(progress.version) >= 5 && (!Array.isArray(progress.clearedBiomes) || progress.clearedBiomes.some(id => typeof id !== 'string'))) throw new Error('The campaign unlock list is missing or damaged.');
  if (Number(progress.version) >= 3 && !record(progress.heroes)) throw new Error('Hero mastery is missing. This backup cannot be restored safely.');
  if (record(progress.heroes)) for (const state of Object.values(progress.heroes)) {
    if (!record(state) || !Number.isInteger(state.level) || Number(state.level) < 1 || Number(state.level) > 15 || !record(state.attributes)) throw new Error('The backup contains invalid hero mastery.');
    for (const amount of [state.xp, state.points, ...Object.values(state.attributes)]) if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw new Error('A hero XP or attribute value is invalid.');
    for (const attribute of ['vitality', 'endurance', 'power']) if (!Number.isInteger(state.attributes[attribute]) || Number(state.attributes[attribute]) > 15) throw new Error('A required hero attribute is missing or exceeds the level cap.');
  }
  for (const name of ['inventory', 'activeBoosts']) {
    if (progress[name] !== undefined && !record(progress[name])) throw new Error(`The ${name} section is invalid.`);
    if (record(progress[name])) for (const amount of Object.values(progress[name])) if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw new Error('A boost quantity or timer is invalid.');
  }
  const normalized = migrateProgress(progress);
  if (normalized.runs.length !== progress.runs.length) throw new Error('The run history contains invalid entries. Nothing has been overwritten.');
  return { progress: normalized, settings, savedAt };
}

export function persistProgress(progress: Progress) {
  const previous = localStorage.getItem('forgotten-progress');
  if (previous && Date.now() - backupTime > 30000) {
    try { const parsed = JSON.parse(previous); if (Array.isArray(parsed?.runs)) { localStorage.setItem('forgotten-progress-backup', previous); backupTime = Date.now(); } } catch { /* Do not overwrite a good backup with corrupted JSON. */ }
  }
  localStorage.setItem('forgotten-progress', JSON.stringify(progress));
}

export function saveManually(progress: Progress, settings: Settings) {
  const bundle = makeSave(progress, settings);
  localStorage.setItem('forgotten-manual-save', JSON.stringify(bundle));
  persistProgress(progress);
  localStorage.setItem('forgotten-settings', JSON.stringify(settings));
  return bundle.savedAt;
}

export function downloadSave(progress: Progress, settings: Settings, prefix = 'forgotten-save') {
  const bundle = makeSave(progress, settings);
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `${prefix}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}