// Unit tests for the secret/PII redactor (server/http/redact.ts). One decisive
// assertion per named secret class (key-based and value-pattern based), plus the
// structural contracts: nested objects and arrays, plain-string scrubbing,
// idempotency, non-secret preservation (a short apiError code survives), and cycle
// safety.

import { describe, expect, it } from 'vitest';
import { REDACTED, redact } from '../../../server/http/redact';

const HEX64 = 'a'.repeat(64);

describe('redact: named secret classes', () => {
  it('(a) scrubs an Authorization header value by key (any casing)', () => {
    const out = redact({ Authorization: `Bearer ${HEX64}` }) as Record<string, unknown>;
    expect(out.Authorization).toBe(REDACTED);
  });

  it("(a) scrubs a 'Bearer <token>' substring inside a plain string", () => {
    expect(redact(`auth is Bearer ${HEX64} here`)).toBe('auth is [redacted] here');
  });

  it('(b) scrubs a standalone 64-hex bearer token inside a string', () => {
    expect(redact(`token ${HEX64} end`)).toBe('token [redacted] end');
  });

  it('(b) scrubs a 64-hex value under any key', () => {
    const out = redact({ authCode: HEX64 }) as Record<string, unknown>;
    expect(out.authCode).toBe(REDACTED);
  });

  it('(c) scrubs a password field and its variants', () => {
    const out = redact({ password: 'hunter2', newPassword: 'hunter3' }) as Record<string, unknown>;
    expect(out.password).toBe(REDACTED);
    expect(out.newPassword).toBe(REDACTED);
  });

  it('(d) scrubs cookie and set-cookie headers', () => {
    const out = redact({ cookie: 'sid=abc', 'set-cookie': ['sid=abc; HttpOnly'] }) as Record<
      string,
      unknown
    >;
    expect(out.cookie).toBe(REDACTED);
    expect(out['set-cookie']).toBe(REDACTED);
  });

  it('(e) scrubs the OAuth PKCE code_verifier and access/refresh tokens by key', () => {
    const out = redact({
      code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
      access_token: 'opaque-access',
      refresh_token: 'opaque-refresh',
    }) as Record<string, unknown>;
    expect(out.code_verifier).toBe(REDACTED);
    expect(out.access_token).toBe(REDACTED);
    expect(out.refresh_token).toBe(REDACTED);
  });

  it('(f) scrubs a TOTP secret by key and a numeric one-time code under a code key', () => {
    const out = redact({
      secret: 'JBSWY3DPEHPK3PXP',
      pendingSecret: 'X',
      code: '123456',
    }) as Record<string, unknown>;
    expect(out.secret).toBe(REDACTED);
    expect(out.pendingSecret).toBe(REDACTED);
    expect(out.code).toBe(REDACTED);
  });

  it('(g) scrubs wallet private-key-shaped fields by key', () => {
    const out = redact({
      private_key: 'skeleton',
      privateKey: 'skeleton',
      mnemonic: 'word word word',
    }) as Record<string, unknown>;
    expect(out.private_key).toBe(REDACTED);
    expect(out.privateKey).toBe(REDACTED);
    expect(out.mnemonic).toBe(REDACTED);
  });
});

describe('redact: structure and totality', () => {
  it('recurses into nested objects and arrays', () => {
    const out = redact({
      user: { name: 'Fernando', password: 'x' },
      items: [{ access_token: 'a' }, { note: 'keep' }],
    }) as { user: Record<string, unknown>; items: Array<Record<string, unknown>> };
    expect(out.user.name).toBe('Fernando');
    expect(out.user.password).toBe(REDACTED);
    expect(out.items[0].access_token).toBe(REDACTED);
    expect(out.items[1].note).toBe('keep');
  });

  it('scrubs a plain string carrying BOTH a Bearer token and a standalone 64-hex', () => {
    const line = `hdr Bearer ${HEX64} and raw ${HEX64} tail`;
    expect(redact(line)).toBe('hdr [redacted] and raw [redacted] tail');
  });

  it('is idempotent: redact(redact(x)) deep-equals redact(x)', () => {
    const input = {
      password: 'x',
      note: 'ok',
      nested: { secret: 's', keep: 42, when: new Date(0) },
      list: [HEX64, 'auth.invalid'],
    };
    const once = redact(input);
    const twice = redact(once);
    expect(twice).toEqual(once);
  });

  it('preserves non-secret fields verbatim, including a short apiError code', () => {
    const when = new Date(0);
    const out = redact({
      code: 'auth.invalid',
      name: 'Fernando',
      level: 42,
      active: true,
      when,
    }) as Record<string, unknown>;
    expect(out.code).toBe('auth.invalid');
    expect(out.name).toBe('Fernando');
    expect(out.level).toBe(42);
    expect(out.active).toBe(true);
    expect(out.when).toEqual(when);
  });

  it('does not hang or throw on a cyclic input', () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    let out: unknown;
    expect(() => {
      out = redact(cyclic);
    }).not.toThrow();
    expect((out as Record<string, unknown>).a).toBe(1);
    expect((out as Record<string, unknown>).self).toBe(REDACTED);
  });

  it('scrubs a dashed device-flow user code under an otp-scoped key', () => {
    const out = redact({ user_code: 'WXYZ-1234', code: 'auth.invalid' }) as Record<string, unknown>;
    expect(out.user_code).toBe(REDACTED);
    expect(out.code).toBe('auth.invalid');
  });

  it('collapses raw byte values wholesale, even under a non-secret key name', () => {
    const out = redact({
      blob: Buffer.from('a raw byte secret'),
      typed: new Uint8Array([1, 2, 3]),
      raw: new ArrayBuffer(8),
      note: 'plain',
    }) as Record<string, unknown>;
    expect(out.blob).toBe(REDACTED);
    expect(out.typed).toBe(REDACTED);
    expect(out.raw).toBe(REDACTED);
    expect(out.note).toBe('plain');
  });
});
