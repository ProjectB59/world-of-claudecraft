import { describe, expect, it } from 'vitest';
import {
  TALENTS, talentsFor, validateTalentTree, talentPointsAtLevel, FIRST_TALENT_LEVEL,
  validateAllocation, dormantNodes, computeTalentModifiers, emptyAllocation,
  exportBuild, importBuild, TALENT_BUILD_VERSION, type TalentAllocation,
} from '../src/sim/content/talents';
import { MAX_LEVEL } from '../src/sim/types';

const alloc = (over: Partial<TalentAllocation> = {}): TalentAllocation => ({ ...emptyAllocation(), ...over });

describe('talent tree validation (load-time)', () => {
  it('every registered tree is structurally valid', () => {
    for (const ct of Object.values(TALENTS)) {
      expect(ct).toBeTruthy();
      expect(validateTalentTree(ct!)).toEqual([]);
    }
  });

  it('detects cycles in the requires graph', () => {
    const broken = {
      class: 'warrior' as const,
      specs: talentsFor('warrior')!.specs,
      nodes: [
        { id: 'a', tree: 'class' as const, kind: 'passive' as const, maxRank: 1, requires: ['b'], effect: {}, icon: '', name: 'A', description: '', row: 1, col: 0 },
        { id: 'b', tree: 'class' as const, kind: 'passive' as const, maxRank: 1, requires: ['a'], effect: {}, icon: '', name: 'B', description: '', row: 0, col: 0 },
      ],
    };
    expect(validateTalentTree(broken).some((e) => e.includes('cycle') || e.includes('not above'))).toBe(true);
  });

  it('flags prereqs that reference a missing node', () => {
    const broken = {
      class: 'warrior' as const,
      specs: talentsFor('warrior')!.specs,
      nodes: [
        { id: 'a', tree: 'class' as const, kind: 'passive' as const, maxRank: 1, requires: ['ghost'], effect: {}, icon: '', name: 'A', description: '', row: 1, col: 0 },
      ],
    };
    expect(validateTalentTree(broken).some((e) => e.includes('missing node'))).toBe(true);
  });
});

describe('point economy', () => {
  it('grants no points before the first talent level', () => {
    expect(talentPointsAtLevel(FIRST_TALENT_LEVEL - 1)).toBe(0);
    expect(talentPointsAtLevel(1)).toBe(0);
  });
  it('grants one point per level from the first talent level, 11 at cap', () => {
    expect(talentPointsAtLevel(FIRST_TALENT_LEVEL)).toBe(1);
    expect(talentPointsAtLevel(MAX_LEVEL)).toBe(MAX_LEVEL - FIRST_TALENT_LEVEL + 1);
    expect(talentPointsAtLevel(MAX_LEVEL)).toBe(11);
  });
});

describe('allocation rules (server-validated)', () => {
  it('accepts a simple in-budget allocation', () => {
    const a = alloc({ ranks: { war_toughness: 3, war_cruelty: 2 } });
    expect(validateAllocation('warrior', a, 11).ok).toBe(true);
  });

  it('rejects exceeding max rank', () => {
    const a = alloc({ ranks: { war_toughness: 4 } });
    expect(validateAllocation('warrior', a, 11)).toMatchObject({ ok: false });
  });

  it('rejects exceeding the point budget', () => {
    const a = alloc({ ranks: { war_toughness: 3, war_cruelty: 3 } });
    expect(validateAllocation('warrior', a, 5)).toMatchObject({ ok: false });
  });

  it('enforces connection prerequisites', () => {
    // war_imp_heroic_strike requires war_toughness
    const noPrereq = alloc({ ranks: { war_imp_heroic_strike: 1, war_cruelty: 1 } });
    expect(validateAllocation('warrior', noPrereq, 11).ok).toBe(false);
    const withPrereq = alloc({ ranks: { war_toughness: 1, war_imp_heroic_strike: 1 } });
    expect(validateAllocation('warrior', withPrereq, 11).ok).toBe(true);
  });

  it('enforces the cumulative points gate', () => {
    // war_tactical_choice needs 5 points spent above its row; with only 2 it fails
    const tooShallow = alloc({ ranks: { war_toughness: 2, war_tactical_choice: 1 }, choices: { war_tactical_choice: 'tc_cruelty' } });
    expect(validateAllocation('warrior', tooShallow, 11).ok).toBe(false);
    const deep = alloc({ ranks: { war_toughness: 3, war_cruelty: 2, war_tactical_choice: 1 }, choices: { war_tactical_choice: 'tc_cruelty' } });
    expect(validateAllocation('warrior', deep, 11).ok).toBe(true);
  });

  it('requires a valid choice for choice nodes', () => {
    const noChoice = alloc({ ranks: { war_toughness: 3, war_cruelty: 2, war_tactical_choice: 1 } });
    expect(validateAllocation('warrior', noChoice, 11).ok).toBe(false);
    const badChoice = alloc({ ranks: { war_toughness: 3, war_cruelty: 2, war_tactical_choice: 1 }, choices: { war_tactical_choice: 'nope' } });
    expect(validateAllocation('warrior', badChoice, 11).ok).toBe(false);
  });

  it('rejects spec-tree points without the matching spec', () => {
    const a = alloc({ spec: null, ranks: { arms_imp_overpower: 1 } });
    expect(validateAllocation('warrior', a, 11).ok).toBe(false);
    const b = alloc({ spec: 'fury', ranks: { arms_imp_overpower: 1 } });
    expect(validateAllocation('warrior', b, 11).ok).toBe(false);
    const c = alloc({ spec: 'arms', ranks: { arms_imp_overpower: 1 } });
    expect(validateAllocation('warrior', c, 11).ok).toBe(true);
  });
});

describe('dormant-not-destroyed dependents', () => {
  it('marks a dependent dormant when its prereq is refunded, keeping its ranks', () => {
    const built = alloc({ ranks: { war_toughness: 1, war_imp_heroic_strike: 2 } });
    expect(dormantNodes('warrior', built).size).toBe(0);
    // refund the upstream node (war_toughness) but keep the dependent's ranks
    const refunded = alloc({ ranks: { war_imp_heroic_strike: 2 } });
    const dormant = dormantNodes('warrior', refunded);
    expect(dormant.has('war_imp_heroic_strike')).toBe(true);
    expect(refunded.ranks.war_imp_heroic_strike).toBe(2); // not destroyed
    // re-adding the prereq clears dormancy
    const restored = alloc({ ranks: { war_toughness: 1, war_imp_heroic_strike: 2 } });
    expect(dormantNodes('warrior', restored).has('war_imp_heroic_strike')).toBe(false);
  });

  it('precompute ignores dormant spec nodes (wrong spec)', () => {
    const mods = computeTalentModifiers('warrior', alloc({ spec: 'fury', ranks: { arms_imp_overpower: 2 } }));
    expect(mods.abilities.overpower).toBeUndefined();
  });
});

describe('precomputed modifiers', () => {
  it('folds passive stat ranks into a flat struct', () => {
    const mods = computeTalentModifiers('warrior', alloc({ ranks: { war_toughness: 3, war_cruelty: 2 } }));
    expect(mods.stats.armorPct).toBeCloseTo(0.12); // 0.04 * 3
    expect(mods.stats.crit).toBeCloseTo(0.02);     // 0.01 * 2
  });

  it('applies the chosen option of a choice node only', () => {
    const base = alloc({ ranks: { war_toughness: 3, war_cruelty: 2, war_tactical_choice: 1 }, choices: { war_tactical_choice: 'tc_bladed_armor' } });
    const mods = computeTalentModifiers('warrior', base);
    expect(mods.stats.apPct).toBeCloseTo(0.12);
    expect(mods.stats.dodge).toBe(0); // the dodge option was not chosen
  });

  it('grants the spec signature ability + mastery when a spec is chosen', () => {
    const mods = computeTalentModifiers('warrior', alloc({ spec: 'arms' }));
    expect(mods.spec).toBe('arms');
    expect(mods.role).toBe('dps');
    expect(mods.grants.some((g) => g.ability === 'mortal_strike')).toBe(true);
    expect(mods.global.meleeDmgPct).toBeCloseTo(0.10); // Sharpened Blades mastery
  });

  it('accumulates per-ability modifiers across ranks', () => {
    const mods = computeTalentModifiers('warrior', alloc({ spec: 'arms', ranks: { arms_imp_overpower: 2 } }));
    expect(mods.abilities.overpower.dmgPct).toBeCloseTo(0.50); // 0.25 * 2
  });
});

describe('build strings (import/export)', () => {
  it('round-trips an allocation exactly', () => {
    const a = alloc({ spec: 'prot', ranks: { prot_toughness: 3, prot_choice: 1 }, choices: { prot_choice: 'pc_last_stand' } });
    const str = exportBuild('warrior', a);
    const imported = importBuild(str);
    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.cls).toBe('warrior');
      expect(imported.alloc).toEqual(a);
    }
  });

  it('rejects a malformed string', () => {
    expect(importBuild('not-base64-$$$').ok).toBe(false);
    expect(importBuild('').ok).toBe(false);
  });

  it('rejects a version-mismatched string', () => {
    const a = alloc({ spec: 'arms', ranks: { arms_imp_overpower: 1 } });
    const good = exportBuild('warrior', a);
    // hand-craft a payload with a future version
    const future = Buffer.from(JSON.stringify({ v: TALENT_BUILD_VERSION + 1, c: 'warrior', s: 'arms', r: {}, h: {} })).toString('base64');
    expect(importBuild(future)).toMatchObject({ ok: false });
    expect(importBuild(good).ok).toBe(true); // sanity: the current version still imports
  });
});
