import { describe, expect, it } from 'vitest';
import {
  cleanEscalationConfig,
  DEFAULT_ESCALATION,
  escalate,
  findHardWord,
  maskText,
  normalizeWord,
  parseWordList,
} from '../server/chat_filter';

describe('normalizeWord', () => {
  it('lowercases, de-leets confusables, and strips non-letters', () => {
    expect(normalizeWord('N1GG3R')).toBe('nigger');
    expect(normalizeWord('f.u_c-k')).toBe('fuck');
    expect(normalizeWord('@$$')).toBe('ass');
    expect(normalizeWord('123')).toBe('ie'); // 1->i, 2 dropped, 3->e
  });
});

describe('parseWordList', () => {
  it('splits on whitespace/commas and normalizes each term', () => {
    expect(parseWordList('Fuck, sh1t\n bitch')).toEqual(['fuck', 'shit', 'bitch']);
    expect(parseWordList('   ')).toEqual([]);
  });
});

describe('maskText (soft, cosmetic)', () => {
  it('masks tokens containing a soft term, preserving length', () => {
    expect(maskText('oh shit really', ['shit'])).toBe('oh **** really');
    expect(maskText('that is shitty', ['shit'])).toBe('that is ******'); // substring match
  });

  it('catches leet-spelled evasions', () => {
    expect(maskText('sh1t', ['shit'])).toBe('****');
  });

  it('returns the text unchanged when no terms are configured', () => {
    expect(maskText('anything goes', [])).toBe('anything goes');
  });
});

describe('findHardWord (hard, punitive)', () => {
  it('matches whole tokens, including leet and plurals', () => {
    expect(findHardWord('you are a nigger', ['nigger'])).toBe('nigger');
    expect(findHardWord('n1gger', ['nigger'])).toBe('nigger');
    expect(findHardWord('two niggers here', ['nigger'])).toBe('nigger'); // plural strip
    expect(findHardWord('NIGGER', ['nigger'])).toBe('nigger'); // case-insensitive
  });

  it('does NOT substring-match innocent words (no false mutes)', () => {
    // The classic Scunthorpe trap: substring matching would wrongly fire here.
    expect(findHardWord('that is despicable', ['spic'])).toBeNull();
    expect(findHardWord('what a classy pass', ['ass'])).toBeNull();
    expect(findHardWord('assassin guild', ['ass'])).toBeNull();
  });

  it('returns null with no terms or no hit', () => {
    expect(findHardWord('anything', [])).toBeNull();
    expect(findHardWord('perfectly fine message', ['nigger'])).toBeNull();
  });
});

describe('escalate', () => {
  const cfg = { warningsBeforeMute: 1, muteLadderSeconds: [600, 3600, 86400] };

  it('warns for the first offense, then walks the mute ladder, capping at the last', () => {
    expect(escalate(0, cfg)).toEqual({ kind: 'warning', muteSeconds: 0, strikes: 1 });
    expect(escalate(1, cfg)).toEqual({ kind: 'mute', muteSeconds: 600, strikes: 2 });
    expect(escalate(2, cfg)).toEqual({ kind: 'mute', muteSeconds: 3600, strikes: 3 });
    expect(escalate(3, cfg)).toEqual({ kind: 'mute', muteSeconds: 86400, strikes: 4 });
    expect(escalate(9, cfg)).toEqual({ kind: 'mute', muteSeconds: 86400, strikes: 10 }); // clamps
  });

  it('mutes immediately when warningsBeforeMute is 0', () => {
    expect(escalate(0, { warningsBeforeMute: 0, muteLadderSeconds: [600] })).toEqual({
      kind: 'mute', muteSeconds: 600, strikes: 1,
    });
  });

  it('never mutes when the ladder is empty', () => {
    expect(escalate(5, { warningsBeforeMute: 1, muteLadderSeconds: [] })).toEqual({
      kind: 'warning', muteSeconds: 0, strikes: 6,
    });
  });
});

describe('cleanEscalationConfig', () => {
  it('falls back to defaults on garbage input', () => {
    expect(cleanEscalationConfig({})).toEqual(DEFAULT_ESCALATION);
    expect(cleanEscalationConfig({ warningsBeforeMute: -3, muteLadderSeconds: 'nope' })).toEqual(DEFAULT_ESCALATION);
  });

  it('keeps valid values and drops non-positive ladder entries', () => {
    expect(cleanEscalationConfig({ warningsBeforeMute: 2, muteLadderSeconds: [60, -1, 0, 120] })).toEqual({
      warningsBeforeMute: 2,
      muteLadderSeconds: [60, 120],
    });
  });
});
