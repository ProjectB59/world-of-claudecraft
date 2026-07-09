/**
 * Client-only overlays opened from the Planet Xenon hub props.
 *
 * These are small DOM islands, not HUD state. They do not touch the sim,
 * network, or persistence. The renderer opens them when a raycast hits the
 * matching in-world kiosk.
 */

import { t } from './i18n';
import { esc } from './esc';

let openPanel: HTMLDivElement | null = null;

export function isXenonHubPanelOpen(): boolean {
  return openPanel !== null;
}

function closePanel(): void {
  if (!openPanel) return;
  window.removeEventListener('keydown', keyCapture, true);
  openPanel.remove();
  openPanel = null;
}

function keyCapture(e: KeyboardEvent): void {
  if (!openPanel) return;
  if (e.code === 'Escape') {
    e.stopPropagation();
    closePanel();
  }
}

function openPanelFrame(kind: 'profile' | 'irc'): HTMLDivElement {
  closePanel();
  const overlay = document.createElement('div');
  overlay.className = `xenon-panel-overlay xenon-panel-overlay-${kind}`;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute(
    'aria-label',
    kind === 'profile' ? t('hudChrome.xenon.profileTitle') : t('hudChrome.xenon.ircTitle'),
  );

  const panel = document.createElement('div');
  panel.className = `xenon-hub-panel xenon-${kind}-panel`;
  panel.addEventListener('pointerdown', (e) => e.stopPropagation());
  overlay.appendChild(panel);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'xenon-panel-close';
  close.textContent = 'x';
  close.setAttribute('aria-label', t('hud.options.returnToGame'));
  close.addEventListener('click', closePanel);
  panel.appendChild(close);

  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) closePanel();
  });
  document.body.appendChild(overlay);
  window.addEventListener('keydown', keyCapture, true);
  openPanel = overlay;
  return panel;
}

export function openXenonProfileKiosk(): void {
  const panel = openPanelFrame('profile');
  const profilePattern = window.location.origin
    ? `${window.location.origin}${t('hudChrome.xenon.profileRoutePattern')}`
    : t('hudChrome.xenon.profileRoutePattern');
  panel.insertAdjacentHTML(
    'beforeend',
    `
    <div class="xenon-panel-kicker">${esc(t('hudChrome.xenon.profileKicker'))}</div>
    <h2>${esc(t('hudChrome.xenon.profileTitle'))}</h2>
    <p>${esc(t('hudChrome.xenon.profileBody'))}</p>
    <div class="xenon-profile-grid">
      <span>${esc(t('hudChrome.xenon.profileFieldCallsign'))}</span><strong>${esc(t('hudChrome.xenon.profileValuePublic'))}</strong>
      <span>${esc(t('hudChrome.xenon.profileFieldSignal'))}</span><strong>${esc(t('hudChrome.xenon.profileValueSignal'))}</strong>
      <span>${esc(t('hudChrome.xenon.profileFieldRoute'))}</span><strong>${esc(profilePattern)}</strong>
    </div>
    <a class="xenon-panel-cta" href="/" target="_blank" rel="noopener">${esc(t('hudChrome.xenon.profileCta'))}</a>
  `,
  );
}

export function openXenonIrcPanel(): void {
  const panel = openPanelFrame('irc');
  const lines = [
    ['katja', t('hudChrome.xenon.ircLineSkin')],
    ['janitor', t('hudChrome.xenon.ircLineCart')],
    ['b59bot', t('hudChrome.xenon.ircLineCabinet')],
    ['operator', t('hudChrome.xenon.ircLineSignal')],
  ];
  const log = lines
    .map(([name, line]) => `<div><span>&lt;${esc(name)}&gt;</span> ${esc(line)}</div>`)
    .join('');
  panel.insertAdjacentHTML(
    'beforeend',
    `
    <div class="xenon-panel-kicker">irc://nodeb59/#modulo59</div>
    <h2>${esc(t('hudChrome.xenon.ircTitle'))}</h2>
    <div class="xenon-irc-log">${log}<div><span>*</span> ${esc(t('hudChrome.xenon.ircPrompt'))}</div></div>
  `,
  );
}
