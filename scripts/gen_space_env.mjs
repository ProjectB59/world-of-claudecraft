// scripts/gen_space_env.mjs — NodeB59 Space Edition sky generator.
//
// Renders the Planet Xenon sky as equirect radiance maps and writes:
//   public/env/xenon_2k.hdr / xenon_1k.hdr            (main nebula sky)
//   public/env/xenon_ember_2k.hdr / xenon_ember_1k.hdr (warm variant)
//   public/env/xenon_backdrop.webp / xenon_backdrop_4k.webp        (LDR)
//   public/env/xenon_ember_backdrop.webp / xenon_ember_backdrop_4k.webp
//
// The star ("sun") is baked at u = 0.600 in equirect space so HDRI_SUN_U in
// sky.ts can rotate it onto SUN_ANCHOR exactly like the Poly Haven maps.
// Radiance is authored to the same envelope the shipped HDRIs are tuned to
// after gain (sky band ~0.5-2.5, star hot enough to bloom).
//
// Usage: node scripts/gen_space_env.mjs

import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const W = 2048;
const H = 1024;
const SUN_U = 0.6; // keep in sync with HDRI_SUN_U in src/render/sky.ts

// ── deterministic rng / noise ────────────────────────────────────────────────
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x, y, z) {
  let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return h - Math.floor(h);
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function smooth(t) {
  return t * t * (3 - 2 * t);
}
function vnoise(x, y, z) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z);
  const xf = smooth(x - xi),
    yf = smooth(y - yi),
    zf = smooth(z - zi);
  let v = 0;
  const c = [];
  for (let dz = 0; dz <= 1; dz++)
    for (let dy = 0; dy <= 1; dy++)
      for (let dx = 0; dx <= 1; dx++) c.push(hash3(xi + dx, yi + dy, zi + dz));
  const x00 = lerp(c[0], c[1], xf),
    x10 = lerp(c[2], c[3], xf),
    x01 = lerp(c[4], c[5], xf),
    x11 = lerp(c[6], c[7], xf);
  const y0 = lerp(x00, x10, yf),
    y1 = lerp(x01, x11, yf);
  v = lerp(y0, y1, zf);
  return v;
}
function fbm(x, y, z, oct = 5) {
  let v = 0,
    amp = 0.5,
    f = 1;
  for (let i = 0; i < oct; i++) {
    v += vnoise(x * f, y * f, z * f) * amp;
    amp *= 0.55;
    f *= 2.1;
  }
  return v;
}

// ── palette per variant ──────────────────────────────────────────────────────
const VARIANTS = {
  xenon: {
    // magenta/violet nebula, blue lobes, big ringed planet
    nebA: [0.85, 0.1, 0.55], // magenta
    nebB: [0.32, 0.12, 0.75], // violet
    nebC: [0.08, 0.16, 0.5], // deep blue
    horizon: [0.34, 0.08, 0.4],
    base: [0.012, 0.004, 0.03],
    starTint: [1.0, 0.85, 0.95],
    planet: true,
  },
  xenon_ember: {
    // volcanic sectors: burnt orange / crimson nebula, no planet
    nebA: [0.95, 0.3, 0.1], // ember orange
    nebB: [0.7, 0.1, 0.3], // crimson-pink
    nebC: [0.3, 0.06, 0.3], // dark magenta
    horizon: [0.45, 0.12, 0.1],
    base: [0.02, 0.006, 0.015],
    starTint: [1.0, 0.75, 0.6],
    planet: false,
  },
};

// star positions shared across variants (same sky, different weather)
const starRnd = mulberry32(0xb59);
const STARS = [];
for (let i = 0; i < 2600; i++) {
  const az = starRnd() * Math.PI * 2;
  const el = Math.asin(starRnd() * 2 - 1);
  const mag = starRnd();
  const hot = starRnd();
  STARS.push({ az, el, mag, hot });
}

function dirFromUV(u, v) {
  const az = u * Math.PI * 2;
  const el = (0.5 - v) * Math.PI;
  const ce = Math.cos(el);
  return [ce * Math.sin(az), Math.sin(el), ce * Math.cos(az)];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function norm(a) {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function renderVariant(name) {
  const P = VARIANTS[name];
  const buf = new Float32Array(W * H * 3);

  // star direction (the sun anchor): u=0.6, elevation 24 deg
  const sunDir = dirFromUV(SUN_U, 0.5 - 24 / 180);

  // ringed planet: az u=0.27, elevation 10 deg, angular radius ~0.16 rad
  const planetDir = dirFromUV(0.27, 0.5 - 16 / 180);
  const pR = 0.34; // looms over the horizon, per the reference art
  // local basis around the planet for disc/ring math
  const pe1 = norm(cross([0, 1, 0], planetDir));
  const pe2 = norm(cross(planetDir, pe1));

  // galaxy band plane (tilted) for the nebula's densest run
  const bandN = norm([0.35, 0.82, -0.45]);

  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const d = dirFromUV(u, v);
      let r, g, b;

      // base deep space + slight horizon lift
      const horiz = Math.pow(1 - Math.abs(d[1]), 3.2);
      r = P.base[0] + P.horizon[0] * horiz * 0.55;
      g = P.base[1] + P.horizon[1] * horiz * 0.55;
      b = P.base[2] + P.horizon[2] * horiz * 0.55;

      // nebula: three fbm fields keyed to the band distance
      const band = 1 - Math.min(1, Math.abs(dot(d, bandN)) * 2.1);
      const n1 = fbm(d[0] * 2.4 + 11, d[1] * 2.4, d[2] * 2.4, 5);
      const n2 = fbm(d[0] * 4.1 + 47, d[1] * 4.1 + 13, d[2] * 4.1, 5);
      const n3 = fbm(d[0] * 1.5 + 83, d[1] * 1.5 + 29, d[2] * 1.5 + 7, 4);
      const wA = Math.max(0, n1 - 0.42) * (0.5 + band * 1.3) * 1.9;
      const wB = Math.max(0, n2 - 0.48) * (0.35 + band * 1.1) * 1.6;
      const wC = Math.max(0, n3 - 0.4) * 1.15;
      r += P.nebA[0] * wA + P.nebB[0] * wB + P.nebC[0] * wC;
      g += P.nebA[1] * wA + P.nebB[1] * wB + P.nebC[1] * wC;
      b += P.nebA[2] * wA + P.nebB[2] * wB + P.nebC[2] * wC;

      // the Xenon star: hot core + two glow lobes (bloom feed + god rays)
      const sd = Math.acos(Math.min(1, Math.max(-1, dot(d, sunDir))));
      if (sd < 0.012) {
        r += 340 * P.starTint[0];
        g += 340 * P.starTint[1];
        b += 340 * P.starTint[2];
      }
      const glow = Math.exp(-sd * sd * 90) * 5.5 + Math.exp(-sd * sd * 7) * 0.85;
      r += glow * P.starTint[0];
      g += glow * P.starTint[1] * 0.85;
      b += glow * P.starTint[2];

      // planet + rings (main variant only)
      let onPlanet = false;
      if (P.planet) {
        const pd = Math.acos(Math.min(1, Math.max(-1, dot(d, planetDir))));
        if (pd < pR * 3.2) {
          const px = dot(d, pe1) / pR;
          const py = dot(d, pe2) / pR;
          const rr = Math.hypot(px, py);
          if (rr < 1) {
            onPlanet = true;
            // body: banded gas giant, lit from the star side
            const lit = 0.3 + 0.7 * Math.max(0, 0.35 + 0.65 * (px * 0.75 + py * 0.3));
            const bandT = fbm(px * 1.1, py * 4.6 + 5, 17, 4) * (0.75 + 0.25 * Math.sin(py * 9));
            const swirl = fbm(px * 3.2 + py * 1.4, py * 6.5 + 31, 53, 4);
            const bodyR = (lerp(0.72, 1.5, bandT) + swirl * 0.25) * lit;
            const bodyG = (lerp(0.14, 0.4, bandT) + swirl * 0.1) * lit;
            const bodyB = (lerp(0.9, 1.6, bandT) + swirl * 0.3) * lit;
            // opaque disc with a crisp limb + darkened rim
            const edge = Math.min(1, (1 - rr) / 0.06);
            const rim = 0.55 + 0.45 * Math.min(1, (1 - rr) / 0.22);
            r = lerp(r, bodyR * rim, edge);
            g = lerp(g, bodyG * rim, edge);
            b = lerp(b, bodyB * rim, edge);
          } else {
            // rings: tilted ellipse annulus, brighter on the lit side
            const rot = 0.5;
            const rx = px * Math.cos(rot) + py * Math.sin(rot);
            const ry = (-px * Math.sin(rot) + py * Math.cos(rot)) * 3.4;
            const er = Math.hypot(rx, ry);
            if (er > 1.35 && er < 2.6) {
              const ringT = fbm(er * 6, 3, 9, 3);
              const fade = smooth(Math.min(1, (2.6 - er) / 0.5)) * smooth(Math.min(1, (er - 1.35) / 0.25));
              const lit2 = 0.5 + 0.5 * Math.max(0, px * 0.7 + 0.3);
              const gain = fade * (0.25 + ringT * 0.6) * lit2;
              r += 0.85 * gain;
              g += 0.5 * gain;
              b += 1.0 * gain;
            }
          }
        }
      }

      // stars (skip inside the planet body)
      if (!onPlanet)
      for (let si = 0; si < STARS.length; si++) {
        const st = STARS[si];
        // cheap prefilter on azimuth/elevation distance
        const dv = Math.abs(0.5 - v - st.el / Math.PI);
        if (dv > 0.004) continue;
        let du = Math.abs(u - (st.az / (Math.PI * 2)));
        if (du > 0.5) du = 1 - du;
        if (du * Math.cos(st.el) > 0.004) continue;
        const sdir = dirFromUV(st.az / (Math.PI * 2), 0.5 - st.el / Math.PI);
        const ang = Math.acos(Math.min(1, Math.max(-1, dot(d, sdir))));
        const size = 0.0016 + st.mag * 0.0018;
        if (ang < size * 3) {
          const amp = (0.5 + st.mag * st.mag * 7) * Math.exp((-ang * ang) / (size * size));
          const warm = st.hot > 0.75;
          r += amp * (warm ? 1.0 : 0.8);
          g += amp * (warm ? 0.75 : 0.85);
          b += amp * (warm ? 0.65 : 1.0);
        }
      }

      const idx = (y * W + x) * 3;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
    }
  }
  return buf;
}

// ── RGBE (.hdr) writer: flat scanlines, guarded against RLE misdetection ────
function toRGBE(r, g, b) {
  const m = Math.max(r, g, b);
  if (m < 1e-32) return [0, 0, 0, 0];
  let e = Math.ceil(Math.log2(m));
  let scale = Math.pow(2, -e) * 256;
  if (m * scale >= 256) {
    e += 1;
    scale /= 2;
  }
  return [
    Math.min(255, Math.floor(r * scale)),
    Math.min(255, Math.floor(g * scale)),
    Math.min(255, Math.floor(b * scale)),
    e + 128,
  ];
}

function writeHdr(path, buf, w, h) {
  const header = `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${h} +X ${w}\n`;
  const head = Buffer.from(header, 'ascii');
  const body = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const o = (y * w + x) * 4;
      const [rr, gg, bb, ee] = toRGBE(buf[i], buf[i + 1], buf[i + 2]);
      body[o] = rr;
      body[o + 1] = gg;
      body[o + 2] = bb;
      body[o + 3] = ee;
    }
    // guard: a flat scanline starting 0x02 0x02 with plausible length bytes
    // would be misread as adaptive-RLE; nudge the red mantissa off 2.
    const so = y * w * 4;
    if (body[so] === 2 && body[so + 1] === 2) body[so] = 3;
  }
  writeFileSync(path, Buffer.concat([head, body]));
  console.log('wrote', path, `${((head.length + body.length) / 1e6).toFixed(1)}MB`);
}

function downsample(buf, w, h) {
  const w2 = w / 2,
    h2 = h / 2;
  const out = new Float32Array(w2 * h2 * 3);
  for (let y = 0; y < h2; y++)
    for (let x = 0; x < w2; x++)
      for (let ch = 0; ch < 3; ch++) {
        out[(y * w2 + x) * 3 + ch] =
          (buf[(y * 2 * w + x * 2) * 3 + ch] +
            buf[(y * 2 * w + x * 2 + 1) * 3 + ch] +
            buf[((y * 2 + 1) * w + x * 2) * 3 + ch] +
            buf[((y * 2 + 1) * w + x * 2 + 1) * 3 + ch]) /
          4;
      }
  return out;
}

// tone-map to LDR sRGB for the backdrop webp (matches HDRI_TUNE gain=1)
function toneMap(buf, w, h) {
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    for (let ch = 0; ch < 3; ch++) {
      const x = Math.min(buf[i * 3 + ch], 3.0); // shader clamp
      const t = x / (1 + x); // reinhard
      out[i * 3 + ch] = Math.round(Math.pow(t, 1 / 2.2) * 255);
    }
  }
  return out;
}

// stage runner: `node gen_space_env.mjs <variant> hdr|backdrop` so each
// stage fits a short CI/sandbox execution window.
const variant = process.argv[2];
const stage = process.argv[3] ?? 'hdr';
if (!VARIANTS[variant]) {
  console.error('usage: node gen_space_env.mjs <xenon|xenon_ember> [hdr|backdrop]');
  process.exit(1);
}
if (stage === 'hdr') {
  console.log('rendering', variant, '...');
  const hi = renderVariant(variant);
  writeHdr(`public/env/${variant}_2k.hdr`, hi, W, H);
  const lo = downsample(hi, W, H);
  writeHdr(`public/env/${variant}_1k.hdr`, lo, W / 2, H / 2);
} else {
  // decode the flat-RGBE .hdr back to float, tone-map, write webps
  const { readFileSync } = await import('node:fs');
  const raw = readFileSync(`public/env/${variant}_2k.hdr`);
  const headEnd = raw.indexOf(10, raw.indexOf(10, raw.indexOf(10, raw.indexOf(10) + 1) + 1)) + 1;
  const px = raw.subarray(headEnd);
  const hi = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const e = px[i * 4 + 3];
    const scale = e ? Math.pow(2, e - 128 - 8) : 0;
    hi[i * 3] = px[i * 4] * scale;
    hi[i * 3 + 1] = px[i * 4 + 1] * scale;
    hi[i * 3 + 2] = px[i * 4 + 2] * scale;
  }
  const ldr = toneMap(hi, W, H);
  await sharp(ldr, { raw: { width: W, height: H, channels: 3 } })
    .webp({ quality: 82 })
    .toFile(`public/env/${variant}_backdrop.webp`);
  await sharp(ldr, { raw: { width: W, height: H, channels: 3 } })
    .resize(1024, 512)
    .webp({ quality: 80 })
    .toFile(`public/env/${variant}_backdrop_4k.webp`);
  console.log('wrote backdrops for', variant);
}
console.log('done');
