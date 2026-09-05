import { characters, ownsHero, type CharacterId, type Progress } from './data';
import { boosts, type BoostId } from './game/content';
import { attributeCost, attributeRankCap, attributeNames, type Attribute } from './progression';

export type ShopAction = { type: 'hero'; id: CharacterId } | { type: 'boost'; id: BoostId } | { type: 'activate'; id: BoostId } | { type: 'exchange'; gold: number } | { type: 'attribute'; id: CharacterId; attribute: Attribute };
export interface ShopResult { ok: boolean; message: string; }

export function transact(progress: Progress, action: ShopAction, admin = false): ShopResult & { progress: Progress } {
  const reject = (message: string) => ({ ok: false, message, progress });
  if (action.type === 'attribute') {
    const hero = characters.find(c => c.id === action.id);
    if (!hero || !ownsHero(progress, hero, admin)) return reject('Recruit this hero before upgrading them.');
    const mastery = progress.heroes[hero.id];
    if (!Object.prototype.hasOwnProperty.call(attributeNames, action.attribute)) return reject('Unknown attribute.');
    const cost = attributeCost(mastery.attributes[action.attribute]);
    if (mastery.points < cost) return reject(`This rank costs ${cost} points. Earn points at even hero levels or from rare mastery finds.`);
    if (mastery.attributes[action.attribute] >= attributeRankCap(mastery.level)) return reject('Reach a higher hero level before increasing this attribute.');
    return { ok: true, message: `${hero.short}: ${attributeNames[action.attribute]} upgraded.`, progress: { ...progress, heroes: { ...progress.heroes, [hero.id]: { ...mastery, points: mastery.points - cost, attributes: { ...mastery.attributes, [action.attribute]: mastery.attributes[action.attribute] + 1 } } } } };
  }
  if (action.type === 'exchange') {
    if (!Number.isInteger(action.gold) || action.gold < 10 || action.gold % 10 !== 0) return reject('Exchange gold in multiples of 10.');
    if (progress.gold < action.gold) return reject('Not enough gold. Open chests, break urns, and defeat enemies.');
    return { ok: true, message: `${action.gold} gold exchanged for ${action.gold / 10} soul shards.`, progress: { ...progress, gold: progress.gold - action.gold, shards: progress.shards + action.gold / 10 } };
  }
  if (action.type === 'hero') {
    const hero = characters.find(c => c.id === action.id);
    if (!hero || hero.price <= 0) return reject('This hero cannot be purchased.');
    if (ownsHero(progress, hero)) return reject('This hero is already yours.');
    if (progress.shards < hero.price) return reject(`You need ${hero.price - progress.shards} more soul shards.`);
    return { ok: true, message: `${hero.name} has joined your roster.`, progress: { ...progress, shards: progress.shards - hero.price, unlockedHeroes: [...progress.unlockedHeroes, hero.id] } };
  }
  const boost = boosts.find(b => b.id === action.id);
  if (!boost) return reject('Unknown boost.');
  if (action.type === 'boost') {
    if (progress.gold < boost.price) return reject(`You need ${boost.price - progress.gold} more gold for ${boost.name}.`);
    if (progress.inventory[boost.id] >= 999) return reject('Your inventory is full for this boost.');
    return { ok: true, message: `${boost.name} added to your inventory. Activate it when you are ready.`, progress: { ...progress, gold: progress.gold - boost.price, inventory: { ...progress.inventory, [boost.id]: progress.inventory[boost.id] + 1 } } };
  }
  if (progress.inventory[boost.id] < 1) return reject('Purchase or find this boost first.');
  if (progress.activeBoosts[boost.id] + boost.duration > 18000) return reject('This boost is already fully stocked for your upcoming runs.');
  return { ok: true, message: `${boost.name} ready. Its timer only runs during active gameplay.`, progress: { ...progress, inventory: { ...progress.inventory, [boost.id]: progress.inventory[boost.id] - 1 }, activeBoosts: { ...progress.activeBoosts, [boost.id]: progress.activeBoosts[boost.id] + boost.duration } } };
}