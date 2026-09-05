import gate from '../public/images/forgotten-assembly.svg?inline';
import knight from '../public/images/iron-knight.png?inline';
import rogue from '../public/images/shadow-blade.png?inline';
import mage from '../public/images/flame-weaver.png?inline';
import phantom from '../public/images/phantom.png?inline';
import killison from '../public/images/killison.png?inline';
import atlas from '../public/images/hero-atlas.png?inline';
import recruits from '../public/images/awakened-heroes.svg?inline';
import foundry from '../public/images/ember-foundry.png?inline';
import hollows from '../public/images/mycelium-hollows.png?inline';
import drowned from '../public/images/drowned-abbey.png?inline';
import frostkeep from '../public/images/frost-biome.svg?inline';
import dynasty from '../public/images/dunes-biome.svg?inline';
import astral from '../public/images/astral-biome.svg?inline';

// Explicit inline imports keep artwork inside the build, including single-file previews.
const media: Record<string, string> = {
  'dungeon-gate.png': gate, 'iron-knight.png': knight, 'shadow-blade.png': rogue,
  'flame-weaver.png': mage, 'phantom.png': phantom, 'killison.png': killison,
  'hero-atlas.png': atlas, 'awakened-heroes.svg': recruits, 'ember-foundry.png': foundry,
  'mycelium-hollows.png': hollows, 'drowned-abbey.png': drowned, 'frost-biome.svg': frostkeep,
  'dunes-biome.svg': dynasty, 'astral-biome.svg': astral,
};
export const artwork = (path: string) => {
  const url = media[path.split('/').pop() || ''] || path;
  return url.startsWith('data:image/png;base64,/9j/') ? url.replace('data:image/png', 'data:image/jpeg') : url;
};
const images = new Map<string, Promise<HTMLImageElement>>();
export function loadArtwork(path: string) {
  const url = artwork(path);
  if (!images.has(url)) images.set(url, new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Artwork could not be decoded.')); image.src = url;
  }));
  return images.get(url)!;
}