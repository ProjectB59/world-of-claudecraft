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
  // This terminal patches into the game's REAL comms (the same authoritative
  // server chat the Comms dock uses) — no scripted fake logs. The button
  // closes the panel and opens the chat bar pre-filled with /join world,
  // the same affordance hud.ts uses to pre-fill whispers.
  panel.insertAdjacentHTML(
    'beforeend',
    `
    <div class="xenon-panel-kicker">colony comms relay</div>
    <h2>${esc(t('hudChrome.xenon.ircTitle'))}</h2>
    <div class="xenon-irc-log">
      <div><span>*</span> Live colony comms. Everyone on this server, one channel.</div>
      <div><span>*</span> /join world &mdash; global &nbsp;&middot;&nbsp; /join lfg &mdash; find a crew</div>
    </div>
    <button type="button" class="xenon-panel-cta" data-open-comms>OPEN COMMS</button>
  `,
  );
  const btn = panel.querySelector('[data-open-comms]');
  if (btn)
    btn.addEventListener('click', () => {
      closePanel();
      const input = document.getElementById('chat-input') as HTMLTextAreaElement | null;
      if (!input) return;
      input.value = '/join world';
      input.style.display = 'block';
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      input.dispatchEvent(new Event('input'));
    });
}
