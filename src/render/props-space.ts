/**
 * src/render/props-space.ts — NodeB59 Space Edition (Planet Xenon) overlay
 *
 * Client-side only: everything here is scene dressing layered on top of the
 * standard buildProps() output. Nothing touches the sim or the protocol, so
 * a Xenon client stays fully compatible with the stock server.
 *
 *   A. patchPropMaterials() — HSL palette shift on residual warm materials
 *   B. buildSpaceDecor()    — procedural sci-fi overlay (plasma vents, comms
 *                             relays, data steles, mine fields, landing
 *                             beacons, monolith caps)
 *   C. buildRobot()         — the rusty maintenance droid (green eyes), a
 *                             few of which idle around the colony
 *   D. arcade cabinets      — clickable "Buckazoids" machines by the town
 *                             well; renderer opens the minigame overlay
 */

import * as THREE from 'three';
import { getActiveWorldContent } from '../sim/data';
import { terrainHeight } from '../sim/world';
import { hash2 } from '../sim/rng';
import { GFX } from './gfx';

// ── Xenon palette (keep in sync with theme.ts 'xenon' + space.css) ──────────
const NEON = 0xff3db8; // magenta
const NEON_DEEP = 0xd4188e;
const VIOLET = 0x8a3dff;
const VIOLET_DEEP = 0x3a1470;
const TERM_GREEN = 0x40ff9a; // Space Quest terminal green
const TERM_GREEN_DEEP = 0x00b050;
const HAZ_YEL = 0xffb020;
const RUST = 0xa85a28; // droid shell
const RUST_DARK = 0x6e3a1a;
const HULL = 0x3a3448;
const DARK_GLASS = 0x241044;

const usePbr = () => GFX.standardMaterials;

function _propRand(x: number, z: number, n: number): number {
  return hash2(Math.round(x * 37), Math.round(z * 37) + n * 7919, 0x517cc1);
}

const _gnd = (x: number, z: number, seed: number) => terrainHeight(x, z, seed);

// ── Lazily-allocated shared materials ────────────────────────────────────────

let _neonMat: THREE.MeshStandardMaterial | null = null;
let _hullMat: THREE.MeshStandardMaterial | null = null;
let _plasmaMat: THREE.MeshStandardMaterial | null = null;
let _fieldMat: THREE.MeshStandardMaterial | null = null;
let _warnMat: THREE.MeshStandardMaterial | null = null;
let _rustMat: THREE.MeshStandardMaterial | null = null;
let _rustDarkMat: THREE.MeshStandardMaterial | null = null;
let _eyeMat: THREE.MeshStandardMaterial | null = null;
let _glassMat: THREE.MeshStandardMaterial | null = null;
let _terminalMat: THREE.MeshStandardMaterial | null = null;

function neonMat(): THREE.MeshStandardMaterial {
  _neonMat ??= new THREE.MeshStandardMaterial({
    color: new THREE.Color(NEON),
    emissive: new THREE.Color(NEON_DEEP),
    emissiveIntensity: usePbr() ? 2.0 : 1.2,
    roughness: 0.12,
    metalness: 0.45,
  });
  return _neonMat;
}
function hullMat(): THREE.MeshStandardMaterial {
  _hullMat ??= new THREE.MeshStandardMaterial({
    color: new THREE.Color(HULL),
    metalness: 0.55,
    roughness: 0.5,
  });
  return _hullMat;
}
function plasmaMat(): THREE.MeshStandardMaterial {
  _plasmaMat ??= new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xff9ce0),
    emissive: new THREE.Color(NEON),
    emissiveIntensity: usePbr() ? 3.0 : 1.8,
    roughness: 0.0,
    metalness: 0.35,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });
  return _plasmaMat;
}
function fieldMat(): THREE.MeshStandardMaterial {
  _fieldMat ??= new THREE.MeshStandardMaterial({
    color: new THREE.Color(VIOLET),
    emissive: new THREE.Color(VIOLET_DEEP),
    emissiveIntensity: usePbr() ? 1.8 : 1.1,
    transparent: true,
    opacity: 0.26,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return _fieldMat;
}
function warnMat(): THREE.MeshStandardMaterial {
  _warnMat ??= new THREE.MeshStandardMaterial({
    color: new THREE.Color(HAZ_YEL),
    emissive: new THREE.Color(0x3a2a00),
    emissiveIntensity: usePbr() ? 1.0 : 0.6,
    roughness: 0.55,
  });
  return _warnMat;
}
function rustMat(): THREE.MeshStandardMaterial {
  _rustMat ??= new THREE.MeshStandardMaterial({
    color: new THREE.Color(RUST),
    metalness: 0.42,
    roughness: 0.72,
  });
  return _rustMat;
}
function rustDarkMat(): THREE.MeshStandardMaterial {
  _rustDarkMat ??= new THREE.MeshStandardMaterial({
    color: new THREE.Color(RUST_DARK),
    metalness: 0.5,
    roughness: 0.6,
  });
  return _rustDarkMat;
}
function eyeMat(): THREE.MeshStandardMaterial {
  _eyeMat ??= new THREE.MeshStandardMaterial({
    color: new THREE.Color(TERM_GREEN),
    emissive: new THREE.Color(TERM_GREEN_DEEP),
    emissiveIntensity: usePbr() ? 3.2 : 1.8,
    roughness: 0.05,
  });
  return _eyeMat;
}
function glassMat(): THREE.MeshStandardMaterial {
  _glassMat ??= new THREE.MeshStandardMaterial({
    color: new THREE.Color(DARK_GLASS),
    emissive: new THREE.Color(VIOLET_DEEP),
    emissiveIntensity: usePbr() ? 0.7 : 0.35,
    transparent: true,
    opacity: 0.28,
    roughness: 0.08,
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return _glassMat;
}
function terminalMat(): THREE.MeshStandardMaterial {
  _terminalMat ??= new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x02140c),
    emissive: new THREE.Color(TERM_GREEN_DEEP),
    emissiveIntensity: usePbr() ? 2.5 : 1.45,
    roughness: 0.05,
    metalness: 0.25,
  });
  return _terminalMat;
}

// ── A. Residual warm-material shift (violet grade) ───────────────────────────

/**
 * Walk an already-built prop tree and pull any remaining warm (red/brown/tan)
 * base colours toward the Xenon violet-grey grade, greens toward teal, and
 * warm emissive glows toward deep violet. Cool/neutral materials pass through.
 * Clones per source material so cached GLTF materials stay pristine.
 */
export function patchPropMaterials(group: THREE.Group): void {
  const seen = new Map<string, THREE.Material>();
  const _hsl = { h: 0, s: 0, l: 0 };

  function shifted(mat: THREE.Material): THREE.Material {
    const hit = seen.get(mat.uuid);
    if (hit) return hit;

    const out = mat.clone();
    const m = out as THREE.MeshStandardMaterial; // also covers Lambert for .color/.emissive

    if (m.color) {
      m.color.getHSL(_hsl);
      const { h, s, l } = _hsl;
      const warm = (h < 0.18 || h > 0.86) && s > 0.07;
      const green = h > 0.26 && h < 0.44 && s > 0.09;
      const warmWhite = s < 0.13 && l > 0.5 && m.color.r > m.color.b + 0.04;
      if (warm) {
        // violet-grey; keep some lightness so shapes still read
        m.color.setHSL(0.76, Math.min(s * 0.45, 0.24), l * 0.52 + 0.06);
      } else if (green) {
        // teal (alien growth)
        m.color.setHSL(0.47, 0.46, l * 0.6 + 0.05);
      } else if (warmWhite) {
        // pale station-white with a violet cast
        m.color.setHSL(0.74, 0.1, l * 0.82);
      }
    }

    if (m.emissive) {
      m.emissive.getHSL(_hsl);
      const warmGlow = (_hsl.h < 0.18 || _hsl.h > 0.86) && _hsl.s > 0.08 && m.emissive.getHex() > 0x0c0808;
      if (warmGlow) m.emissive.setHex(0x2a0a50); // deep violet
    }

    if ('metalness' in m && (m.metalness as number) < 0.12) {
      m.metalness = Math.min((m.metalness as number) + 0.07, 0.12);
    }

    seen.set(mat.uuid, out);
    return out;
  }

  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(shifted);
    } else {
      mesh.material = shifted(mesh.material);
    }
  });
}

// ── Shared geometry (allocated once) ─────────────────────────────────────────

const _ventBase = new THREE.CylinderGeometry(0.7, 0.95, 0.22, 12);
const _ventStem = new THREE.CylinderGeometry(0.1, 0.16, 2.8, 8);
const _ventRing = new THREE.TorusGeometry(0.44, 0.06, 6, 16);
const _ventCap = new THREE.SphereGeometry(0.2, 8, 6);

const _relayBase = new THREE.CylinderGeometry(0.55, 0.7, 0.28, 10);
const _relayShaft = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6);
const _relayDish = new THREE.RingGeometry(0.3, 0.88, 16, 1, 0, Math.PI);
const _relayOrb = new THREE.SphereGeometry(0.16, 10, 8);

const _stelePole = new THREE.BoxGeometry(0.34, 3.2, 0.17);
const _stelePanel = new THREE.PlaneGeometry(0.22, 0.88);
const _stelePip = new THREE.SphereGeometry(0.05, 6, 4);

const _chevronGeo = new THREE.BoxGeometry(1.8, 0.13, 0.13);
const _fieldGeo = new THREE.PlaneGeometry(2.4, 3.0);
const _warnPip = new THREE.SphereGeometry(0.09, 6, 4);

const _beaconGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.18, 6);
const _monoCap = new THREE.TorusGeometry(0.28, 0.05, 6, 14);

// Robot
const _roboTorso = new THREE.BoxGeometry(0.82, 0.86, 0.56);
const _roboHead = new THREE.BoxGeometry(0.66, 0.52, 0.5);
const _roboFace = new THREE.BoxGeometry(0.5, 0.36, 0.04);
const _roboEye = new THREE.CylinderGeometry(0.085, 0.085, 0.06, 12);
const _roboEar = new THREE.CylinderGeometry(0.09, 0.11, 0.16, 8);
const _roboNeck = new THREE.CylinderGeometry(0.1, 0.12, 0.18, 8);
const _roboArm = new THREE.CylinderGeometry(0.055, 0.055, 0.62, 6);
const _roboHand = new THREE.SphereGeometry(0.09, 6, 5);
const _roboLegSeg = new THREE.CylinderGeometry(0.07, 0.07, 0.34, 6);
const _roboFoot = new THREE.BoxGeometry(0.3, 0.16, 0.42);
const _roboChest = new THREE.BoxGeometry(0.5, 0.34, 0.03);

// Arcade cabinet
const _cabBody = new THREE.BoxGeometry(0.95, 1.8, 0.8);
const _cabMarquee = new THREE.BoxGeometry(0.95, 0.28, 0.55);
const _cabScreen = new THREE.PlaneGeometry(0.68, 0.5);
const _cabPanel = new THREE.BoxGeometry(0.9, 0.08, 0.42);
const _cabStick = new THREE.SphereGeometry(0.045, 6, 5);

// Hub dressing
const _padGeo = new THREE.CylinderGeometry(4.8, 4.8, 0.18, 48);
const _padRingGeo = new THREE.TorusGeometry(4.15, 0.08, 8, 48);
const _padLightGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8);
const _domeGeo = new THREE.SphereGeometry(4.6, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
const _domeRibGeo = new THREE.TorusGeometry(4.6, 0.035, 6, 48);
const _domeBaseGeo = new THREE.TorusGeometry(4.62, 0.08, 8, 48);
const _kioskBaseGeo = new THREE.CylinderGeometry(0.42, 0.55, 0.42, 10);
const _kioskBodyGeo = new THREE.BoxGeometry(0.72, 1.55, 0.36);
const _kioskScreenGeo = new THREE.PlaneGeometry(0.52, 0.62);
const _terminalBaseGeo = new THREE.BoxGeometry(1.35, 0.72, 0.72);
const _terminalScreenGeo = new THREE.PlaneGeometry(1.0, 0.52);
const _terminalMastGeo = new THREE.CylinderGeometry(0.035, 0.045, 1.5, 6);
const _terminalDishGeo = new THREE.RingGeometry(0.18, 0.44, 16, 1, 0, Math.PI);

// ── C. The droid ─────────────────────────────────────────────────────────────

export interface SpaceRobot {
  group: THREE.Group;
  head: THREE.Group;
  phase: number;
}

/** Boxy rust-orange maintenance droid with glowing green eyes. ~1.9u tall. */
export function buildRobot(seedX: number, seedZ: number): SpaceRobot {
  const g = new THREE.Group();
  g.name = 'xenon-droid';

  // legs
  for (const sx of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(_roboLegSeg, rustDarkMat());
    leg.position.set(sx, 0.33, 0);
    g.add(leg);
    const foot = new THREE.Mesh(_roboFoot, rustMat());
    foot.position.set(sx, 0.08, 0.04);
    g.add(foot);
  }

  // torso + chest readout
  const torso = new THREE.Mesh(_roboTorso, rustMat());
  torso.position.y = 0.95;
  g.add(torso);
  const chest = new THREE.Mesh(
    _roboChest,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x101418),
      emissive: new THREE.Color(0x0a4a80),
      emissiveIntensity: usePbr() ? 1.6 : 1.0,
      roughness: 0.1,
    }),
  );
  chest.position.set(0, 1.0, 0.3);
  g.add(chest);

  // arms (slightly splayed)
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(_roboArm, rustDarkMat());
    arm.position.set(sx * 0.52, 0.98, 0);
    arm.rotation.z = sx * 0.28;
    g.add(arm);
    const hand = new THREE.Mesh(_roboHand, rustDarkMat());
    hand.position.set(sx * 0.62, 0.66, 0);
    g.add(hand);
  }

  // head group (animatable yaw)
  const head = new THREE.Group();
  const neck = new THREE.Mesh(_roboNeck, rustDarkMat());
  neck.position.y = -0.3;
  head.add(neck);
  const skull = new THREE.Mesh(_roboHead, rustMat());
  head.add(skull);
  const face = new THREE.Mesh(
    _roboFace,
    new THREE.MeshStandardMaterial({ color: new THREE.Color(0x565b60), roughness: 0.6, metalness: 0.3 }),
  );
  face.position.z = 0.26;
  head.add(face);
  for (const sx of [-0.14, 0.14]) {
    const eye = new THREE.Mesh(_roboEye, eyeMat());
    eye.rotation.x = Math.PI / 2;
    eye.position.set(sx, 0.02, 0.3);
    head.add(eye);
  }
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(_roboEar, rustDarkMat());
    ear.rotation.z = Math.PI / 2;
    ear.position.set(sx * 0.4, 0, 0);
    head.add(ear);
  }
  head.position.y = 1.68;
  g.add(head);

  return { group: g, head, phase: _propRand(seedX, seedZ, 77) * Math.PI * 2 };
}

// ── D. Arcade cabinet ────────────────────────────────────────────────────────

/** One "Buckazoids" cabinet; the body mesh carries userData.arcade = true so
 *  the renderer's click raycast can find it. */
function buildArcadeCabinet(variant: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'xenon-arcade';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(variant % 2 === 0 ? 0x1c1030 : 0x2a0e24),
    metalness: 0.3,
    roughness: 0.55,
  });
  const body = new THREE.Mesh(_cabBody, bodyMat);
  body.position.y = 0.9;
  body.userData.arcade = true;
  g.add(body);

  const marquee = new THREE.Mesh(
    _cabMarquee,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(variant % 2 === 0 ? NEON : HAZ_YEL),
      emissive: new THREE.Color(variant % 2 === 0 ? NEON_DEEP : 0x8a5400),
      emissiveIntensity: usePbr() ? 2.4 : 1.5,
      roughness: 0.15,
    }),
  );
  marquee.position.set(0, 1.94, 0.1);
  marquee.rotation.x = -0.18;
  marquee.userData.arcade = true;
  g.add(marquee);

  const screen = new THREE.Mesh(
    _cabScreen,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x02060a),
      emissive: new THREE.Color(0x0a3a6a),
      emissiveIntensity: usePbr() ? 2.2 : 1.4,
      roughness: 0.05,
    }),
  );
  screen.position.set(0, 1.32, 0.41);
  screen.rotation.x = -0.12;
  screen.userData.arcade = true;
  g.add(screen);

  const panel = new THREE.Mesh(_cabPanel, rustDarkMat());
  panel.position.set(0, 0.98, 0.5);
  panel.rotation.x = 0.28;
  g.add(panel);
  for (const sx of [-0.22, 0.02, 0.18]) {
    const stick = new THREE.Mesh(
      _cabStick,
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(sx < 0 ? 0xff2040 : TERM_GREEN),
        roughness: 0.3,
      }),
    );
    stick.position.set(sx, 1.06, 0.56);
    g.add(stick);
  }

  return g;
}

// ── B. Decor build ───────────────────────────────────────────────────────────

function screenLabelTexture(top: string, bottom: string, glow = '#40ff9a'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#02060a';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(64,255,154,0.14)';
    for (let y = 0; y < c.height; y += 8) ctx.fillRect(0, y, c.width, 2);
    ctx.textAlign = 'center';
    ctx.font = '700 54px monospace';
    ctx.shadowColor = glow;
    ctx.shadowBlur = 22;
    ctx.fillStyle = glow;
    ctx.fillText(top, c.width / 2, 104);
    ctx.shadowBlur = 10;
    ctx.font = '700 28px monospace';
    ctx.fillText(bottom, c.width / 2, 166);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildLandingPad(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'xenon-landing-pad';
  const pad = new THREE.Mesh(
    _padGeo,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x2a2234),
      metalness: 0.55,
      roughness: 0.52,
    }),
  );
  pad.position.y = 0.09;
  g.add(pad);
  const ring = new THREE.Mesh(_padRingGeo, warnMat());
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.23;
  g.add(ring);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const light = new THREE.Mesh(_padLightGeo, i % 2 === 0 ? neonMat() : eyeMat());
    light.position.set(Math.sin(a) * 3.55, 0.32, Math.cos(a) * 3.55);
    g.add(light);
  }
  return g;
}

function buildHabitatDome(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'xenon-habitat-dome';
  const dome = new THREE.Mesh(_domeGeo, glassMat());
  dome.position.y = 0.05;
  g.add(dome);
  for (const rot of [0, Math.PI / 2]) {
    const rib = new THREE.Mesh(_domeRibGeo, neonMat());
    rib.rotation.set(Math.PI / 2, 0, rot);
    rib.position.y = 0.05;
    g.add(rib);
  }
  const base = new THREE.Mesh(_domeBaseGeo, hullMat());
  base.rotation.x = Math.PI / 2;
  g.add(base);
  return g;
}

function buildProfileKiosk(variant: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'xenon-profile-kiosk';
  const base = new THREE.Mesh(_kioskBaseGeo, hullMat());
  base.position.y = 0.21;
  g.add(base);
  const body = new THREE.Mesh(_kioskBodyGeo, rustDarkMat());
  body.position.y = 1.13;
  body.userData.profileKiosk = true;
  g.add(body);
  const screen = new THREE.Mesh(
    _kioskScreenGeo,
    new THREE.MeshStandardMaterial({
      map: screenLabelTexture('PROFILE', variant % 2 === 0 ? 'PUBLIC' : 'SIGNAL'),
      emissive: new THREE.Color(TERM_GREEN_DEEP),
      emissiveIntensity: usePbr() ? 1.7 : 1.0,
      roughness: 0.1,
    }),
  );
  screen.position.set(0, 1.18, 0.195);
  screen.userData.profileKiosk = true;
  g.add(screen);
  const cap = new THREE.Mesh(_beaconGeo, neonMat());
  cap.position.y = 2.0;
  g.add(cap);
  return g;
}

function buildIrcTerminal(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'xenon-irc-terminal';
  const base = new THREE.Mesh(_terminalBaseGeo, hullMat());
  base.position.y = 0.54;
  base.userData.ircTerminal = true;
  g.add(base);
  const screen = new THREE.Mesh(
    _terminalScreenGeo,
    new THREE.MeshStandardMaterial({
      map: screenLabelTexture('#modulo59', 'IRC RELAY'),
      emissive: new THREE.Color(TERM_GREEN_DEEP),
      emissiveIntensity: usePbr() ? 2.2 : 1.2,
      roughness: 0.05,
    }),
  );
  screen.position.set(0, 0.72, 0.37);
  screen.userData.ircTerminal = true;
  g.add(screen);
  const mast = new THREE.Mesh(_terminalMastGeo, terminalMat());
  mast.position.set(0.55, 1.5, -0.1);
  g.add(mast);
  const dish = new THREE.Mesh(_terminalDishGeo, neonMat());
  dish.position.set(0.55, 2.26, -0.1);
  dish.rotation.set(-Math.PI / 2.5, 0, Math.PI);
  g.add(dish);
  return g;
}

export interface SpaceDecorResult {
  group: THREE.Group;
  /** Emissive meshes pulsed each frame by the renderer. */
  beacons: THREE.Mesh[];
  /** Idle droids (bob + head sweep), animated by the renderer. */
  robots: SpaceRobot[];
  /** Cabinet meshes (userData.arcade) for the click raycast. */
  arcadeTargets: THREE.Object3D[];
  /** Public profile kiosk meshes for the click raycast. */
  profileTargets: THREE.Object3D[];
  /** IRC terminal meshes for the click raycast. */
  ircTargets: THREE.Object3D[];
}

/**
 * Procedural sci-fi overlay anchored to the same deterministic prop positions
 * buildProps() uses, so decor always lands beside the props it dresses.
 */
export function buildSpaceDecor(seed: number): SpaceDecorResult {
  const root = new THREE.Group();
  root.name = 'space-decor';
  const beacons: THREE.Mesh[] = [];
  const robots: SpaceRobot[] = [];
  const arcadeTargets: THREE.Object3D[] = [];
  const profileTargets: THREE.Object3D[] = [];
  const ircTargets: THREE.Object3D[] = [];
  const P = getActiveWorldContent().props;

  const shadow = <T extends THREE.Object3D>(o: T): T => {
    o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return o;
  };

  // 1. Plasma vents at campfires (sits alongside the recolored bonfire)
  for (const [cx, cz] of P.campfires) {
    const y = _gnd(cx, cz, seed);
    const g = new THREE.Group();
    const base = new THREE.Mesh(_ventBase, hullMat());
    base.position.y = 0.11;
    shadow(base);
    g.add(base);
    const stem = new THREE.Mesh(_ventStem, plasmaMat().clone());
    stem.position.y = 1.55;
    g.add(stem);
    beacons.push(stem);
    const ring = new THREE.Mesh(_ventRing, neonMat());
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.2;
    g.add(ring);
    beacons.push(ring);
    const cap = new THREE.Mesh(_ventCap, neonMat());
    cap.position.y = 3.05;
    g.add(cap);
    beacons.push(cap);
    g.position.set(cx, y, cz);
    root.add(g);
  }

  // 2. Comms relays at wells
  for (const w of P.wells) {
    const y = _gnd(w.x, w.z, seed);
    const g = new THREE.Group();
    const rb = new THREE.Mesh(_relayBase, hullMat());
    rb.position.y = 0.14;
    shadow(rb);
    g.add(rb);
    const rs = new THREE.Mesh(_relayShaft, hullMat());
    rs.position.y = 1.4;
    shadow(rs);
    g.add(rs);
    const dish = new THREE.Mesh(_relayDish, neonMat());
    dish.position.y = 2.48;
    dish.rotation.x = -Math.PI / 2.4;
    dish.rotation.z = Math.PI;
    g.add(dish);
    beacons.push(dish);
    const orb = new THREE.Mesh(_relayOrb, plasmaMat().clone());
    orb.position.y = 3.12;
    g.add(orb);
    beacons.push(orb);
    g.position.set(w.x, y - 0.08, w.z);
    g.rotation.y = _propRand(w.x, w.z, 5) * Math.PI * 2;
    root.add(g);
  }

  // 3. Data-archive steles at graveyards
  const screenMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x0a0418),
    emissive: new THREE.Color(VIOLET_DEEP),
    emissiveIntensity: usePbr() ? 2.2 : 1.4,
    roughness: 0.05,
    metalness: 0.3,
    side: THREE.FrontSide,
  });
  for (const gy of P.graveyards) {
    for (let i = 0; i < 4; i++) {
      const gx = gy.x + (i % 2) * 3.4 - 1.7;
      const gz = gy.z + Math.floor(i / 2) * 3.0 - 1.5;
      const y = _gnd(gx, gz, seed);
      const g = new THREE.Group();
      const pole = new THREE.Mesh(_stelePole, hullMat());
      pole.position.y = 1.6;
      shadow(pole);
      g.add(pole);
      const panel = new THREE.Mesh(_stelePanel, screenMat);
      panel.position.set(0, 2.02, 0.1);
      g.add(panel);
      beacons.push(panel);
      const pip = new THREE.Mesh(_stelePip, neonMat());
      pip.position.y = 3.36;
      g.add(pip);
      beacons.push(pip);
      g.position.set(gx, y, gz);
      g.rotation.y = _propRand(gx, gz, 20) * Math.PI * 2;
      root.add(shadow(g));
    }
  }

  // 4. Mine portal energy fields
  for (const m of P.mines) {
    const y = _gnd(m.x, m.z, seed);
    const g = new THREE.Group();
    const field = new THREE.Mesh(_fieldGeo, fieldMat());
    field.position.set(0, 1.52, -0.12);
    g.add(field);
    beacons.push(field);
    for (let ci = 0; ci < 3; ci++) {
      const chev = new THREE.Mesh(_chevronGeo, warnMat());
      chev.position.set(0, 0.6 + ci * 0.82, 0.24);
      chev.rotation.z = Math.PI / 5;
      g.add(chev);
    }
    for (const sx of [-1.42, 1.42]) {
      for (const py of [0.55, 1.42, 2.3]) {
        const pip = new THREE.Mesh(_warnPip, warnMat());
        pip.position.set(sx, py, 0.32);
        g.add(pip);
        beacons.push(pip);
      }
    }
    g.position.set(m.x, y, m.z);
    g.rotation.y = m.rot;
    root.add(g);
  }

  // 5. Landing beacons along docks
  for (const d of P.docks) {
    const y = _gnd(d.x, d.z, seed);
    const g = new THREE.Group();
    for (let li = 0; li < 5; li++) {
      const isNeon = li % 2 === 0;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(isNeon ? NEON : HAZ_YEL),
        emissive: new THREE.Color(isNeon ? NEON_DEEP : 0x402a00),
        emissiveIntensity: usePbr() ? 2.4 : 1.5,
        roughness: 0.1,
      });
      const beacon = new THREE.Mesh(_beaconGeo, mat);
      beacon.position.set(0, 0.54, -0.9 - li * 1.1);
      g.add(beacon);
      beacons.push(beacon);
    }
    g.position.set(d.x, y, d.z);
    g.rotation.y = d.rot;
    root.add(g);
  }

  // 6. Monolith caps on intact ruin columns
  for (const r of P.ruinRings) {
    for (let i = 0; i < r.columns; i++) {
      if (i % 4 !== 1) continue;
      const ang = (i / r.columns) * Math.PI * 2;
      const cx = r.x + Math.sin(ang) * r.ringR;
      const cz = r.z + Math.cos(ang) * r.ringR;
      const topY = _gnd(cx, cz, seed) + (3.5 + (i % 2) * 0.5) * 4.2;
      const cap = new THREE.Mesh(_monoCap, neonMat());
      cap.rotation.x = Math.PI / 2;
      cap.position.set(cx, topY - 0.6, cz);
      root.add(cap);
      beacons.push(cap);
    }
  }

  // 7. Maintenance droids: one beside each well, one at every third campfire
  const droidAnchors: [number, number][] = [];
  for (const w of P.wells) droidAnchors.push([w.x + 2.2, w.z + 1.4]);
  P.campfires.forEach(([cx, cz], i) => {
    if (i % 3 === 0) droidAnchors.push([cx - 2.6, cz + 1.8]);
  });
  for (const [rx, rz] of droidAnchors) {
    const robot = buildRobot(rx, rz);
    const y = _gnd(rx, rz, seed);
    robot.group.position.set(rx, y, rz);
    robot.group.rotation.y = _propRand(rx, rz, 9) * Math.PI * 2;
    shadow(robot.group);
    root.add(robot.group);
    robots.push(robot);
  }

  // 8. Buckazoids arcade corner: three cabinets in an arc by the first well,
  // crowned by a floating neon sign so players know they're playable.
  if (P.wells.length > 0) {
    const w = P.wells[0];
    {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 128;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 512, 128);
        ctx.textAlign = 'center';
        ctx.font = '700 52px monospace';
        ctx.shadowColor = '#ff3db8';
        ctx.shadowBlur = 26;
        ctx.fillStyle = '#ff8ad4';
        ctx.fillText('BUCKAZOIDS', 256, 58);
        ctx.shadowBlur = 12;
        ctx.font = '700 30px monospace';
        ctx.fillStyle = '#40ff9a';
        ctx.fillText('- CLICK TO PLAY -', 256, 104);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
      );
      sign.scale.set(4.6, 1.15, 1);
      const sy = _gnd(w.x, w.z + 5.2, seed);
      sign.position.set(w.x, sy + 3.3, w.z + 5.2);
      root.add(sign);
    }
    for (let i = 0; i < 3; i++) {
      const ang = -0.5 + i * 0.5;
      const cx = w.x + Math.sin(ang) * 5.2;
      const cz = w.z + Math.cos(ang) * 5.2;
      const cab = buildArcadeCabinet(i);
      const y = _gnd(cx, cz, seed);
      cab.position.set(cx, y, cz);
      // face the well
      cab.rotation.y = Math.atan2(w.x - cx, w.z - cz);
      shadow(cab);
      root.add(cab);
      cab.traverse((o) => {
        if (o.userData.arcade) arcadeTargets.push(o);
      });
    }

    // 9. Main colony hub: landing pad, habitat dome, profile kiosks, IRC terminal.
    const hubX = w.x;
    const hubZ = w.z;
    const pad = buildLandingPad();
    const padX = hubX - 7.4;
    const padZ = hubZ - 5.8;
    pad.position.set(padX, _gnd(padX, padZ, seed), padZ);
    pad.rotation.y = _propRand(padX, padZ, 41) * Math.PI * 2;
    root.add(shadow(pad));

    const dome = buildHabitatDome();
    const domeX = hubX + 7.0;
    const domeZ = hubZ - 4.4;
    dome.position.set(domeX, _gnd(domeX, domeZ, seed) + 0.04, domeZ);
    root.add(shadow(dome));

    for (let i = 0; i < 2; i++) {
      const kx = hubX + 3.6 + i * 1.7;
      const kz = hubZ + 4.2;
      const kiosk = buildProfileKiosk(i);
      kiosk.position.set(kx, _gnd(kx, kz, seed), kz);
      kiosk.rotation.y = Math.atan2(hubX - kx, hubZ - kz);
      root.add(shadow(kiosk));
      kiosk.traverse((o) => {
        if (o.userData.profileKiosk) profileTargets.push(o);
      });
    }

    const irc = buildIrcTerminal();
    const ix = hubX - 3.9;
    const iz = hubZ + 4.6;
    irc.position.set(ix, _gnd(ix, iz, seed), iz);
    irc.rotation.y = Math.atan2(hubX - ix, hubZ - iz);
    root.add(shadow(irc));
    irc.traverse((o) => {
      if (o.userData.ircTerminal) ircTargets.push(o);
    });
  }

  return { group: root, beacons, robots, arcadeTargets, profileTargets, ircTargets };
}
