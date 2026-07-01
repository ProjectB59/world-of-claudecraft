// Tests for the rate-limit middleware adapter (server/http/middleware/rate_limit.ts).
// rateLimit is a thin wrapper over the existing boolean limiters
// (server/ratelimit.ts); these tests pin the clock via the injected clock seam
// so a flood, a window reset, and the ip+account composition-bug guard are all
// deterministic.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mapError } from '../../../server/http/errors';
import {
  CARD_UPLOAD_POLICY,
  DISCORD_POLICY,
  rateLimit,
  WALLET_LINK_POLICY,
  WOC_BALANCE_POLICY,
} from '../../../server/http/middleware/rate_limit';
import {
  CARD_UPLOAD_MAX_PER_MINUTE,
  DISCORD_MAX_PER_MINUTE,
  resetCardUploadRateLimits,
  resetDiscordRateLimits,
  resetRateLimitClock,
  resetWalletLinkRateLimits,
  resetWocBalanceRateLimits,
  setRateLimitClock,
  WALLET_LINK_MAX_PER_MINUTE,
  WINDOW_MS,
  WOC_BALANCE_MAX_PER_MINUTE,
} from '../../../server/ratelimit';
import { fakeCtx } from '../helpers/fake_ctx';

const RETRY_AFTER_SECONDS = WINDOW_MS / 1000;
const PINNED = 1_000_000;

beforeEach(() => {
  setRateLimitClock(() => PINNED);
  resetWocBalanceRateLimits();
  resetCardUploadRateLimits();
});

afterEach(() => {
  resetRateLimitClock();
  resetWocBalanceRateLimits();
  resetCardUploadRateLimits();
});

describe('rateLimit: ip policy flood', () => {
  it('allows up to the cap, then rejects the next call with 429', async () => {
    const ctx = fakeCtx();
    for (let i = 0; i < WOC_BALANCE_MAX_PER_MINUTE; i++) {
      await expect(rateLimit(WOC_BALANCE_POLICY)(ctx, async () => {})).resolves.toBeUndefined();
    }
    await expect(rateLimit(WOC_BALANCE_POLICY)(ctx, async () => {})).rejects.toMatchObject({
      status: 429,
      code: 'rate_limit.exceeded',
      params: { retryAfterSeconds: RETRY_AFTER_SECONDS },
    });
  });

  it('serializes the 429 with a Retry-After header via mapError', async () => {
    const ctx = fakeCtx();
    for (let i = 0; i < WOC_BALANCE_MAX_PER_MINUTE; i++) {
      await rateLimit(WOC_BALANCE_POLICY)(ctx, async () => {});
    }
    try {
      await rateLimit(WOC_BALANCE_POLICY)(ctx, async () => {});
      throw new Error('expected rateLimit to reject');
    } catch (err) {
      const serialized = mapError(err, fakeCtx(), { surface: 'problem' });
      expect(serialized.status).toBe(429);
      expect(serialized.headers['Retry-After']).toBe(String(RETRY_AFTER_SECONDS));
    }
  });
});

describe('rateLimit: window reset', () => {
  it('allows a call again once the window has fully elapsed', async () => {
    const ctx = fakeCtx();
    for (let i = 0; i < WOC_BALANCE_MAX_PER_MINUTE; i++) {
      await rateLimit(WOC_BALANCE_POLICY)(ctx, async () => {});
    }
    await expect(rateLimit(WOC_BALANCE_POLICY)(ctx, async () => {})).rejects.toMatchObject({
      status: 429,
      code: 'rate_limit.exceeded',
    });
    setRateLimitClock(() => PINNED + WINDOW_MS + 1);
    await expect(rateLimit(WOC_BALANCE_POLICY)(ctx, async () => {})).resolves.toBeUndefined();
  });
});

describe('rateLimit: ip+account policy', () => {
  it('limits per-account after the cap', async () => {
    const ctx = fakeCtx({ account: { accountId: 7, scope: 'full' } });
    for (let i = 0; i < CARD_UPLOAD_MAX_PER_MINUTE; i++) {
      await rateLimit(CARD_UPLOAD_POLICY)(ctx, async () => {});
    }
    await expect(rateLimit(CARD_UPLOAD_POLICY)(ctx, async () => {})).rejects.toMatchObject({
      status: 429,
      code: 'rate_limit.exceeded',
    });
  });

  it('throws a 500 internal.error when ctx.account is missing (a composition bug)', async () => {
    const ctx = fakeCtx();
    await expect(rateLimit(CARD_UPLOAD_POLICY)(ctx, async () => {})).rejects.toMatchObject({
      status: 500,
      code: 'internal.error',
    });
  });
});

describe('rateLimit: wallet-link and discord ip+account policies', () => {
  beforeEach(() => {
    resetWalletLinkRateLimits();
    resetDiscordRateLimits();
  });
  afterEach(() => {
    resetWalletLinkRateLimits();
    resetDiscordRateLimits();
  });

  it('WALLET_LINK_POLICY is ip+account and 429s once its cap is exceeded', async () => {
    expect(WALLET_LINK_POLICY.keyClass).toBe('ip+account');
    const ctx = fakeCtx({ account: { accountId: 11, scope: 'full' } });
    for (let i = 0; i < WALLET_LINK_MAX_PER_MINUTE; i++) {
      await rateLimit(WALLET_LINK_POLICY)(ctx, async () => {});
    }
    await expect(rateLimit(WALLET_LINK_POLICY)(ctx, async () => {})).rejects.toMatchObject({
      status: 429,
      code: 'rate_limit.exceeded',
    });
  });

  it('DISCORD_POLICY is ip+account and 429s once its cap is exceeded', async () => {
    expect(DISCORD_POLICY.keyClass).toBe('ip+account');
    const ctx = fakeCtx({ account: { accountId: 12, scope: 'full' } });
    for (let i = 0; i < DISCORD_MAX_PER_MINUTE; i++) {
      await rateLimit(DISCORD_POLICY)(ctx, async () => {});
    }
    await expect(rateLimit(DISCORD_POLICY)(ctx, async () => {})).rejects.toMatchObject({
      status: 429,
      code: 'rate_limit.exceeded',
    });
  });

  it('DISCORD_POLICY 500s when ctx.account is missing (ip+account composition bug)', async () => {
    const ctx = fakeCtx();
    await expect(rateLimit(DISCORD_POLICY)(ctx, async () => {})).rejects.toMatchObject({
      status: 500,
      code: 'internal.error',
    });
  });
});

describe('rateLimit: allowed call', () => {
  it('runs next() when under the limit', async () => {
    const ctx = fakeCtx();
    let nextRan = false;
    await rateLimit(WOC_BALANCE_POLICY)(ctx, async () => {
      nextRan = true;
    });
    expect(nextRan).toBe(true);
  });
});
