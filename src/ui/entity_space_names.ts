/**
 * src/ui/entity_space_names.ts — NodeB59 Space Edition display-name overlay.
 *
 * Client-side, English-only rename layer consulted by tEntity() before the
 * normal i18n lookup. Keys are entityTranslationKey() strings, so the wire
 * protocol, quest logic, and every non-English locale are untouched: this is
 * purely what an English-language Xenon client paints on nameplates, banners
 * and titles. Proper-noun bosses keep their names (they already sound alien);
 * the everyday medieval fauna/folk get colony-appropriate jobs.
 */

const SPACE_NAMES: Record<string, string> = {
  // ── fauna & hostiles ───────────────────────────────────────────────────────
  'entities.mobs.forest_wolf.name': 'Void Stalker',
  'entities.mobs.wild_boar.name': 'Rust Tusker',
  'entities.mobs.old_greyjaw.name': 'Old Greyjaw, Alpha Stalker',
  'entities.mobs.vale_bandit.name': 'Sector Scavver',
  'entities.mobs.restless_bones.name': 'Derelict Husk',
  'entities.mobs.mire_prowler.name': 'Mire Prowler',
  'entities.mobs.fen_troll.name': 'Mirefen Brute',
  'entities.mobs.thornpeak_ogre.name': 'Thornpeak Hulk',
  'entities.mobs.drowned_dead.name': 'Drowned Crew',
  'entities.mobs.drowned_thrall.name': 'Drowned Crewman',
  'entities.mobs.crypt_shambler.name': 'Cryo-Vault Shambler',
  'entities.mobs.tunnel_rat.name': 'Deeprock Burrower',

  // ── zones ─────────────────────────────────────────────────────────────────
  'entities.zones.eastbrook_vale.name': 'Eastbrook Colony',
  'entities.zones.eastbrook_vale.welcome':
    'Find Marshal Redbrook at the colony hub - he has work for you.',
  'entities.zones.mirefen_marsh.name': 'Mirefen Sump',
  'entities.zones.thornpeak_heights.name': 'Thornpeak Ridge',

  // ── colony staff titles (names stay; jobs go orbital) ────────────────────
  'entities.npcs.the_merchant.title': 'Keeper of the Galactic Exchange',
  'entities.npcs.marshal_redbrook.title': 'Colony Marshal',
  'entities.npcs.trader_wilkes.title': 'Supply Officer',
  'entities.npcs.apothecary_lin.title': 'Xenobotanist',
  'entities.npcs.brother_aldric.title': 'Chaplain of the Colony',
  'entities.npcs.brother_aldric_fen.title': 'Chaplain of the Colony',
  'entities.npcs.brother_aldric_highwatch.title': 'Chaplain of the Colony',
  'entities.npcs.brother_aldric_raid.title': 'Chaplain of the Colony',
  'entities.npcs.smith_haldren.title': 'Fabricator & Gunsmith',
  'entities.npcs.fisherman_brandt.title': 'Coolant-Pool Angler',
  'entities.npcs.foreman_odell.title': 'Extraction Foreman',
  'entities.npcs.warden_fenwick.title': 'Warden of Fenbridge Outpost',
  'entities.npcs.provisioner_hale.title': 'Ration Officer',
  'entities.npcs.herbalist_yara.title': 'Xenobotanist',
  'entities.npcs.scout_maren.title': "Marshal's Pathfinder",
  'entities.npcs.scout_maren_highwatch.title': "Marshal's Pathfinder",
  'entities.npcs.captain_thessaly.title': 'Highwatch Station Captain',
  'entities.npcs.quartermaster_bree.title': 'Station Quartermaster',
  'entities.npcs.armorer_hode.title': 'Master Fabricator',
  'entities.npcs.loremaster_caddis.title': 'Archive Custodian',
  'entities.npcs.auctioneer_voss.title': 'Keeper of the Galactic Exchange',
  'entities.npcs.spirit_healer.title': 'Warden of Lost Signals',
};

/**
 * The Xenon display name for an entity key, or null to fall through to the
 * standard i18n chain. Only applies on English locales so real translations
 * keep working everywhere else.
 */
export function spaceEntityOverride(key: string, language: string): string | null {
  if (!language.startsWith('en')) return null;
  return SPACE_NAMES[key] ?? null;
}
