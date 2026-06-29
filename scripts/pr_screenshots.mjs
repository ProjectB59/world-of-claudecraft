// Captures a small, curated set of canonical screenshots for a pull request so a
// reviewer can see what the change looks like in the running client. Offline only:
// it drives the local Vite dev client (no server, no dev commands) through the shared
// offline entry flow and writes PNGs into SHOTS_DIR for a CI job to upload.
//
// This is deliberately a FIXED tour (character select, desktop HUD, mobile HUD), not a
// per-change capture: it gives every PR a consistent "here is the client right now"
// baseline. Add shots here as the canonical set grows; keep it offline and quick.
//
// Run locally:  npm run dev   (in another terminal, serves :5173)
//               BROWSER_PATH=/path/to/chrome node scripts/pr_screenshots.mjs
// Env:
//   GAME_URL    client URL (default http://localhost:5173)
//   SHOTS_DIR   output directory for PNGs (default pr-shots)
//   BROWSER_PATH  Chrome/Edge/Chromium binary (see browser_path.mjs)

import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { BROWSER_PATH } from './browser_path.mjs';
import { enterOfflineGame } from './enter_offline_game.mjs';

const URL = process.env.GAME_URL ?? 'http://localhost:5173';
const OUT = process.env.SHOTS_DIR ?? 'pr-shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: BROWSER_PATH,
  // Software GL so it runs on a headless CI box with no GPU, matching the other tours.
  headless: 'new',
  args: ['--window-size=1600,900', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1600, height: 900 },
});

const errors = [];
const captured = [];

// One guarded shot: a failure in one frame must not lose the others, so the tour
// always uploads whatever it managed to capture.
async function shoot(page, name) {
  try {
    await new Promise((r) => setTimeout(r, 300));
    const file = `${OUT}/${name}.png`;
    await page.screenshot({ path: file });
    captured.push(`${name}.png`);
    console.log('shot:', file);
  } catch (e) {
    errors.push(`SHOT ${name}: ${e.message}`);
  }
}

function watch(page, tag) {
  page.on('pageerror', (e) => errors.push(`PAGEERROR(${tag}): ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`CONSOLE(${tag}): ${m.text()}`);
  });
}

try {
  // 1) Character-select landing (desktop): open the offline select so the class cards show.
  const page = await browser.newPage();
  watch(page, 'desktop');
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => document.querySelector('#btn-offline')?.click());
  await page
    .waitForSelector('#offline-select .mini-class', { visible: true, timeout: 15000 })
    .catch(() => {});
  await shoot(page, '01-character-select');

  // 2) Desktop HUD in-world.
  await enterOfflineGame(page, { charClass: 'warrior', charName: 'Thorgar', settleMs: 3000 });
  await shoot(page, '02-hud-desktop');
  await page.close();

  // 3) Mobile-viewport HUD (iPhone-class touch viewport).
  try {
    const mobile = await browser.newPage();
    watch(mobile, 'mobile');
    await mobile.emulate({
      viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    await mobile.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
    await mobile.evaluate(() => document.body.classList.add('mobile-touch'));
    await enterOfflineGame(mobile, { charClass: 'mage', charName: 'Aldwin', settleMs: 3000 });
    await shoot(mobile, '03-hud-mobile');
    await mobile.close();
  } catch (e) {
    errors.push(`MOBILE: ${e.message}`);
  }
} finally {
  await browser.close();
}

// Record the manifest so the comment step can list what was captured without re-reading.
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify({ captured, errors }, null, 2));

if (errors.length) console.log('notes during capture:\n' + errors.join('\n'));
console.log(`captured ${captured.length} screenshot(s) into ${OUT}/`);
// Non-zero only if we got nothing at all, so a partial tour still uploads its frames.
process.exit(captured.length > 0 ? 0 : 1);
