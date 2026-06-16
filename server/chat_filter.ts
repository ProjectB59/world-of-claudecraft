// Pure, host-agnostic chat profanity/slur filtering. No SQL, no DOM — the SQL
// layer lives in chat_filter_db.ts and the wiring in game.ts. Two tiers:
//
//   - "soft" words (everyday swearing): cosmetic only. The server ships the
//     normalized soft list to each client in `hello`; the client masks matches
//     locally *iff* the player's profanity filter is on. The server itself
//     never alters soft words, so toggling the filter off shows raw text.
//   - "hard" words (slurs): enforced server-side and non-bypassable. A message
//     containing one is blocked entirely and the sender is warned, then
//     escalated to timed, account-wide chat mutes (see `escalate`).
//
// Matching folds common leet/confusable substitutions so "n1gg3r"-style evasion
// still resolves to the underlying word.

const CONFUSABLE_CHARS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '!': 'i',
  '|': 'i',
  '@': 'a',
  '$': 's',
  '+': 't',
};

// Tokens we scan: letters, digits and the leet punctuation that folds into
// letters. Everything else is a separator.
const TOKEN_RE = /[A-Za-z0-9_@$!|+]+/g;

/** Fold a token to its comparable core: lowercase, de-leet, strip non-letters. */
export function normalizeWord(term: string): string {
  return term
    .toLowerCase()
    .replace(/[0134578!|@$+]/g, (ch) => CONFUSABLE_CHARS[ch] ?? ch)
    .replace(/[^a-z]/g, '');
}

/** Split a raw blob (newline / comma / space separated) into normalized terms. */
export function parseWordList(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((t) => normalizeWord(t))
    .filter((t) => t.length > 0);
}

// Soft tier: generous substring match (cosmetic, so "shitty" → masked is fine).
function tokenMatchesSoft(normalizedToken: string, terms: readonly string[]): boolean {
  return normalizedToken.length > 0 && terms.some((term) => normalizedToken.includes(term));
}

/**
 * Mask every token matching a soft term with asterisks. Used client-side for
 * the display filter and never on the server's broadcast path.
 */
export function maskText(text: string, terms: readonly string[]): string {
  if (terms.length === 0) return text;
  return text.replace(TOKEN_RE, (tok) =>
    tokenMatchesSoft(normalizeWord(tok), terms) ? '*'.repeat(tok.length) : tok,
  );
}

// Hard tier: strict whole-token equality (plus a stripped trailing plural "s"),
// NOT substring. Substring matching on a *punitive* list is unacceptable — it
// would auto-mute "despicable" for containing "spic" or "class" for "ass". The
// cost of a miss here is small (human reports + admins extend the list); the
// cost of a false positive is muting an innocent player.
function tokenMatchesHard(normalizedToken: string, terms: readonly string[]): boolean {
  if (normalizedToken.length === 0) return false;
  const singular = normalizedToken.endsWith('s') ? normalizedToken.slice(0, -1) : normalizedToken;
  return terms.some((term) => normalizedToken === term || singular === term);
}

/** First hard term a message hits, or null. The match drives enforcement. */
export function findHardWord(text: string, terms: readonly string[]): string | null {
  if (terms.length === 0) return null;
  const tokens = text.match(TOKEN_RE);
  if (!tokens) return null;
  for (const tok of tokens) {
    const normalized = normalizeWord(tok);
    if (tokenMatchesHard(normalized, terms)) {
      // Return the configured term that fired, for the incident log.
      const singular = normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
      return terms.find((term) => normalized === term || singular === term) ?? normalized;
    }
  }
  return null;
}

// -------------------------------------------------------------------------
// Escalation: warnings, then a ladder of timed account-wide chat mutes.
// -------------------------------------------------------------------------

export interface EscalationConfig {
  /** Free passes (warning only) before the first mute. */
  warningsBeforeMute: number;
  /** Mute durations in seconds for the 1st, 2nd, … mute. The last entry caps. */
  muteLadderSeconds: number[];
}

export const DEFAULT_ESCALATION: EscalationConfig = {
  warningsBeforeMute: 1,
  muteLadderSeconds: [10 * 60, 60 * 60, 24 * 60 * 60], // 10m → 1h → 24h
};

export interface EscalationOutcome {
  kind: 'warning' | 'mute';
  /** Mute length in seconds; 0 for a warning. */
  muteSeconds: number;
  /** The sender's new strike total after this offense. */
  strikes: number;
}

/**
 * Given the sender's previous strike count, decide what this offense earns.
 * Strikes are 1-based: the Nth hard-word offense is strike N. The first
 * `warningsBeforeMute` offenses are warnings; the rest walk the mute ladder,
 * clamping at its final (longest) entry.
 */
export function escalate(previousStrikes: number, cfg: EscalationConfig): EscalationOutcome {
  const strikes = previousStrikes + 1;
  const ladder = cfg.muteLadderSeconds;
  if (strikes <= cfg.warningsBeforeMute || ladder.length === 0) {
    return { kind: 'warning', muteSeconds: 0, strikes };
  }
  const idx = Math.min(strikes - cfg.warningsBeforeMute - 1, ladder.length - 1);
  return { kind: 'mute', muteSeconds: Math.max(0, Math.floor(ladder[idx])), strikes };
}

/** Sanitize an escalation config coming from the DB / admin input. */
export function cleanEscalationConfig(input: {
  warningsBeforeMute?: unknown;
  muteLadderSeconds?: unknown;
}): EscalationConfig {
  const warnings = Number(input.warningsBeforeMute);
  const ladderRaw = Array.isArray(input.muteLadderSeconds) ? input.muteLadderSeconds : [];
  const ladder = ladderRaw
    .map((n) => Math.floor(Number(n)))
    .filter((n) => Number.isFinite(n) && n > 0);
  return {
    warningsBeforeMute: Number.isFinite(warnings) && warnings >= 0 ? Math.floor(warnings) : DEFAULT_ESCALATION.warningsBeforeMute,
    muteLadderSeconds: ladder.length > 0 ? ladder : [...DEFAULT_ESCALATION.muteLadderSeconds],
  };
}

// -------------------------------------------------------------------------
// Built-in seed lists ("sensible starting points"). Admins edit the live lists
// from the dashboard; these only seed an empty table on first boot. Kept short
// and unambiguous — the hard list especially, since it carries punitive weight.
// -------------------------------------------------------------------------

export const DEFAULT_SOFT_WORDS: string[] = [
  'fuck',
  'shit',
  'bitch',
  'bastard',
  'cunt',
  'dick',
  'piss',
  'asshole',
  'dumbass',
  'douche',
  'wanker',
  'bollocks',
  'prick',
  'slut',
  'whore',
];

// Slurs. These have to be stored in their real form to actually match input;
// whole-token matching (above) keeps them from snagging innocent words.
export const DEFAULT_HARD_WORDS: string[] = [
  'nigger',
  'nigga',
  'faggot',
  'chink',
  'kike',
  'tranny',
  'gook',
  'wetback',
];

/** A live snapshot of the filter state, loaded from the DB and cached. */
export interface ChatFilterState {
  soft: string[];
  hard: string[];
  config: EscalationConfig;
}

/**
 * Holds the loaded word lists + escalation config and exposes the operations
 * the server needs. The GameServer owns one instance and refreshes it from the
 * DB at boot and whenever an admin edits the lists.
 */
export class ChatFilter {
  private state: ChatFilterState = { soft: [], hard: [], config: DEFAULT_ESCALATION };

  load(state: ChatFilterState): void {
    this.state = {
      soft: [...state.soft],
      hard: [...state.hard],
      config: cleanEscalationConfig(state.config),
    };
  }

  /** Normalized soft terms shipped to clients for local masking. */
  softWords(): string[] {
    return [...this.state.soft];
  }

  config(): EscalationConfig {
    return this.state.config;
  }

  /** The first hard term `text` hits, or null. */
  findHardHit(text: string): string | null {
    return findHardWord(text, this.state.hard);
  }

  /** Decide the outcome for a sender who has `previousStrikes` prior offenses. */
  escalate(previousStrikes: number): EscalationOutcome {
    return escalate(previousStrikes, this.state.config);
  }
}
