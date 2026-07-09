import type { PlayerClass, SkinRank } from '../types';

// ---------------------------------------------------------------------------
// Cosmetic skin-select event — shared, host-agnostic data.
//
// Used by BOTH the authoritative Sim (rank roll + claim validation) and the
// client HUD (overlay gating). It lives in sim/ so it carries no DOM/render
// imports and runs unchanged on the server, offline, and headless.
//
// Event tiers grant named Planet Xenon cosmetics while preserving the renderer's
// existing per-class skin indices (0 = class default, not granted by the event).
// ---------------------------------------------------------------------------

/** The item that opens the skin-select overlay when used. Dev-grantable via
 *  `/dev give event_skin_token` (ALLOW_DEV_COMMANDS only). */
export const EVENT_SKIN_TOKEN_ID = 'event_skin_token';

/** Ranks ordered low → high. A rolled rank unlocks its tier and all below it. */
export const SKIN_RANKS: readonly SkinRank[] = ['uncommon', 'rare', 'epic'] as const;

export const SKIN_RANK_ROLL_WEIGHTS: Readonly<Record<SkinRank, number>> = {
  uncommon: 70,
  rare: 25,
  epic: 5,
} as const;

export function rollSkinRank(unitRoll: number): SkinRank {
  const total = SKIN_RANKS.reduce((sum, rank) => sum + SKIN_RANK_ROLL_WEIGHTS[rank], 0);
  let roll = Math.max(0, Math.min(0.999999999, unitRoll)) * total;
  for (const rank of SKIN_RANKS) {
    roll -= SKIN_RANK_ROLL_WEIGHTS[rank];
    if (roll < 0) return rank;
  }
  return 'uncommon';
}

/** One selectable space cosmetic per tier. */
export interface SkinTier {
  /** Stable event-cosmetic id for logs, rewards, and future localized labels. */
  id: string;
  rank: SkinRank;
  /** English fallback label used by server/dev tooling. */
  name: string;
  /** Index into the renderer's SKINS[player_<cls>] list. */
  skin: number;
}

export const EVENT_SKIN_TIERS: readonly SkinTier[] = [
  { id: 'xenon_field_suit', rank: 'uncommon', name: 'Xenon Field Suit', skin: 1 },
  { id: 'nebula_pressure_suit', rank: 'rare', name: 'Nebula Pressure Suit', skin: 2 },
  { id: 'janitor_prime_coveralls', rank: 'epic', name: 'Janitor Prime Coveralls', skin: 3 },
] as const;

export interface MechChroma {
  /** stable id, unique across all tiers; also the i18n name-key leaf */
  id: string;
  rank: SkinRank;
  /** English fallback label used by server/dev tooling. */
  name: string;
}

// Order defines the skin index into SKINS.player_mech / SKIN_EMISSIVE.player_mech
// (0-based: the 8 uncommon, then 3 rare, then 4 epic). Keep in lockstep with
// src/render/characters/manifest.ts.
export const MECH_CHROMAS: readonly MechChroma[] = [
  { id: 'amber_crimson', rank: 'uncommon', name: 'Amber EVA Shell' },
  { id: 'crimson_amber', rank: 'uncommon', name: 'Crimson EVA Shell' },
  { id: 'cyan_magenta', rank: 'uncommon', name: 'Relay Tech Shell' },
  { id: 'magenta_cyan', rank: 'uncommon', name: 'Nebula Tech Shell' },
  { id: 'orange_steel', rank: 'uncommon', name: 'Cargo Bay Shell' },
  { id: 'steel_orange', rank: 'uncommon', name: 'Landing Crew Shell' },
  { id: 'forest_pink', rank: 'uncommon', name: 'Hydroponic Signal Shell' },
  { id: 'pink_forest', rank: 'uncommon', name: 'Greenhouse Signal Shell' },
  { id: 'amethyst_silver', rank: 'rare', name: 'Xenon Surveyor Shell' },
  { id: 'ivory_copper', rank: 'rare', name: 'Colony Archivist Shell' },
  { id: 'onyx_gold', rank: 'rare', name: 'Deep Orbit Shell' },
  { id: 'imperial_crimson', rank: 'epic', name: 'Red Comet Shell' },
  { id: 'imperial_gold', rank: 'epic', name: 'Solar Crown Shell' },
  { id: 'vanguard_azure', rank: 'epic', name: 'Blue Horizon Shell' },
  { id: 'vanguard_chrome', rank: 'epic', name: 'Chrome Vanguard Shell' },
] as const;

export const ALDRIC_MECH_CHROMA_ID = 'amber_crimson';
export const ALDRIC_MECH_CHROMA_ITEM_ID = 'amber_crimson_armor_plate';

/** Ordinal of a rank (0 = lowest). Higher unlocks everything at or below it. */
export function skinRankOrder(rank: SkinRank): number {
  return SKIN_RANKS.indexOf(rank);
}

/** The tier a given skin index belongs to, or null if it maps to no event tier
 *  (e.g. the class default, skin 0). */
export function skinTierFor(skin: number): SkinTier | null {
  return EVENT_SKIN_TIERS.find((tt) => tt.skin === skin) ?? null;
}

/** Server-authoritative gate: may a player holding `granted` rank lock in `skin`?
 *  True only when the skin maps to a tier at or below the granted rank. */
export function rankAllowsSkin(granted: SkinRank, skin: number): boolean {
  const tier = skinTierFor(skin);
  if (!tier) return false;
  return skinRankOrder(tier.rank) <= skinRankOrder(granted);
}

export function mechChromaForSkin(skin: number): MechChroma | null {
  return Number.isInteger(skin) ? MECH_CHROMAS[skin] ?? null : null;
}

export function mechChromaSkinIndex(chromaId: string): number {
  return MECH_CHROMAS.findIndex((chroma) => chroma.id === chromaId);
}

export function mechChromaItemId(chromaId: string): string | null {
  return MECH_CHROMAS.some((chroma) => chroma.id === chromaId) ? `${chromaId}_armor_plate` : null;
}

export function rankAllowsMechChroma(granted: SkinRank, skin: number): boolean {
  const chroma = mechChromaForSkin(skin);
  return !!chroma && skinRankOrder(chroma.rank) <= skinRankOrder(granted);
}

// Per-class count of available skins INCLUDING the default (index 0), mirroring
// the renderer's SKINS map (src/render/characters/manifest.ts). Kept here so the
// host-agnostic sim can validate a chosen skin index without importing render/.
// tests/skin_event.test.ts asserts this stays in lockstep with SKINS.
export const SKIN_COUNTS: Record<PlayerClass, number> = {
  warrior: 4, paladin: 2, hunter: 4, rogue: 4, priest: 4,
  mage: 4, warlock: 4, shaman: 4, druid: 4,
};

/** Whether `skin` is a valid appearance index for `cls` (0 = default). */
export function classHasSkin(cls: PlayerClass, skin: number): boolean {
  return Number.isInteger(skin) && skin >= 0 && skin < SKIN_COUNTS[cls];
}
