/**
 * src/ui/arcade_minigame.ts — the Xenon arcade cabinet minigames.
 *
 * Five self-contained, client-only canvas games that open as an overlay when
 * the player clicks an arcade cabinet. Each cabinet in the world carries a
 * userData.gameId so different machines run different games. No sim, no
 * network, no persistence beyond per-game session high scores. Space Quest
 * fans: yes, the currency is buckazoids.
 *
 * Input is captured on window (capture phase) while the overlay is open so
 * WASD/space/arrows never leak into character movement underneath.
 */

let overlay: HTMLDivElement | null = null;
let raf = 0;
const sessionHigh: Record<number, number> = {};

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

interface GameDef {
  title: string;
  hint: string;
  start: (canvas: HTMLCanvasElement, gameId: number) => void;
}

/** Shared frame-loop plumbing: runs step/draw until the overlay closes. */
function runLoop(step: (dt: number) => void, draw: () => void): void {
  let last = performance.now();
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

function hud(ctx: CanvasRenderingContext2D, left: string, right: string, W: number): void {
  ctx.fillStyle = '#efe2ff';
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(left, 10, 20);
  ctx.textAlign = 'right';
  ctx.fillText(right, W - 10, 20);
  ctx.textAlign = 'left';
}

function gameOverCard(ctx: CanvasRenderingContext2D, W: number, H: number, line: string): void {
  ctx.fillStyle = '#ff3db8';
  ctx.font = '700 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(line, W / 2, H / 2 - 10);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#9c82bd';
  ctx.fillText('Enter: insert another buckazoid', W / 2, H / 2 + 18);
  ctx.textAlign = 'left';
}

function starfield(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.fillStyle = '#03010a';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, (i * 233) % H, 1, 1);
}

// ── Game 0: BUCKAZOIDS (asteroids) ───────────────────────────────────────────

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

function startBuckazoids(canvas: HTMLCanvasElement, gameId: number): void {
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

  function spawnRock(r: number, x?: number, y?: number): Rock {
    const edge = Math.random() < 0.5;
    const px = x ?? (edge ? (Math.random() < 0.5 ? -r : W + r) : Math.random() * W);
    const py = y ?? (edge ? Math.random() * H : Math.random() < 0.5 ? -r : H + r);
    const a = Math.random() * Math.PI * 2;
    const sp = 26 + Math.random() * 34 + wave * 6;
    const verts: number[] = [];
    for (let i = 0; i < 9; i++) verts.push(0.72 + Math.random() * 0.45);
    return { x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, spin: (Math.random() - 0.5) * 1.6, ang: 0, verts };
  }
  function newWave(): void {
    wave++;
    rocks = [];
    for (let i = 0; i < 3 + wave; i++) rocks.push(spawnRock(26 + Math.random() * 14));
    ship.inv = 2;
  }
  newWave();

  runLoop(
    (dt) => {
      if (!over) {
        const turn =
          (keys.has('ArrowLeft') || keys.has('KeyA') ? -1 : 0) +
          (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0);
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
              sessionHigh[gameId] = Math.max(sessionHigh[gameId] ?? 0, score);
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
    },
    () => {
      starfield(ctx, W, H);
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
          if (i === 0) ctx.moveTo(Math.cos(a) * r.r * v, Math.sin(a) * r.r * v);
          else ctx.lineTo(Math.cos(a) * r.r * v, Math.sin(a) * r.r * v);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#ff3db8';
      for (const s of shots) ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
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
      hud(ctx, `${score} buckazoids · ships ${'▲'.repeat(Math.max(0, lives))}`, `wave ${wave}${sessionHigh[gameId] ? ` · high ${sessionHigh[gameId]}` : ''}`, W);
      if (over) gameOverCard(ctx, W, H, 'GAME OVER, JANITOR');
    },
  );
}

// ── Game 1: PLASMA PONG ──────────────────────────────────────────────────────

function startPong(canvas: HTMLCanvasElement, gameId: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const PW = 10;
  const PH = 64;
  const p = { y: H / 2 };
  const ai = { y: H / 2 };
  const ball = { x: W / 2, y: H / 2, vx: 220, vy: 90 };
  let ps = 0;
  let as = 0;
  let over = false;

  function serve(dir: number): void {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.vx = 220 * dir;
    ball.vy = (Math.random() - 0.5) * 220;
  }

  runLoop(
    (dt) => {
      if (over) {
        if (keys.has('Enter')) {
          ps = 0;
          as = 0;
          over = false;
          serve(1);
        }
        return;
      }
      const move =
        (keys.has('ArrowUp') || keys.has('KeyW') ? -1 : 0) +
        (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0);
      p.y = Math.max(PH / 2, Math.min(H - PH / 2, p.y + move * 340 * dt));
      // AI tracks with a capped speed so it stays beatable.
      const want = ball.y - ai.y;
      ai.y += Math.max(-230 * dt, Math.min(230 * dt, want));
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.y < 6 || ball.y > H - 6) ball.vy *= -1;
      if (ball.x < 22 && Math.abs(ball.y - p.y) < PH / 2 + 6 && ball.vx < 0) {
        ball.vx = Math.abs(ball.vx) * 1.045;
        ball.vy += ((ball.y - p.y) / (PH / 2)) * 160;
      }
      if (ball.x > W - 22 && Math.abs(ball.y - ai.y) < PH / 2 + 6 && ball.vx > 0) {
        ball.vx = -Math.abs(ball.vx) * 1.045;
        ball.vy += ((ball.y - ai.y) / (PH / 2)) * 140;
      }
      if (ball.x < -10) {
        as++;
        serve(1);
      }
      if (ball.x > W + 10) {
        ps++;
        serve(-1);
      }
      if (ps >= 7 || as >= 7) {
        over = true;
        sessionHigh[gameId] = Math.max(sessionHigh[gameId] ?? 0, ps);
      }
    },
    () => {
      starfield(ctx, W, H);
      ctx.strokeStyle = 'rgba(64,255,154,0.35)';
      ctx.setLineDash([6, 10]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#40ff9a';
      ctx.fillRect(12, p.y - PH / 2, PW, PH);
      ctx.fillStyle = '#ff3db8';
      ctx.fillRect(W - 12 - PW, ai.y - PH / 2, PW, PH);
      ctx.fillStyle = '#2cd4f2';
      ctx.fillRect(ball.x - 5, ball.y - 5, 10, 10);
      hud(ctx, `you ${ps}`, `cpu ${as}`, W);
      if (over) gameOverCard(ctx, W, H, ps > as ? 'YOU WIN, PILOT' : 'CPU WINS');
    },
  );
}

// ── Game 2: HULL BREAKER (breakout) ──────────────────────────────────────────

function startBreaker(canvas: HTMLCanvasElement, gameId: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const COLS = 10;
  const ROWS = 5;
  const BW = (W - 40) / COLS;
  const BH = 18;
  const colors = ['#ff3db8', '#8a3dff', '#2cd4f2', '#40ff9a', '#ffb020'];
  const paddle = { x: W / 2, w: 84 };
  const ball = { x: W / 2, y: H - 90, vx: 170, vy: -230, stuck: false };
  let bricks: boolean[] = [];
  let score = 0;
  let lives = 3;
  let level = 0;
  let over = false;

  function newLevel(): void {
    level++;
    bricks = new Array(COLS * ROWS).fill(true) as boolean[];
    ball.x = paddle.x;
    ball.y = H - 90;
    ball.vx = 150 + level * 25;
    ball.vy = -(210 + level * 25);
  }
  newLevel();

  runLoop(
    (dt) => {
      if (over) {
        if (keys.has('Enter')) {
          score = 0;
          lives = 3;
          level = 0;
          over = false;
          newLevel();
        }
        return;
      }
      const move =
        (keys.has('ArrowLeft') || keys.has('KeyA') ? -1 : 0) +
        (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0);
      paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.x + move * 420 * dt));
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x < 6 || ball.x > W - 6) ball.vx *= -1;
      if (ball.y < 6) ball.vy = Math.abs(ball.vy);
      if (
        ball.vy > 0 &&
        ball.y > H - 26 &&
        ball.y < H - 12 &&
        Math.abs(ball.x - paddle.x) < paddle.w / 2 + 6
      ) {
        ball.vy = -Math.abs(ball.vy);
        ball.vx += ((ball.x - paddle.x) / (paddle.w / 2)) * 150;
      }
      // brick hits
      const bx = Math.floor((ball.x - 20) / BW);
      const by = Math.floor((ball.y - 40) / BH);
      if (bx >= 0 && bx < COLS && by >= 0 && by < ROWS && bricks[by * COLS + bx]) {
        bricks[by * COLS + bx] = false;
        score += 10 * level;
        ball.vy *= -1;
      }
      if (ball.y > H + 12) {
        lives--;
        if (lives <= 0) {
          over = true;
          sessionHigh[gameId] = Math.max(sessionHigh[gameId] ?? 0, score);
        } else {
          ball.x = paddle.x;
          ball.y = H - 90;
          ball.vx = 150 + level * 25;
          ball.vy = -(210 + level * 25);
        }
      }
      if (bricks.every((b) => !b)) newLevel();
    },
    () => {
      starfield(ctx, W, H);
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (bricks[r * COLS + c]) {
            ctx.fillStyle = colors[r % colors.length];
            ctx.fillRect(20 + c * BW + 1, 40 + r * BH + 1, BW - 2, BH - 2);
          }
      ctx.fillStyle = '#40ff9a';
      ctx.fillRect(paddle.x - paddle.w / 2, H - 20, paddle.w, 8);
      ctx.fillStyle = '#2cd4f2';
      ctx.fillRect(ball.x - 5, ball.y - 5, 10, 10);
      hud(ctx, `${score} buckazoids · hulls ${'▲'.repeat(Math.max(0, lives))}`, `deck ${level}`, W);
      if (over) gameOverCard(ctx, W, H, 'HULL LOST');
    },
  );
}

// ── Game 3: COOLANT SNAKE ────────────────────────────────────────────────────

function startSnake(canvas: HTMLCanvasElement, gameId: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const CELL = 20;
  const GW = Math.floor(W / CELL);
  const GH = Math.floor(H / CELL);
  let snake = [{ x: Math.floor(GW / 2), y: Math.floor(GH / 2) }];
  let dir = { x: 1, y: 0 };
  let pending = dir;
  let food = { x: 5, y: 5 };
  let score = 0;
  let acc = 0;
  let over = false;

  function placeFood(): void {
    do {
      food = { x: Math.floor(Math.random() * GW), y: Math.floor(Math.random() * GH) };
    } while (snake.some((s) => s.x === food.x && s.y === food.y));
  }
  placeFood();

  runLoop(
    (dt) => {
      if (keys.has('ArrowUp') || keys.has('KeyW')) pending = dir.y !== 1 ? { x: 0, y: -1 } : pending;
      if (keys.has('ArrowDown') || keys.has('KeyS')) pending = dir.y !== -1 ? { x: 0, y: 1 } : pending;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) pending = dir.x !== 1 ? { x: -1, y: 0 } : pending;
      if (keys.has('ArrowRight') || keys.has('KeyD')) pending = dir.x !== -1 ? { x: 1, y: 0 } : pending;
      if (over) {
        if (keys.has('Enter')) {
          snake = [{ x: Math.floor(GW / 2), y: Math.floor(GH / 2) }];
          dir = { x: 1, y: 0 };
          pending = dir;
          score = 0;
          over = false;
          placeFood();
        }
        return;
      }
      acc += dt;
      const speed = Math.max(0.055, 0.13 - score * 0.002);
      if (acc < speed) return;
      acc = 0;
      dir = pending;
      const head = { x: (snake[0].x + dir.x + GW) % GW, y: (snake[0].y + dir.y + GH) % GH };
      if (snake.some((s) => s.x === head.x && s.y === head.y)) {
        over = true;
        sessionHigh[gameId] = Math.max(sessionHigh[gameId] ?? 0, score);
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score++;
        placeFood();
      } else {
        snake.pop();
      }
    },
    () => {
      starfield(ctx, W, H);
      ctx.fillStyle = '#ffb020';
      ctx.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#40ff9a' : '#2cd4f2';
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      });
      hud(ctx, `${score} coolant cells`, sessionHigh[gameId] ? `high ${sessionHigh[gameId]}` : '', W);
      if (over) gameOverCard(ctx, W, H, 'COOLANT LEAK');
    },
  );
}

// ── Game 4: XENON DEFENSE (invaders) ─────────────────────────────────────────

function startDefense(canvas: HTMLCanvasElement, gameId: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const COLS = 8;
  const ROWS = 4;
  const ship = { x: W / 2, cd: 0 };
  let alive: boolean[] = [];
  let ax = 0;
  let ay = 0;
  let adir = 1;
  let shots: { x: number; y: number }[] = [];
  let bombs: { x: number; y: number }[] = [];
  let score = 0;
  let lives = 3;
  let wave = 0;
  let over = false;

  function newWave(): void {
    wave++;
    alive = new Array(COLS * ROWS).fill(true) as boolean[];
    ax = 0;
    ay = 0;
    adir = 1;
    bombs = [];
  }
  newWave();

  function alienPos(i: number): { x: number; y: number } {
    return { x: 60 + (i % COLS) * 56 + ax, y: 50 + Math.floor(i / COLS) * 38 + ay };
  }

  runLoop(
    (dt) => {
      if (over) {
        if (keys.has('Enter')) {
          score = 0;
          lives = 3;
          wave = 0;
          over = false;
          shots = [];
          newWave();
        }
        return;
      }
      const move =
        (keys.has('ArrowLeft') || keys.has('KeyA') ? -1 : 0) +
        (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0);
      ship.x = Math.max(20, Math.min(W - 20, ship.x + move * 320 * dt));
      ship.cd -= dt;
      if (keys.has('Space') && ship.cd <= 0) {
        ship.cd = 0.4;
        shots.push({ x: ship.x, y: H - 44 });
      }
      const speed = (26 + wave * 8 + (COLS * ROWS - alive.filter(Boolean).length) * 2) * dt;
      ax += adir * speed;
      const liveIdx = alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
      const xs = liveIdx.map((i) => alienPos(i).x);
      if (Math.max(...xs, 0) > W - 40 || Math.min(...xs, W) < 30) {
        adir *= -1;
        ay += 16;
      }
      for (const s of shots) s.y -= 420 * dt;
      shots = shots.filter((s) => s.y > -10);
      for (const i of liveIdx) {
        const p = alienPos(i);
        for (let j = 0; j < shots.length; j++) {
          if (Math.abs(shots[j].x - p.x) < 18 && Math.abs(shots[j].y - p.y) < 14) {
            alive[i] = false;
            shots.splice(j, 1);
            score += 10 + Math.floor(i / COLS) * 5;
            break;
          }
        }
        if (Math.random() < 0.25 * dt) bombs.push({ x: p.x, y: p.y + 12 });
        if (p.y > H - 70) over = true;
      }
      for (const b of bombs) b.y += (130 + wave * 18) * dt;
      bombs = bombs.filter((b) => {
        if (b.y > H) return false;
        if (Math.abs(b.x - ship.x) < 14 && b.y > H - 40 && b.y < H - 20) {
          lives--;
          if (lives <= 0) over = true;
          return false;
        }
        return true;
      });
      if (over) sessionHigh[gameId] = Math.max(sessionHigh[gameId] ?? 0, score);
      if (liveIdx.length === 0) newWave();
    },
    () => {
      starfield(ctx, W, H);
      ctx.fillStyle = '#c9a0ff';
      for (let i = 0; i < COLS * ROWS; i++) {
        if (!alive[i]) continue;
        const p = alienPos(i);
        ctx.fillRect(p.x - 12, p.y - 8, 24, 12);
        ctx.fillRect(p.x - 16, p.y - 2, 4, 8);
        ctx.fillRect(p.x + 12, p.y - 2, 4, 8);
      }
      ctx.fillStyle = '#40ff9a';
      ctx.fillRect(ship.x - 14, H - 32, 28, 10);
      ctx.fillRect(ship.x - 3, H - 40, 6, 8);
      ctx.fillStyle = '#2cd4f2';
      for (const s of shots) ctx.fillRect(s.x - 1.5, s.y - 6, 3, 10);
      ctx.fillStyle = '#ff3db8';
      for (const b of bombs) ctx.fillRect(b.x - 2, b.y - 5, 4, 10);
      hud(ctx, `${score} buckazoids · domes ${'▲'.repeat(Math.max(0, lives))}`, `wave ${wave}`, W);
      if (over) gameOverCard(ctx, W, H, 'COLONY OVERRUN');
    },
  );
}

// ── Cabinet registry + overlay chrome ────────────────────────────────────────

const GAMES: GameDef[] = [
  { title: 'B U C K A Z O I D S', hint: 'WASD / arrows: fly - Space: fire - Esc: walk away', start: startBuckazoids },
  { title: 'P L A S M A  P O N G', hint: 'W/S or arrows: paddle - first to 7 - Esc: walk away', start: startPong },
  { title: 'H U L L  B R E A K E R', hint: 'A/D or arrows: paddle - Esc: walk away', start: startBreaker },
  { title: 'C O O L A N T  S N A K E', hint: 'WASD / arrows: steer - Esc: walk away', start: startSnake },
  { title: 'X E N O N  D E F E N S E', hint: 'A/D: move - Space: fire - Esc: walk away', start: startDefense },
];

export function openArcadeMinigame(gameId = 0): void {
  if (overlay) return;
  const game = GAMES[gameId % GAMES.length];

  overlay = document.createElement('div');
  overlay.id = 'arcade-minigame';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', `${game.title} arcade game`);
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;' +
    'background:rgba(4,1,10,0.82);backdrop-filter:blur(3px);';

  const frame = document.createElement('div');
  frame.style.cssText =
    'position:relative;padding:14px 14px 10px;border:2px solid #ff3db8;border-radius:10px;' +
    'background:linear-gradient(170deg,#180a28 0%,#0c0416 100%);' +
    'box-shadow:0 0 24px rgba(255,61,184,0.45),0 0 64px rgba(138,61,255,0.25);';

  const title = document.createElement('div');
  title.textContent = game.title;
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
  hint.textContent = game.hint;
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

  game.start(canvas, gameId % GAMES.length);
}
