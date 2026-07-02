// Tests for the pure quest-objective target/location resolver
// (src/sim/quest_targets.ts): the shared derivation behind the world map's
// quest-area blobs and the nameplate quest-target mob marker. Driven with the
// real content tables (QUESTS/CAMPS/MOBS/GROUND_OBJECTS) so the fixtures can
// never drift from shipped content.

import { describe, expect, it } from 'vitest';
import { CAMPS, GROUND_OBJECTS, MOBS, QUESTS } from '../src/sim/data';
import { questObjectiveAreas, questTargetMobIds } from '../src/sim/quest_targets';
import type { QuestDef, QuestProgress } from '../src/sim/types';

function activeLog(quest: QuestDef, counts?: number[]): Map<string, QuestProgress> {
  return new Map([
    [
      quest.id,
      {
        questId: quest.id,
        counts: counts ?? quest.objectives.map(() => 0),
        state: 'active' as const,
      },
    ],
  ]);
}

// Real-content fixtures, found by shape (not hardcoded ids) so a content
// rename fails loudly here rather than silently testing nothing.
function requireKillQuest(): { quest: QuestDef; mobId: string; objIndex: number } {
  for (const q of Object.values(QUESTS)) {
    const i = q.objectives.findIndex(
      (o) => o.type === 'kill' && !!o.targetMobId && CAMPS.some((c) => c.mobId === o.targetMobId),
    );
    if (i >= 0) {
      const mobId = q.objectives[i].targetMobId;
      if (mobId) return { quest: q, mobId, objIndex: i };
    }
  }
  throw new Error('expected a kill quest whose target mob has camps');
}

function requireLootCollectQuest(): { quest: QuestDef; mobId: string } {
  for (const q of Object.values(QUESTS)) {
    for (const o of q.objectives) {
      if (o.type !== 'collect' || !o.itemId) continue;
      for (const [mobId, def] of Object.entries(MOBS)) {
        if (def.loot.some((l) => l.itemId === o.itemId && l.questId === q.id))
          return { quest: q, mobId };
      }
    }
  }
  throw new Error('expected a collect quest fed by tagged mob loot');
}

function requireGroundObjectQuest(): { quest: QuestDef; itemId: string } {
  for (const q of Object.values(QUESTS)) {
    for (const o of q.objectives) {
      const itemId = o.type === 'collect' ? o.itemId : o.targetObjectItemId;
      if (itemId && GROUND_OBJECTS.some((g) => g.itemId === itemId && g.positions.length > 0))
        return { quest: q, itemId };
    }
  }
  throw new Error('expected a quest fed by ground objects');
}

describe('questTargetMobIds', () => {
  it('is empty with no active quests', () => {
    expect(questTargetMobIds(new Map()).size).toBe(0);
  });

  it('includes the kill objective target mob while incomplete', () => {
    const { quest, mobId } = requireKillQuest();
    expect(questTargetMobIds(activeLog(quest)).has(mobId)).toBe(true);
  });

  it('drops a target once its objective is complete (even while the quest is active)', () => {
    const { quest, mobId, objIndex } = requireKillQuest();
    const counts = quest.objectives.map((o) => o.count);
    counts[objIndex] = quest.objectives[objIndex].count;
    // every objective at full count: nothing left to point at
    expect(questTargetMobIds(activeLog(quest, counts)).has(mobId)).toBe(false);
  });

  it('includes mobs whose tagged loot feeds a collect objective', () => {
    const { quest, mobId } = requireLootCollectQuest();
    expect(questTargetMobIds(activeLog(quest)).has(mobId)).toBe(true);
  });

  it('contributes nothing for ready quests (turn-in is the ? marker, not a target)', () => {
    const { quest } = requireKillQuest();
    const log: Map<string, QuestProgress> = new Map([
      [
        quest.id,
        { questId: quest.id, counts: quest.objectives.map((o) => o.count), state: 'ready' },
      ],
    ]);
    expect(questTargetMobIds(log).size).toBe(0);
  });
});

describe('questObjectiveAreas', () => {
  it('is empty with no active quests', () => {
    expect(questObjectiveAreas(new Map())).toEqual([]);
  });

  it('covers every camp of a kill target, padded past the spawn radius', () => {
    const { quest, mobId } = requireKillQuest();
    const areas = questObjectiveAreas(activeLog(quest));
    const camps = CAMPS.filter((c) => c.mobId === mobId);
    for (const camp of camps) {
      const area = areas.find((a) => a.center.x === camp.center.x && a.center.z === camp.center.z);
      expect(area, `camp at ${camp.center.x},${camp.center.z} should have an area`).toBeTruthy();
      if (area) expect(area.radius).toBeGreaterThan(camp.radius);
    }
  });

  it('encloses a ground-object cluster in one finite circle', () => {
    const { quest, itemId } = requireGroundObjectQuest();
    const areas = questObjectiveAreas(activeLog(quest));
    const def = GROUND_OBJECTS.find((g) => g.itemId === itemId && g.positions.length > 0);
    expect(def).toBeTruthy();
    if (!def) return;
    // at least one area contains every position of the cluster
    const containing = areas.find((a) =>
      def.positions.every((p) => Math.hypot(p.x - a.center.x, p.z - a.center.z) <= a.radius + 1e-9),
    );
    expect(containing, 'expected one area enclosing the whole object cluster').toBeTruthy();
  });

  it('never emits duplicate circles across a multi-quest log', () => {
    const log = new Map<string, QuestProgress>();
    for (const q of Object.values(QUESTS)) {
      log.set(q.id, { questId: q.id, counts: q.objectives.map(() => 0), state: 'active' });
    }
    const areas = questObjectiveAreas(log);
    const keys = new Set(areas.map((a) => `${a.center.x},${a.center.z},${a.radius}`));
    expect(keys.size).toBe(areas.length);
    for (const a of areas) {
      expect(Number.isFinite(a.center.x)).toBe(true);
      expect(Number.isFinite(a.center.z)).toBe(true);
      expect(a.radius).toBeGreaterThan(0);
    }
  });
});
