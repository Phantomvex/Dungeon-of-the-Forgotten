# Dungeon of the Forgotten

A playable pixel-art action roguelike with solo play and two-player WebRTC co-op, built with React, TypeScript, Vite, and a custom Canvas 2D engine.

## Play

Choose **Enter the Dungeon** to open **Choose Your Fate**. Pick a hero, inspect their mastery, choose one of seven biomes, and descend. The original three heroes remain free. There are sixteen purchasable heroes and the password-gated Phantom, for twenty heroes total. Each has six abilities and a maximum hero level of 15.

Only the **Forsaken Halls** are initially open. Defeat each biome's guardian to unlock the next chapter: **Forsaken Halls -> Ember Foundry -> Mycelium Hollows -> Drowned Abbey -> Glassfrost Keep -> Sunken Dynasty -> Astral Rift**. Unlocks are saved immediately and survive death. The picker, solo launch, and party launch all enforce this sequence. Previous saves with recorded guardian victories retain credit for those wins.

Most floors have no boss. On floors **3, 6, 9, ...**, the far end of the dungeon has a clearly marked guardian portal. **No keys and no cages.** Enter the portal to reach a separate open arena, hear that biome's guardian speak, and choose when to begin combat. The three-skull indicator tracks your approach. After victory, collect your rewards and use the onward portal to continue.

| Action | Default control |
| --- | --- |
| Move | WASD or arrow keys |
| Attack | J or left mouse button |
| Ability 2, unlocks at level 3 | Q or right mouse button |
| Dodge | Space |
| Sprint (hold) | Left Shift |
| Ability 3, unlocks at level 5 | R |
| Ability 4, unlocks at level 8 | F |
| Ability 5, unlocks at level 11 | C |
| Ultimate, unlocks at level 15 | X |
| Equipped boss seal | V |
| Run inventory, seals, and attributes | B |
| Open, kick, or descend | E |
| Toggle minimap | M |
| Pause | Escape |

Touch movement and ability controls are enabled automatically on phones, tablets, and coarse-pointer devices, including landscape orientation. Keyboard controls can be rebound in Settings. The dungeon canvas adapts its resolution and field of view to fill the available viewport without stretching the sprites.

## Play Together

Choose **Play Together** in the main menu. One player creates a room, shares its six-character code, and waits for the other player to join. Choose owned heroes and a biome unlocked in both saves, ready up, and let the host start the quest.

The host runs one authoritative shared dungeon; the other device sends controls and receives world snapshots over a reliable WebRTC channel. You see each other, attack the same enemies, receive shared XP/currency/campaign credit, and can revive a downed partner with Interact. Either player can pause; both must finish or skip boss dialogue. The host advances floors. If both heroes fall, the run ends.

Default room creation uses PeerJS's public signaling service and needs internet, even when both devices are on the same Wi-Fi. Browsers cannot automatically scan Wi-Fi or verify that devices share a router. A self-hosted LAN signaling option and a game/signaling server are included for offline-capable setups. See **`LAN.md`** for connection limits and setup.

This is private two-player, peer-hosted co-op, not a competitive anti-cheat service. Host migration, automatic reconnect, and joining an already-running quest are not implemented. Two-device connectivity and latency remain unverified in the current tooling environment.

## Characters

- **Iron Knight:** 15% physical damage resistance, a wide broadsword attack, and a barricade-breaking shield charge that stuns enemies.
- **Shadow Blade:** 20% faster movement, silent footsteps, fast twin strikes with critical hits, and a smoke-trail teleport that empowers the next attack.
- **Flame Weaver:** piercing firebolts with burning damage, cooldown-restoring mana embers, and a projectile-clearing flame nova.

The original ten recruitable heroes each have their own stats, passive, six-ability kit, resource type, and pixel sprite: Sun Paladin, Frost Witch, Wild Ranger, Blood Berserker, Storm Caller, Plague Doctor, Blood Reaper, Stone Warden, Jade Monk, and Astral Oracle. Prices range from 450 to 2,700 Soul Shards. Previously purchased heroes remain owned after migration.

### New Recruits

| Hero | Base HP | Base Damage | Shard Price | Specialty |
| --- | --- | --- | --- | --- |
| Tidecaller | 150 | 43 | 3,800 | Piercing tidal magic, whirlpools, water/ice mobility |
| Dune Blade | 130 | 46 | 4,500 | Critical scimitar combos, mirages, cheap dodges |
| Glacier Sentinel | 240 | 60 | 7,200 | Heavy glacial armor, freezing hammer attacks |
| Fallen Seraph | 520 | 144 | 18,000 | Celestial twin bolts, healing smites; twice Killison's base HP and damage |
| Malachar, World Eater | 780 | 216 | 30,000 | Blood rituals and 18% lifesteal; three times Killison's base HP and damage |

All five have complete six-ability kits, unique portrait/sprite artwork, and the same level-15 progression rules. Relative-power comparisons refer to base HP and damage at matching levels without attributes or boosts, not an exact multiplier to every combat outcome.

### Killison

Killison is the mythic ritual demon, priced at **10,000 Soul Shards**. He begins with 260 base HP, 35% physical resistance, a powerful glaive combo, and 15% lifesteal. His abilities sacrifice a percentage of maximum HP instead of spending Mana. Rituals are refused if the offering would leave him at or below 1 HP.

His six abilities are Hellglaive, Sacrificial Ascendance, Blood Covenant, Hellfire Litany, Altar of Ruin, and Demon Apotheosis. The level-15 ultimate sacrifices 22% maximum HP for an infernal eruption, triple damage, and eight seconds of invulnerability.

### The Phantom

Select the Phantom's card and enter `admin1`, lowercase. This grants access for the current app session. The Phantom now has **3,000 base HP**, down from 9,999. His six powers, damage, infinite movement stamina, resistance, and regeneration are unchanged. Like every hero, he levels to 15; level and attribute bonuses can raise maximum health above the base value.

- **Void Reap, level 1:** three piercing shadow blades, 350 base damage per blade.
- **Shadow Rift (Q), level 3:** area damage, a stun, and projectile annihilation.
- **Eclipse Dominion (R), level 5:** invulnerability, triple damage, time-frozen enemies, and orbiting blades.
- **Abyss Walk (F), level 8:** a repositioning blink and an empowered next strike.
- **Soul Collapse (C), level 11:** a powerful, lingering gravity field.
- **Oblivion (X), level 15:** erases all currently spawned enemies and restores full health.

The password gate is intentionally local to this single-player browser game. It is not secure server-side administration or authentication.

## Dungeons and Treasure

- **The Forsaken Halls:** branching burial rooms, pillars, spikes, wall darts, and falling stone. Guardian: The Ashen Sovereign.
- **The Ember Foundry:** broad industrial corridors, furnace channels, fire jets, and crushing presses. Guardian: The Iron Tyrant.
- **The Mycelium Hollows:** rounded grottoes, meandering passages, poisonous edges, spore pods, and roots. Guardian: The Hollow Bloom.
- **The Drowned Abbey:** flooded galleries divided by dry routes, shark breaches, and whirlpools. Guardian: The Drowned Regent.
- **The Glassfrost Keep:** jagged glacial rooms, winding passages, slow ice, and falling icicles. Guardian: The Frostbound Queen.
- **The Sunken Dynasty:** large pillared tombs, narrow burial passages, quicksand, and dart slits. Guardian: The Sun-Eaten Pharaoh.
- **The Astral Rift:** circular observatories joined by narrow star-bridges, void edges, and gravity ruptures. Guardian: The Starless Oracle.

Floors use variable-sized partitioned layouts rather than a repeated 3-by-3 grid. Rooms are linked by a spanning network with optional loops; the exit is in the most distant room along the route. Each biome changes room shapes, passage widths, obstacles, hazard placement, and room names. Ignite braziers, break urns, and find healing shrines along the way.

Two roaming mini-boss rooms are selected on every floor, with a chance of a third. They use biome-specific names, enlarged crowned sprites, tougher health, stronger attacks, radial bursts, and a visible mini-boss health bar. They award modest gold, shards, and XP; they do not drop boss seals.

Chests use Common (50%), Uncommon (29%), Rare (15%), Epic (5%), and Legendary (1%) tiers. They roll between currency, healing/energy supplies, hero XP/rare attribute finds, and temporary buffs/charms. Currency is not guaranteed. Gold amounts and chest-rarity odds are unchanged. **Chest shard amounts receive only a 10% increase**, rounded to whole shards; for example, a 240-500 legendary shard roll becomes 264-550. Hero and boost prices are unchanged. There is no guaranteed Rare chest on an ordinary floor.

### Guardian Seals

Each defeated guardian automatically awards depth-scaled gold and shards, a substantial XP reward, and a temporary charm. A rare attribute point has a separate 15% chance and respects the hero's lifetime bonus-point cap. A seal is a **separate 6% roll**, gradually rising to at most 12% on deeper floors. It is never guaranteed.

Collect a dropped seal with Interact, open the Run Inventory, and equip it. Press V to spend ability energy (movement stamina for blood-ritual heroes) and cast its power. The seven seals grant Crown of Ash, Worldforge, Deathblossom, Leviathan's Wake, Glacial Cataclysm, Dynasty's End, or Event Horizon. Only one seal can be equipped at once; swapping does not reset the shared cooldown.

Seals, found charms, and dungeon-found boosts exist only in the current engine instance. They are not written to the persistent save and are removed on death, retreat, refresh, and every new run.

## Progression

Gold and Soul Shards are banked immediately on collection, including on runs that end in death. **Gold buys boosts and supplies. Soul Shards recruit heroes. Leveling is XP-only.** The optional exchange remains **10 gold = 1 Soul Shard**. There are no real-money purchases and no paid-training transaction. Existing balances, ownership, hero levels, and purchased boosts are preserved.

Every hero starts at level 1 and is capped at **15**. Active slots unlock at **1, 3, 5, 8, 11, 15**. XP comes from bosses, mini-bosses, ordinary enemies, floor completion, and mastery caches, with ordinary enemies providing a smaller contribution than bosses or mini-bosses. There is no idle-time XP or currency payment for a level. The mastery screen explains the sources and the next ability unlock.

Attributes now have a bounded specialization budget: **one point at each even hero level**, plus at most **four lifetime rare bonus points** per hero. Higher ranks cost `1 + floor(currentRank / 3)` points and require a hero level high enough for `ceil(level / 2)` rank access. Spend points on Vitality (+6 HP), Endurance (+5 stamina/energy), or Power (+2% damage). Both menus and gameplay validate costs and rank access.

Migration preserves previously allocated attribute ranks but trims excessive unspent points to the new budget. It does not erase owned heroes, currency, or levels. Legacy heavily upgraded heroes keep their allocated ranks but cannot spend above their available new budget.

Mana, Focus, Fury, Soul Energy, and Stamina are separate resource models. Killison and Malachar use blood offerings. Movement stamina is tracked independently for sprinting and dodging. Primary attacks remain free so an exhausted hero can still fight.

Purchased boosts are kept in persistent inventory and activated from the Boosts tab. Each activation adds five minutes of gameplay time. Menus, boss dialogue, and pausing do not consume it. Dungeon-found boosts still last only for the current run.

| Boost | Gold | Effect |
| --- | --- | --- |
| Vigor Tonic | 90 | Larger stamina pool and faster regeneration |
| Endless Breath | 220 | No stamina costs; Mana and blood costs still apply |
| Bloodroot Elixir | 140 | Regenerate 2 HP per second |
| Prospector's Luck | 180 | Double collected gold, not shards or drop rates |
| Windrunner Oil | 120 | 20% faster movement, 25% shorter dodge cooldown |
| Ironhide Draught | 175 | 20% less incoming damage; no discount on rituals |
| Moonwell Essence | 150 | Double ability-energy regeneration |
| Battle Fervor | 240 | Faster primary attacks and 20% more damage |
| Sage's Ink | 200 | 35% bonus hero XP |
| Wayfinder Lantern | 75 | Wider torchlight and coin collection radius |

Completed and voluntarily ended runs are recorded in the Armory. The original three artifact unlocks remain intact. Settings, permanent artifacts, wallets, hero ownership, per-hero mastery, purchased boosts, and purchased boost time are saved locally. Refreshing does not preserve the active dungeon, seals, or temporary charms, but already earned mastery and banked currency are retained. Old run history is converted into starting hero XP once during migration.

## Saves and Updates

Use **Save** in the header for a one-click manual snapshot. The adjacent archive icon opens **Save & Backups**. Both are also available from the pause menu.

1. Before updating, choose **Export Backup** and keep the downloaded JSON file.
2. After updating, choose **Import Backup**, select the file, and inspect the wallet/hero preview.
3. Choose **Restore This Backup** to replace the current profile. Restoring never adds balances together.

The backup includes essential progression, campaign clears, purchased boosts, permanent artifacts, history, and optional settings. It does not include the active floor, temporary seals/charms, a party connection, or admin access. Import validates the format, numeric fields, supported version, and integrity checksum before changing anything. Older saves are migrated with defaults for new fields. A pre-import recovery snapshot is stored before replacement.

Imports are disabled during an active run, but saving and exporting are available while paused. Local storage is tied to the browser and site origin; it cannot automatically follow a changed preview URL. The downloaded file is the portable backup for that situation. Saves do not use a cloud account or server. The checksum detects file damage, not deliberate tampering.

## Implementation

- `src/App.tsx`: application screens, shared settings, audio, and saved progression.
- `src/game/engine.ts`: procedural connected floors, combat, hazards, enemies, bosses, lighting, and input.
- `src/game/sprites.ts`: native pixel-art gameplay sprites.
- `src/game/hero-art.ts`: redesigned non-Phantom heroes and costume details.
- `src/game/weather.ts`: biome weather rendering.
- `src/game/audio.ts`: synthesized music, flame ambience, and sound effects using Web Audio.
- `src/game/content.ts`: dungeon palettes, mob definitions, chest rarities, and boosts.
- `src/economy.ts`: validated purchases, inventory activation, and currency exchange.
- `src/progression.ts`: level caps, XP, attribute ranks, stat scaling, and resource profiles.
- `src/game/abilities.ts`: six-ability kits and level/resource requirements for all twenty heroes.
- `src/game/rewards.ts`: chest rewards, guardian cadence, rare seal drops, and temporary charms.
- `src/game/traps.ts`: biome-specific trap simulation and pixel rendering.
- `src/game/layout.ts`: variable floor geometry, connected routes, and open guardian arenas.
- `src/game/bosses.ts`: distinct boss sprites and roaming mini-boss profiles.
- `src/saves.ts`: portable save envelopes, checksum validation, migration, snapshots, and downloads.
- `src/campaign.ts`: sequential biome requirements and clear tracking.
- `src/network/party.ts`: real room-code signaling, WebRTC connections, readiness, and game packets.
- `server/lan.mjs`: optional LAN game server and local signaling broker.
- `src/assets.ts`: explicitly bundled artwork and shared image decoding.
- `src/data.ts`: hero definitions, safe save migration, and persistent settings.
- `src/expansion.css`: shop, expanded roster, Phantom presentation, and larger stamina-aware HUD.
- `src/mastery.css`: mastery, training, run inventory, three-skull indicator, and six-slot combat controls.
- `src/portals.css`: compact combat dock, boss dialogue, and backup manager.
- `src/together.css`: readable larger menus, party/cheat interfaces, and adaptive full-width viewport.
- `src/components/`: character selection, Armory, Settings, game HUD, and accessible dialogs.
- `public/images/`: custom dungeon and character artwork.

All fonts and artwork are served with the application. Audio starts after interaction, as required by browser autoplay policies. System reduced-motion preferences disable decorative animation and gameplay screen shake.

