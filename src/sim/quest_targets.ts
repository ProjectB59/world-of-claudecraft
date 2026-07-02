// Pure quest-objective target/location resolution over the static content
// tables, shared by the presentation layers: the world map draws translucent
// "your objective lives here" areas from questObjectiveAreas(), and nameplates
// mark live quest-target mobs from questTargetMobIds(). A host-agnostic leaf
// like threat.ts / format_money.ts: no DOM, no rng, no Sim state. Everything
// derives from the QUESTS/CAMPS/MOBS/GROUND_OBJECTS/NPCS content plus the
// player's live quest log, so the offline Sim and the online ClientWorld
// mirror produce identical output, and (unlike world.entities) none of it is
// interest-radius limited: a camp far across the zone still resolves.

import { CAMPS, GROUND_OBJECTS, MOBS, NPCS, QUESTS } from './data';
import type { QuestObjective, QuestProgress } from './types';

/** One circular "this objective happens here" area, in world coords. */
export interface QuestObjectiveArea {
  questId: string;
  center: { x: number; z: number };
  radius: number;
}

// Padding added around a camp's spawn radius so the drawn area comfortably
// covers mobs that wandered a little off their spawn ring.
const CAMP_AREA_PAD = 4;
// Radius drawn around a lone point target (an interact NPC or single object).
const POINT_AREA_RADIUS = 6;

// The player's active quests' objectives that still need progress. 'ready'
// and 'done' quests contribute nothing (the '?' turn-in marker guides those).
function incompleteObjectives(
  questLog: ReadonlyMap<string, QuestProgress>,
): { questId: string; obj: QuestObjective }[] {
  const out: { questId: string; obj: QuestObjective }[] = [];
  for (const qp of questLog.values()) {
    if (qp.state !== 'active') continue;
    const quest = QUESTS[qp.questId];
    if (!quest) continue;
    quest.objectives.forEach((obj, i) => {
      if ((qp.counts[i] ?? 0) < obj.count) out.push({ questId: qp.questId, obj });
    });
  }
  return out;
}

// Mobs whose loot feeds this quest's collect objective. Loot entries are
// tagged with the questId they exist for, the same key quest_credit joins on.
function mobsDroppingQuestItem(itemId: string, questId: string): string[] {
  const out: string[] = [];
  for (const [mobId, def] of Object.entries(MOBS)) {
    if (def.loot.some((l) => l.itemId === itemId && l.questId === questId)) out.push(mobId);
  }
  return out;
}

/**
 * Template ids of mobs that advance one of the player's active, incomplete
 * objectives: kill targets, plus mobs that drop a needed collect item.
 * Nameplates mark these so the player knows "this one counts".
 */
export function questTargetMobIds(questLog: ReadonlyMap<string, QuestProgress>): Set<string> {
  const ids = new Set<string>();
  for (const { questId, obj } of incompleteObjectives(questLog)) {
    if (obj.type === 'kill' && obj.targetMobId) ids.add(obj.targetMobId);
    else if (obj.type === 'collect' && obj.itemId)
      for (const id of mobsDroppingQuestItem(obj.itemId, questId)) ids.add(id);
  }
  return ids;
}

/**
 * Circular world areas where the player's active, incomplete objectives are
 * carried out (the classic quest-POI blobs): the camps of kill/collect target
 * mobs, the spread of collect/interact ground objects, and interact NPCs.
 * Deduped by circle so overlapping objectives don't stack translucent fills.
 */
export function questObjectiveAreas(
  questLog: ReadonlyMap<string, QuestProgress>,
): QuestObjectiveArea[] {
  const out: QuestObjectiveArea[] = [];
  const seen = new Set<string>();
  const push = (questId: string, center: { x: number; z: number }, radius: number): void => {
    const key = `${center.x},${center.z},${radius}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ questId, center, radius });
  };
  const pushMobCamps = (questId: string, mobId: string): void => {
    for (const camp of CAMPS) {
      if (camp.mobId === mobId) push(questId, camp.center, camp.radius + CAMP_AREA_PAD);
    }
  };
  // One enclosing circle per ground-object definition: centroid of its spawn
  // positions plus the farthest point (a simple bound is plenty at map scale).
  const pushObjectCluster = (questId: string, itemId: string): void => {
    for (const def of GROUND_OBJECTS) {
      if (def.itemId !== itemId || def.positions.length === 0) continue;
      let cx = 0;
      let cz = 0;
      for (const p of def.positions) {
        cx += p.x;
        cz += p.z;
      }
      cx /= def.positions.length;
      cz /= def.positions.length;
      let r = 0;
      for (const p of def.positions) r = Math.max(r, Math.hypot(p.x - cx, p.z - cz));
      push(questId, { x: cx, z: cz }, Math.max(POINT_AREA_RADIUS, r + CAMP_AREA_PAD));
    }
  };
  for (const { questId, obj } of incompleteObjectives(questLog)) {
    if (obj.type === 'kill' && obj.targetMobId) pushMobCamps(questId, obj.targetMobId);
    else if (obj.type === 'collect' && obj.itemId) {
      for (const mobId of mobsDroppingQuestItem(obj.itemId, questId)) pushMobCamps(questId, mobId);
      pushObjectCluster(questId, obj.itemId);
    } else if (obj.type === 'interact') {
      if (obj.targetObjectItemId) pushObjectCluster(questId, obj.targetObjectItemId);
      const npc = obj.targetNpcId ? NPCS[obj.targetNpcId] : undefined;
      if (npc) push(questId, npc.pos, POINT_AREA_RADIUS);
    }
  }
  return out;
}
