// Browser E2E + screenshots for the curated Guide (/guide). Needs `npm run dev`.
// Override the base with GUIDE_URL= (default http://localhost:5173).
// Confirms the SPA mounts, client-side routing works, focus moves to <main>, and the
// page is free of console/page errors. Writes screenshots (desktop + mobile) to tmp/.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { BROWSER_PATH } from './browser_path.mjs';

const BASE = process.env.GUIDE_URL ?? 'http://localhost:5173';
mkdirSync('tmp', { recursive: true });

let fail = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  ${extra}` : ''}`);
  if (!cond) fail++;
};

const browser = await puppeteer.launch({
  executablePath: BROWSER_PATH,
  headless: 'new',
  args: ['--use-angle=swiftshader', '--no-sandbox'],
});

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  // Home / overview.
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/guide`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.guide-hero-title', { timeout: 8000 });
  const heroText = await page.$eval('.guide-hero-title', (el) => el.textContent.trim());
  check('home hero renders', /World of ClaudeCraft/i.test(heroText), heroText);
  check('top nav present', (await page.$$('.guide-nav-link')).length >= 4);
  check('Play CTA points at /play', (await page.$eval('.guide-cta', (el) => el.getAttribute('href'))) === '/play');
  check('home hides the docs sidebar', await page.$eval('#guide-sidebar', (el) => el.hidden));
  check('html lang set', (await page.$eval('html', (el) => el.lang)).length > 0);
  check('what-it-is pillars (3)', (await page.$$('.guide-pillar')).length === 3);
  check('nine class chips', (await page.$$('.guide-class-chip')).length === 9);
  check('three zone cards', (await page.$$('.guide-zone-card')).length === 3);
  check('faq disclosures (>=4)', (await page.$$('.guide-faq-item')).length >= 4);
  check('single h1 on the page', (await page.$$('.guide-main h1')).length === 1);
  await page.screenshot({ path: 'tmp/guide-home.png', fullPage: true });

  // Client-side navigation to a docs section (placeholder this phase).
  await page.click('.guide-nav-link[data-sub="how-to-play"]');
  await page.waitForFunction(() => location.pathname === '/guide/how-to-play');
  await page.waitForSelector('.guide-main h1');
  check('SPA navigated to How to Play', (await page.url()).endsWith('/guide/how-to-play'));
  check('docs sidebar now visible', !(await page.$eval('#guide-sidebar', (el) => el.hidden)));
  check('focus moved to main', await page.evaluate(() => document.activeElement?.id === 'guide-main'));

  // Deep link + 404.
  await page.goto(`${BASE}/guide/nope-not-real`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.guide-notfound');
  check('unknown route renders notFound', !!(await page.$('.guide-notfound')));

  // Mobile viewport screenshot.
  const mobile = await browser.newPage();
  mobile.on('pageerror', (e) => errors.push(`pageerror(m): ${e.message}`));
  await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true });
  await mobile.goto(`${BASE}/guide`, { waitUntil: 'networkidle0' });
  await mobile.waitForSelector('.guide-hero-title');
  await mobile.screenshot({ path: 'tmp/guide-home-mobile.png' });
  check('mobile menu toggle visible', await mobile.$eval('.guide-menu-toggle', (el) => getComputedStyle(el).display !== 'none'));

  check('no console / page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

console.log(fail ? `\n${fail} check(s) failed` : '\nAll checks passed');
process.exit(fail > 0 ? 1 : 0);
