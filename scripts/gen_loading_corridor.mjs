// scripts/gen_loading_corridor.mjs — placeholder pixel-art loading screen:
// station corridor, window onto space, janitor's cart, caution sign.
// Kat's hand-picked art can replace public/space/loading-corridor.png anytime.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const W = 512, H = 288, S = 3; // upscale x3 nearest -> 1536x864
const px = Buffer.alloc(W * H * 3);
function put(x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = r; px[i + 1] = g; px[i + 2] = b;
}
function rect(x0, y0, w, h, r, g, b) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, r, g, b);
}
function rnd(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rnd(59);

// corridor: concentric shrinking frames toward the far wall
const cx = W / 2, cy = H / 2 - 8;
const frames = 9;
for (let f = frames; f >= 0; f--) {
  const t = f / frames; // 1 = nearest
  const hw = 40 + t * (W / 2 - 40);
  const hh = 26 + t * (H / 2 - 26);
  const shade = 0.42 + 0.58 * t;
  const base = [Math.round(38 * shade), Math.round(42 * shade), Math.round(74 * shade)];
  rect(Math.round(cx - hw), Math.round(cy - hh), Math.round(hw * 2), Math.round(hh * 2), base[0], base[1], base[2]);
  // panel seams
  const seam = [Math.round(24 * shade), Math.round(26 * shade), Math.round(52 * shade)];
  for (let y = Math.round(cy - hh); y < cy + hh; y += 2) { put(Math.round(cx - hw), y, ...seam); put(Math.round(cx + hw) - 1, y, ...seam); }
  for (let x = Math.round(cx - hw); x < cx + hw; x += 2) { put(x, Math.round(cy - hh), ...seam); put(x, Math.round(cy + hh) - 1, ...seam); }
  // neon strips at the wall/ceiling + wall/floor corners
  if (f < frames) {
    const glow = [120 + Math.round(120 * t), 220, 255];
    for (const yy of [Math.round(cy - hh) + 3, Math.round(cy + hh) - 4]) {
      for (let x = Math.round(cx - hw) + 4; x < cx + hw - 4; x++) if ((x + f) % 7 !== 0) put(x, yy, ...glow);
    }
  }
}
// floor: darker with perspective planks
for (let y = Math.round(cy + 26); y < H; y++) {
  const t = (y - (cy + 26)) / (H - (cy + 26));
  const sh = 0.5 + t * 0.5;
  for (let x = 0; x < W; x++) {
    const d = Math.abs(x - cx) / (W / 2);
    if (d > 0.16 + t * 0.84) continue;
    const v = [Math.round(30 * sh), Math.round(32 * sh), Math.round(58 * sh)];
    if ((Math.abs(x - cx) * 8 / (1 + t * 6)) % 16 < 1.2) { v[0] += 14; v[1] += 14; v[2] += 20; }
    put(x, y, v[0], v[1], v[2]);
  }
}

// far window onto space
const wx = Math.round(cx - 40), wy = Math.round(cy - 26), ww = 80, wh = 52;
rect(wx, wy, ww, wh, 3, 2, 12);
for (let i = 0; i < 110; i++) {
  const x = wx + Math.floor(R() * ww), y = wy + Math.floor(R() * wh);
  const b = 140 + Math.floor(R() * 115);
  put(x, y, b, b, Math.min(255, b + 20));
}
// little spiral galaxy
const gx = wx + 56, gy = wy + 14;
for (let a = 0; a < 40; a++) {
  const ang = a * 0.5, rad = a * 0.35;
  put(Math.round(gx + Math.cos(ang) * rad), Math.round(gy + Math.sin(ang) * rad * 0.6), 220, 120, 240);
}
rect(gx - 1, gy - 1, 3, 2, 255, 210, 255);
// planet limb at window bottom
for (let x = wx; x < wx + ww; x++) {
  const t = (x - wx) / ww;
  const yTop = wy + wh - 10 + Math.round(Math.sin(t * Math.PI) * -6);
  for (let y = yTop; y < wy + wh; y++) {
    const d = (y - yTop) / 10;
    put(x, y, Math.round(90 + 60 * d), Math.round(40 + 30 * d), Math.round(130 + 60 * d));
  }
}
// window frame
for (let x = wx - 2; x < wx + ww + 2; x++) for (const y of [wy - 2, wy - 1, wy + wh, wy + wh + 1]) put(x, y, 70, 78, 110);
for (let y = wy - 2; y < wy + wh + 2; y++) for (const x of [wx - 2, wx - 1, wx + ww, wx + ww + 1]) put(x, y, 70, 78, 110);
for (let y = wy; y < wy + wh; y++) put(Math.round(cx), y, 60, 66, 96); // mullion

// janitor's cart (right of centre, mid-ground)
const kx = Math.round(cx + 28), ky = Math.round(cy + 34);
rect(kx, ky, 34, 22, 132, 138, 152);           // cart body
rect(kx + 2, ky + 3, 30, 3, 96, 100, 112);     // shelf lines
rect(kx + 2, ky + 10, 30, 3, 96, 100, 112);
rect(kx - 1, ky - 3, 36, 3, 150, 156, 170);    // top rim
rect(kx + 3, ky + 22, 4, 4, 40, 42, 52); rect(kx + 27, ky + 22, 4, 4, 40, 42, 52); // wheels
rect(kx + 24, ky - 8, 8, 6, 200, 40, 40);      // red bucket
rect(kx + 26, ky - 10, 4, 2, 230, 90, 90);
rect(kx + 6, ky - 16, 2, 14, 150, 100, 60);    // mop handle
rect(kx + 3, ky - 20, 8, 5, 220, 220, 210);    // mop head
// caution sign
const sx2 = kx + 44, sy2 = ky + 12;
for (let i = 0; i < 12; i++) rect(sx2 + 5 - Math.round(i * 0.45), sy2 + i, Math.max(1, Math.round(i * 0.9)), 1, 250, 210, 40);
rect(sx2 + 1, sy2 + 12, 10, 2, 250, 210, 40);
rect(sx2 + 4, sy2 + 5, 3, 4, 30, 26, 10);

mkdirSync('public/space', { recursive: true });
await sharp(px, { raw: { width: W, height: H, channels: 3 } })
  .resize(W * S, H * S, { kernel: 'nearest' })
  .png()
  .toFile('public/space/loading-corridor.png');
console.log('wrote public/space/loading-corridor.png');
