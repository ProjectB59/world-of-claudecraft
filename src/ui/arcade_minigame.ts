/**
 * src/ui/arcade_minigame.ts — "BUCKAZOIDS" arcade cabinet minigame.
 *
 * A self-contained, client-only asteroid shooter that opens as an overlay
 * when the player clicks one of the Xenon arcade cabinets. No sim, no
 * network, no persistence beyond a session high score. Space Quest fans:
 * yes, the currency is buckazoids.
 *
 * Input is captured on window (capture phase) while the overlay is open so
 * WASD/space never leak into character movement underneath.
 */

let overlay: HTMLDivElement | null = null;
let raf = 0;
let sessionHigh = 0;

export function isArcadeOpen(): boolean {
  return overlay !== null;
}

export function closeArcadeMinigame(): void {
  if (!overlay) return;
  cancelAnimationFrame(raf);
  window.removeEventListener('keydown', keyCapture, true);
  window.removeEventListener('keyup', keyCapture, true);
  overlay.remove();
  overlay = null;
}

const keys = new Set<string>();
function keyCapture(e: KeyboardEvent): void {
  if (!overlay) return;
  e.stopPropagation();
  if (e.type === 'keydown') {
    if (e.code === 'Escape') {
      closeArcadeMinigame();
      return;
    }
    keys.add(e.code);
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  } else {
    keys.delete(e.code);
  }
}

interface Rock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  spin: number;
  ang: number;
  verts: number[];
}
interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export function openArcadeMinigame(): void {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.id = 'arcade-minigame';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Buckazoids arcade game');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;' +
    'background:rgba(4,1,10,0.82);backdrop-filter:blur(3px);';

  const frame = document.createElement('div');
  frame.style.cssText =
    'position:relative;padding:14px 14px 10px;border:2px solid #ff3db8;border-radius:10px;' +
    'background:linear-gradient(170deg,#180a28 0%,#0c0416 100%);' +
    'box-shadow:0 0 24px rgba(255,61,184,0.45),0 0 64px rgba(138,61,255,0.25);';

  const title = document.createElement('div');
  title.textContent = 'B U C K A Z O I D S';
  title.style.cssText =
    'text-align:center;font:700 18px monospace;letter-spacing:4px;color:#ff3db8;' +
    'text-shadow:0 0 8px rgba(255,61,184,0.8);margin-bottom:8px;';
  frame.appendChild(title);

  const canvas = document.createElement('canvas');
  canvas.width = 560;
  canvas.height = 420;
  canvas.style.cssText = 'display:block;background:#03010a;border:1px solid #55307a;border-radius:4px;';
  frame.appendChild(canvas);

  const hint = document.createElement('div');
  hint.textContent = 'WASD / arrows: fly - Space: fire - Esc: walk away';
  hint.style.cssText = 'text-align:center;font:12px monospace;color:#9c82bd;margin-top:6px;';
  frame.appendChild(hint);

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '✕';
  close.setAttribute('aria-label', 'Close');
  close.style.cssText =
    'position:absolute;top:6px;right:8px;background:none;border:none;color:#ff3db8;' +
    'font:16px monospace;cursor:pointer;';
  close.addEventListener('click', closeArcadeMinigame);
  frame.appendChild(close);

  overlay.appendChild(frame);
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) closeArcadeMinigame();
  });
  document.body.appendChild(overlay);

  window.addEventListener('keydown', keyCapture, true);
  window.addEventListener('keyup', keyCapture, true);

  // ── game state ────────────────────────────────────────────────────────────
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, ang: -Math.PI / 2, cd: 0, inv: 2 };
  let rocks: Rock[] = [];
  let shots: Shot[] = [];
  let score = 0;
  let lives = 3;
  let wave = 0;
  let over = false;
  let last = performance.now();

  function spawnRock(r: number, x?: number, y?: number): Rock {
    const edge = Math.random() < 0.5;
    const px = x ?? (edge ? (Math.random() < 0.5 ? -r : W + r) : Math.random() * W);
    const py = y ?? (edge ? Math.random() * H : Math.random() < 0.5 ? -r : H + r);
    const a = Math.random() * Math.PI * 2;
    const sp = 26 + Math.random() * 34 + wave * 6;
    const verts: number[] = [];
    for (let i = 0; i < 9; i++) verts.push(0.72 + Math.random() * 0.45);
    return {
      x: px,
      y: py,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      r,
      spin: (Math.random() - 0.5) * 1.6,
      ang: 0,
      verts,
    };
  }

  function newWave(): void {
    wave++;
    rocks = [];
    for (let i = 0; i < 3 + wave; i++) rocks.push(spawnRock(26 + Math.random() * 14));
    ship.inv = 2;
  }
  newWave();

  function step(dt: number): void {
    if (!over) {
      // ship
      const turn = (keys.has('ArrowLeft') || keys.has('KeyA') ? -1 : 0) + (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0);
      ship.ang += turn * 3.6 * dt;
      const thrust = keys.has('ArrowUp') || keys.has('KeyW') ? 190 : 0;
      ship.vx += Math.cos(ship.ang) * thrust * dt;
      ship.vy += Math.sin(ship.ang) * thrust * dt;
      ship.vx *= 1 - 0.6 * dt;
      ship.vy *= 1 - 0.6 * dt;
      ship.x = (ship.x + ship.vx * dt + W) % W;
      ship.y = (ship.y + ship.vy * dt + H) % H;
      ship.cd -= dt;
      ship.inv -= dt;
      if (keys.has('Space') && ship.cd <= 0) {
        ship.cd = 0.22;
        shots.push({
          x: ship.x + Math.cos(ship.ang) * 12,
          y: ship.y + Math.sin(ship.ang) * 12,
          vx: Math.cos(ship.ang) * 380 + ship.vx,
          vy: Math.sin(ship.ang) * 380 + ship.vy,
          life: 1.1,
        });
      }
    }

    for (const s of shots) {
      s.x = (s.x + s.vx * dt + W) % W;
      s.y = (s.y + s.vy * dt + H) % H;
      s.life -= dt;
    }
    shots = shots.filter((s) => s.life > 0);

    for (const r of rocks) {
      r.x = (r.x + r.vx * dt + W + r.r * 2) % (W + r.r * 2);
      r.y = (r.y + r.vy * dt + H + r.r * 2) % (H + r.r * 2);
      r.ang += r.spin * dt;
    }

    // collisions
    const burst: Rock[] = [];
    rocks = rocks.filter((r) => {
      for (let i = 0; i < shots.length; i++) {
        const s = shots[i];
        const dx = s.x - (r.x - r.r);
        const dy = s.y - (r.y - r.r);
        if (dx * dx + dy * dy < r.r * r.r) {
          shots.splice(i, 1);
          score += r.r > 22 ? 20 : r.r > 13 ? 50 : 100;
          if (r.r > 13) {
            burst.push(spawnRock(r.r * 0.55, r.x - r.r, r.y - r.r));
            burst.push(spawnRock(r.r * 0.55, r.x - r.r, r.y - r.r));
          }
          return false;
        }
      }
      return true;
    });
    rocks.push(...burst);

    if (!over && ship.inv <= 0) {
      for (const r of rocks) {
        const dx = ship.x - (r.x - r.r);
        const dy = ship.y - (r.y - r.r);
        const rr = r.r + 9;
        if (dx * dx + dy * dy < rr * rr) {
          lives--;
          ship.x = W / 2;
          ship.y = H / 2;
          ship.vx = 0;
          ship.vy = 0;
          ship.inv = 2.2;
          if (lives <= 0) {
            over = true;
            sessionHigh = Math.max(sessionHigh, score);
          }
          break;
        }
      }
    }

    if (rocks.length === 0 && !over) newWave();
    if (over && keys.has('Enter')) {
      score = 0;
      lives = 3;
      wave = 0;
      over = false;
      shots = [];
      newWave();
    }
  }

  function draw(): void {
    if (!ctx) return;
    ctx.fillStyle = '#03010a';
    ctx.fillRect(0, 0, W, H);

    // starfield
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97) % W;
      const sy = (i * 233) % H;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // rocks
    ctx.strokeStyle = '#c9a0ff';
    ctx.lineWidth = 1.5;
    for (const r of rocks) {
      ctx.save();
      ctx.translate(r.x - r.r, r.y - r.r);
      ctx.rotate(r.ang);
      ctx.beginPath();
      for (let i = 0; i <= r.verts.length; i++) {
        const v = r.verts[i % r.verts.length];
        const a = (i / r.verts.length) * Math.PI * 2;
        const px = Math.cos(a) * r.r * v;
        const py = Math.sin(a) * r.r * v;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // shots
    ctx.fillStyle = '#ff3db8';
    for (const s of shots) ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);

    // ship
    if (!over && (ship.inv <= 0 || Math.floor(ship.inv * 10) % 2 === 0)) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.ang);
      ctx.strokeStyle = '#40ff9a';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-9, 8);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-9, -8);
      ctx.closePath();
      ctx.stroke();
      if (keys.has('ArrowUp') || keys.has('KeyW')) {
        ctx.strokeStyle = '#ffb020';
        ctx.beginPath();
        ctx.moveTo(-7, 3);
        ctx.lineTo(-14 - Math.random() * 5, 0);
        ctx.lineTo(-7, -3);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.fillStyle = '#efe2ff';
    ctx.font = '14px monospace';
    ctx.fillText(`${score} bz`, 10, 20);
    ctx.fillText(`ships ${'▲'.repeat(Math.max(0, lives))}`, 10, 38);
    ctx.fillText(`wave ${wave}`, W - 80, 20);
    if (sessionHigh > 0) ctx.fillText(`high ${sessionHigh} bz`, W - 120, 38);

    if (over) {
      ctx.fillStyle = '#ff3db8';
      ctx.font = '700 26px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER, JANITOR', W / 2, H / 2 - 10);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#9c82bd';
      ctx.fillText('Enter: insert another buckazoid', W / 2, H / 2 + 18);
      ctx.textAlign = 'left';
    }
  }

  function loop(now: number): void {
    if (!overlay) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    step(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
}
