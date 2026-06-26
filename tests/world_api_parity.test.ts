// W0c: the IWorld structural-parity gate.
//
// `IWorld` (src/world_api.ts:341-510, 142 members) is the ONE seam render/ui depend
// on. `tsc` already proves both the offline `Sim` and the online `ClientWorld` satisfy
// it structurally, but the interface is erased at build: there is NO runtime member
// list, so nothing catches a present-but-throws stub or a kind flip (method vs read).
// This file adds that runtime layer.
//
// IWORLD_MEMBERS below is the hand-maintained member list, the W0c analog of the
// append-only CALLBACK_KEYS in tests/sim_context.test.ts. It is APPEND-ONLY WITH THE
// INTERFACE: whenever a future slice adds (or removes/renames) a member on `IWorld`,
// it lands the matching edit here in the SAME commit. The count pins (142 / 36 / 106)
// plus the sorted-name `toEqual` snapshots (modeled on the anti-loosening exclude-set
// pin in tests/parity/harness.test.ts:131-162) are what force that: a dropped or
// renamed member reddens deliberately, never silently.
//
// Each entry carries a single structural kind, transcribed verbatim from the interface
// body (world_api.ts:342-509):
//   - 'method': every call-signature declaration `name(args): T`. Probe: a function-
//     VALUED own-or-inherited property descriptor on BOTH Sim.prototype AND
//     ClientWorld.prototype (a getter descriptor for one of these names is a FAIL: that
//     is a kind mismatch). These are NOT invoked (command methods mutate / throw on a
//     bare instance), so a body that throws WHEN CALLED is out of this gate's reach by
//     design (see the QA-handoff note below).
//   - 'data': every property declaration `name: T` (no call signature). Probe: the name
//     is present and READING it does not throw, on a constructed `Sim` AND a constructed
//     `ClientWorld`. The backing is impl-specific and is deliberately NOT pinned: almost
//     every read is a GETTER on `Sim` but a DATA FIELD on `ClientWorld` (`playerId`,
//     `inventory`, `copper`, ...; `player` is the lone getter on both). Asserting
//     "getter on the prototype" would falsely redden every one of those, so the data
//     probe checks contract shape (present + readable), never getter-vs-field backing.

import { beforeAll, describe, expect, it } from 'vitest';
import { ClientWorld } from '../src/net/online';
import { Sim } from '../src/sim/sim';
import type { PlayerClass } from '../src/sim/types';

type IWorldMemberKind = 'method' | 'data';

interface IWorldMember {
  readonly name: string;
  readonly kind: IWorldMemberKind;
}

// The 142 members of `interface IWorld`, in interface order (world_api.ts:342-509).
// Partition: 36 `data` + 106 `method` (98 command-void + 6 read-returning + 2 async).
export const IWORLD_MEMBERS = [
  // --- core world / player roster + economy reads (data) ---
  { name: 'cfg', kind: 'data' },
  { name: 'entities', kind: 'data' },
  { name: 'playerId', kind: 'data' },
  { name: 'player', kind: 'data' },
  { name: 'moveInput', kind: 'data' },
  { name: 'inventory', kind: 'data' },
  { name: 'vendorBuyback', kind: 'data' },
  { name: 'equipment', kind: 'data' },
  { name: 'accountCosmetics', kind: 'data' },
  { name: 'copper', kind: 'data' },
  { name: 'xp', kind: 'data' },
  { name: 'lifetimeXp', kind: 'data' },
  { name: 'prestigeRank', kind: 'data' },
  { name: 'unlockedMilestones', kind: 'data' },
  { name: 'restedXp', kind: 'data' },
  { name: 'known', kind: 'data' },
  { name: 'questLog', kind: 'data' },
  { name: 'questsDone', kind: 'data' },
  // --- commands + read-returning methods ---
  { name: 'questState', kind: 'method' }, // read-returning (1/6)
  { name: 'castAbility', kind: 'method' },
  { name: 'castAbilityBySlot', kind: 'method' },
  { name: 'targetEntity', kind: 'method' },
  { name: 'tabTarget', kind: 'method' },
  { name: 'targetNearestFriendly', kind: 'method' },
  { name: 'friendlyTabTarget', kind: 'method' },
  { name: 'startAutoAttack', kind: 'method' },
  { name: 'stopAutoAttack', kind: 'method' },
  { name: 'interact', kind: 'method' },
  { name: 'lootCorpse', kind: 'method' },
  { name: 'submitLootRoll', kind: 'method' },
  { name: 'activeLootRolls', kind: 'method' }, // read-returning (2/6)
  { name: 'pickUpObject', kind: 'method' },
  { name: 'acceptQuest', kind: 'method' },
  { name: 'turnInQuest', kind: 'method' },
  { name: 'reportTelemetry', kind: 'method' },
  { name: 'abandonQuest', kind: 'method' },
  { name: 'acceptLinkedQuest', kind: 'method' },
  { name: 'equipItem', kind: 'method' },
  { name: 'unequipItem', kind: 'method' },
  { name: 'useItem', kind: 'method' },
  { name: 'discardItem', kind: 'method' },
  { name: 'buyItem', kind: 'method' },
  { name: 'sellItem', kind: 'method' },
  { name: 'sellAllJunk', kind: 'method' },
  { name: 'buyBackItem', kind: 'method' },
  { name: 'changeSkin', kind: 'method' },
  { name: 'claimEventSkin', kind: 'method' },
  { name: 'unequipMechChroma', kind: 'method' },
  { name: 'releaseSpirit', kind: 'method' },
  { name: 'chat', kind: 'method' },
  { name: 'playEmote', kind: 'method' },
  { name: 'abandonPet', kind: 'method' },
  { name: 'renamePet', kind: 'method' },
  { name: 'revivePet', kind: 'method' },
  { name: 'petAttack', kind: 'method' },
  { name: 'petTaunt', kind: 'method' },
  { name: 'setPetAutoTaunt', kind: 'method' },
  { name: 'feedPet', kind: 'method' },
  { name: 'healPet', kind: 'method' },
  { name: 'setPetMode', kind: 'method' },
  // --- social systems (data reads) ---
  { name: 'partyInfo', kind: 'data' },
  { name: 'tradeInfo', kind: 'data' },
  { name: 'duelInfo', kind: 'data' },
  { name: 'arenaInfo', kind: 'data' },
  { name: 'marketInfo', kind: 'data' },
  // --- party / raid commands + marker read ---
  { name: 'partyInvite', kind: 'method' },
  { name: 'partyAccept', kind: 'method' },
  { name: 'partyDecline', kind: 'method' },
  { name: 'partyLeave', kind: 'method' },
  { name: 'partyKick', kind: 'method' },
  { name: 'convertPartyToRaid', kind: 'method' },
  { name: 'convertRaidToParty', kind: 'method' },
  { name: 'moveRaidMember', kind: 'method' },
  { name: 'markerFor', kind: 'method' }, // read-returning (3/6)
  { name: 'setMarker', kind: 'method' },
  { name: 'clearMarker', kind: 'method' },
  { name: 'tradeRequest', kind: 'method' },
  { name: 'tradeAccept', kind: 'method' },
  { name: 'tradeSetOffer', kind: 'method' },
  { name: 'tradeConfirm', kind: 'method' },
  { name: 'tradeCancel', kind: 'method' },
  { name: 'duelRequest', kind: 'method' },
  { name: 'duelAccept', kind: 'method' },
  { name: 'duelDecline', kind: 'method' },
  { name: 'realm', kind: 'data' },
  { name: 'socialInfo', kind: 'data' },
  // --- social graph commands + async search ---
  { name: 'friendAdd', kind: 'method' },
  { name: 'friendRemove', kind: 'method' },
  { name: 'blockAdd', kind: 'method' },
  { name: 'blockRemove', kind: 'method' },
  { name: 'guildCreate', kind: 'method' },
  { name: 'guildInvite', kind: 'method' },
  { name: 'guildAccept', kind: 'method' },
  { name: 'guildDecline', kind: 'method' },
  { name: 'guildLeave', kind: 'method' },
  { name: 'guildKick', kind: 'method' },
  { name: 'guildPromote', kind: 'method' },
  { name: 'guildDemote', kind: 'method' },
  { name: 'guildTransfer', kind: 'method' },
  { name: 'guildDisband', kind: 'method' },
  { name: 'searchCharacters', kind: 'method' }, // async (1/2)
  { name: 'arenaQueueJoin', kind: 'method' },
  { name: 'arenaQueueLeave', kind: 'method' },
  { name: 'arenaAugmentPick', kind: 'method' },
  // --- market commands ---
  { name: 'marketSearch', kind: 'method' },
  { name: 'marketList', kind: 'method' },
  { name: 'marketBuy', kind: 'method' },
  { name: 'marketCancel', kind: 'method' },
  { name: 'marketCollect', kind: 'method' },
  // --- dungeons + delves commands and reads ---
  { name: 'enterDungeon', kind: 'method' },
  { name: 'leaveDungeon', kind: 'method' },
  { name: 'enterDelve', kind: 'method' },
  { name: 'leaveDelve', kind: 'method' },
  { name: 'delveInteract', kind: 'method' },
  { name: 'companionUpgrade', kind: 'method' },
  { name: 'delveBuyShopItem', kind: 'method' },
  { name: 'delveShopOffers', kind: 'method' }, // read-returning (4/6)
  { name: 'lockpickState', kind: 'data' },
  { name: 'lockpickEngage', kind: 'method' },
  { name: 'lockpickAction', kind: 'method' },
  { name: 'lockpickAbort', kind: 'method' },
  { name: 'collectDelveChestLoot', kind: 'method' },
  { name: 'delveRun', kind: 'data' },
  { name: 'companionState', kind: 'data' },
  { name: 'delveMarks', kind: 'data' },
  { name: 'companionUpgrades', kind: 'data' },
  { name: 'delveDaily', kind: 'data' },
  { name: 'raidLockouts', kind: 'method' }, // read-returning (5/6)
  { name: 'leaderboard', kind: 'method' }, // async (2/2)
  { name: 'prestige', kind: 'method' },
  // --- talents & specializations (reads + commands) ---
  { name: 'talents', kind: 'data' },
  { name: 'talentSpec', kind: 'data' },
  { name: 'talentRole', kind: 'data' },
  { name: 'loadouts', kind: 'data' },
  { name: 'activeLoadout', kind: 'data' },
  { name: 'talentPoints', kind: 'method' }, // read-returning (6/6)
  { name: 'applyTalents', kind: 'method' },
  { name: 'respec', kind: 'method' },
  { name: 'setSpec', kind: 'method' },
  { name: 'saveLoadout', kind: 'method' },
  { name: 'switchLoadout', kind: 'method' },
  { name: 'deleteLoadout', kind: 'method' },
] as const satisfies readonly IWorldMember[];

const DATA_MEMBERS = IWORLD_MEMBERS.filter((m) => m.kind === 'data');
const METHOD_MEMBERS = IWORLD_MEMBERS.filter((m) => m.kind === 'method');

// --- the two worlds under test: real prototypes + constructed instances ---

const SIM_SEED = 1;
const PROBE_CLASS: PlayerClass = 'warrior';

// A DOM-less, network-free WebSocket stand-in for the ClientWorld ctor
// (online.ts:800-823 opens a real `new WebSocket(...)`). No-op send/close; settable
// on*-handlers, exactly what the ctor assigns.
class StubWebSocket {
  static readonly OPEN = 1;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = StubWebSocket.OPEN;
  constructor(public readonly url: string) {}
  send(): void {
    /* no-op: the gate never sends */
  }
  close(): void {
    /* no-op: there is no real socket */
  }
}

// Run `fn` with `globalThis.WebSocket`/`globalThis.window` stubbed, then restore them.
// Keeps the construction deterministic and free of real DOM/network/timers.
function withDomStubs<T>(fn: () => T): T {
  const g = globalThis as Record<string, unknown>;
  const prevWebSocket = g.WebSocket;
  const prevWindow = g.window;
  g.WebSocket = StubWebSocket as unknown;
  g.window = { setInterval: () => 0, clearInterval: () => undefined };
  try {
    return fn();
  } finally {
    g.WebSocket = prevWebSocket;
    g.window = prevWindow;
  }
}

// A real ClientWorld whose FIELD INITIALIZERS have run (a raw
// `Object.create(ClientWorld.prototype)` bareClient would be missing all 36 data
// props). Pass a non-empty `base` so the ctor builds a `ws://localhost/ws` URL instead
// of touching `location`; `.close()` clears the stubbed input timer.
function makeClientWorld(): ClientWorld {
  return withDomStubs(() => {
    const world = new ClientWorld('parity-probe-token', 1, PROBE_CLASS, 'http://localhost');
    world.close();
    return world;
  });
}

// Resolve an own-or-inherited property descriptor (stop before Object.prototype so we
// never match `toString`/`valueOf` and friends).
function resolveDescriptor(proto: object, name: string): PropertyDescriptor | undefined {
  let cur: object | null = proto;
  while (cur && cur !== Object.prototype) {
    const d = Object.getOwnPropertyDescriptor(cur, name);
    if (d) return d;
    cur = Object.getPrototypeOf(cur) as object | null;
  }
  return undefined;
}

function assertMethodMember(proto: object, name: string, label: string): void {
  const d = resolveDescriptor(proto, name);
  expect(d, `${label}.${name} is missing (IWorld method not implemented)`).toBeDefined();
  // A getter descriptor for a call-signature member is a kind mismatch, not a method.
  expect(
    d?.get,
    `${label}.${name} is a getter; expected a call-signature method (kind mismatch)`,
  ).toBeUndefined();
  expect(typeof d?.value, `${label}.${name} is not function-valued (kind mismatch)`).toBe(
    'function',
  );
}

function assertDataMember(instance: object, name: string, label: string): void {
  const bag = instance as Record<string, unknown>;
  expect(name in bag, `${label}.${name} is missing (IWorld data member not present)`).toBe(true);
  // Reading must not throw: a present-but-throws read (e.g. a stubbed getter) is a drift.
  // For `Sim` this exercises the getter body; for `ClientWorld` it reads the field.
  expect(() => {
    void bag[name];
  }, `${label}.${name} threw on read (present-but-throws drift)`).not.toThrow();
}

let sim: Sim;
let client: ClientWorld;

beforeAll(() => {
  sim = new Sim({ seed: SIM_SEED, playerClass: PROBE_CLASS });
  client = makeClientWorld();
});

describe('IWORLD_MEMBERS is the pinned IWorld contract (anti-loosening)', () => {
  it('pins total / data / method counts', () => {
    expect(IWORLD_MEMBERS.length).toBe(142);
    expect(DATA_MEMBERS.length).toBe(36);
    expect(METHOD_MEMBERS.length).toBe(106);
  });

  it('has no duplicate member names', () => {
    const names = IWORLD_MEMBERS.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  // Sorted-name `toEqual` snapshots: a dropped, renamed, or kind-flipped member reddens
  // these deliberately, forcing a reviewed edit. NOT length-only.
  it('the full sorted member set is exactly the pinned 142', () => {
    expect(IWORLD_MEMBERS.map((m) => m.name).sort()).toEqual([
      'abandonPet', 'abandonQuest', 'acceptLinkedQuest', 'acceptQuest', 'accountCosmetics', 'activeLoadout',
      'activeLootRolls', 'applyTalents', 'arenaAugmentPick', 'arenaInfo', 'arenaQueueJoin', 'arenaQueueLeave',
      'blockAdd', 'blockRemove', 'buyBackItem', 'buyItem', 'castAbility', 'castAbilityBySlot',
      'cfg', 'changeSkin', 'chat', 'claimEventSkin', 'clearMarker', 'collectDelveChestLoot',
      'companionState', 'companionUpgrade', 'companionUpgrades', 'convertPartyToRaid', 'convertRaidToParty', 'copper',
      'deleteLoadout', 'delveBuyShopItem', 'delveDaily', 'delveInteract', 'delveMarks', 'delveRun',
      'delveShopOffers', 'discardItem', 'duelAccept', 'duelDecline', 'duelInfo', 'duelRequest',
      'enterDelve', 'enterDungeon', 'entities', 'equipItem', 'equipment', 'feedPet',
      'friendAdd', 'friendRemove', 'friendlyTabTarget', 'guildAccept', 'guildCreate', 'guildDecline',
      'guildDemote', 'guildDisband', 'guildInvite', 'guildKick', 'guildLeave', 'guildPromote',
      'guildTransfer', 'healPet', 'interact', 'inventory', 'known', 'leaderboard',
      'leaveDelve', 'leaveDungeon', 'lifetimeXp', 'loadouts', 'lockpickAbort', 'lockpickAction',
      'lockpickEngage', 'lockpickState', 'lootCorpse', 'markerFor', 'marketBuy', 'marketCancel',
      'marketCollect', 'marketInfo', 'marketList', 'marketSearch', 'moveInput', 'moveRaidMember',
      'partyAccept', 'partyDecline', 'partyInfo', 'partyInvite', 'partyKick', 'partyLeave',
      'petAttack', 'petTaunt', 'pickUpObject', 'playEmote', 'player', 'playerId',
      'prestige', 'prestigeRank', 'questLog', 'questState', 'questsDone', 'raidLockouts',
      'realm', 'releaseSpirit', 'renamePet', 'reportTelemetry', 'respec', 'restedXp',
      'revivePet', 'saveLoadout', 'searchCharacters', 'sellAllJunk', 'sellItem', 'setMarker',
      'setPetAutoTaunt', 'setPetMode', 'setSpec', 'socialInfo', 'startAutoAttack', 'stopAutoAttack',
      'submitLootRoll', 'switchLoadout', 'tabTarget', 'talentPoints', 'talentRole', 'talentSpec',
      'talents', 'targetEntity', 'targetNearestFriendly', 'tradeAccept', 'tradeCancel', 'tradeConfirm',
      'tradeInfo', 'tradeRequest', 'tradeSetOffer', 'turnInQuest', 'unequipItem', 'unequipMechChroma',
      'unlockedMilestones', 'useItem', 'vendorBuyback', 'xp',
    ]);
  });

  it('the sorted data-kind set is exactly the pinned 36', () => {
    expect(DATA_MEMBERS.map((m) => m.name).sort()).toEqual([
      'accountCosmetics', 'activeLoadout', 'arenaInfo', 'cfg', 'companionState', 'companionUpgrades',
      'copper', 'delveDaily', 'delveMarks', 'delveRun', 'duelInfo', 'entities',
      'equipment', 'inventory', 'known', 'lifetimeXp', 'loadouts', 'lockpickState',
      'marketInfo', 'moveInput', 'partyInfo', 'player', 'playerId', 'prestigeRank',
      'questLog', 'questsDone', 'realm', 'restedXp', 'socialInfo', 'talentRole',
      'talentSpec', 'talents', 'tradeInfo', 'unlockedMilestones', 'vendorBuyback', 'xp',
    ]);
  });

  it('the sorted method-kind set is exactly the pinned 106', () => {
    expect(METHOD_MEMBERS.map((m) => m.name).sort()).toEqual([
      'abandonPet', 'abandonQuest', 'acceptLinkedQuest', 'acceptQuest', 'activeLootRolls', 'applyTalents',
      'arenaAugmentPick', 'arenaQueueJoin', 'arenaQueueLeave', 'blockAdd', 'blockRemove', 'buyBackItem',
      'buyItem', 'castAbility', 'castAbilityBySlot', 'changeSkin', 'chat', 'claimEventSkin',
      'clearMarker', 'collectDelveChestLoot', 'companionUpgrade', 'convertPartyToRaid', 'convertRaidToParty', 'deleteLoadout',
      'delveBuyShopItem', 'delveInteract', 'delveShopOffers', 'discardItem', 'duelAccept', 'duelDecline',
      'duelRequest', 'enterDelve', 'enterDungeon', 'equipItem', 'feedPet', 'friendAdd',
      'friendRemove', 'friendlyTabTarget', 'guildAccept', 'guildCreate', 'guildDecline', 'guildDemote',
      'guildDisband', 'guildInvite', 'guildKick', 'guildLeave', 'guildPromote', 'guildTransfer',
      'healPet', 'interact', 'leaderboard', 'leaveDelve', 'leaveDungeon', 'lockpickAbort',
      'lockpickAction', 'lockpickEngage', 'lootCorpse', 'markerFor', 'marketBuy', 'marketCancel',
      'marketCollect', 'marketList', 'marketSearch', 'moveRaidMember', 'partyAccept', 'partyDecline',
      'partyInvite', 'partyKick', 'partyLeave', 'petAttack', 'petTaunt', 'pickUpObject',
      'playEmote', 'prestige', 'questState', 'raidLockouts', 'releaseSpirit', 'renamePet',
      'reportTelemetry', 'respec', 'revivePet', 'saveLoadout', 'searchCharacters', 'sellAllJunk',
      'sellItem', 'setMarker', 'setPetAutoTaunt', 'setPetMode', 'setSpec', 'startAutoAttack',
      'stopAutoAttack', 'submitLootRoll', 'switchLoadout', 'tabTarget', 'talentPoints', 'targetEntity',
      'targetNearestFriendly', 'tradeAccept', 'tradeCancel', 'tradeConfirm', 'tradeRequest', 'tradeSetOffer',
      'turnInQuest', 'unequipItem', 'unequipMechChroma', 'useItem',
    ]);
  });
});

describe('method members are callable functions on both world prototypes', () => {
  for (const m of METHOD_MEMBERS) {
    it(`${m.name} is function-valued on Sim.prototype and ClientWorld.prototype`, () => {
      assertMethodMember(Sim.prototype, m.name, 'Sim.prototype');
      assertMethodMember(ClientWorld.prototype, m.name, 'ClientWorld.prototype');
    });
  }
});

describe('data members are present and readable (no throw) on both constructed worlds', () => {
  for (const m of DATA_MEMBERS) {
    it(`${m.name} reads without throwing on a constructed Sim and ClientWorld`, () => {
      assertDataMember(sim, m.name, 'Sim');
      assertDataMember(client, m.name, 'ClientWorld');
    });
  }
});

describe('membership, not equality: world extras do not fail the gate', () => {
  it('Sim may exceed IWorld (e.g. targetNearestEnemy) without reddening the gate', () => {
    // `targetNearestEnemy` is a real Sim method that is NOT an IWorld member. The gate
    // asserts each IWORLD_MEMBERS name is satisfied, never that the impls carry no
    // extra members, so this (and ClientWorld net-only extras like `drainEvents`,
    // `close`) is allowed.
    const simProto = Sim.prototype as unknown as Record<string, unknown>;
    expect(typeof simProto.targetNearestEnemy).toBe('function');
    const iworldNames = new Set<string>(IWORLD_MEMBERS.map((m) => m.name));
    expect(iworldNames.has('targetNearestEnemy')).toBe(false);
  });
});

// --- W1 HOOK (inert) ---------------------------------------------------------------
// After the facet split (W1), the aggregate `IWorld` member set must equal the UNION
// of the 19 facet member sets (no member dropped or duplicated across the split). W1
// may add an optional `facet` tag to each IWORLD_MEMBERS entry and assert the per-facet
// partition unions back to this whole. Do NOT build the facet partition now: the 19
// facet interfaces do not exist until W1 (YAGNI).
describe('W1: aggregate equals the union of the 19 facet member sets', () => {
  it.todo('aggregate IWorld member set equals the UNION of the 19 facet member sets (W1)');
});
