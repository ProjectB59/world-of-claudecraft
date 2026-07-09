// Pure terrain painter for the world-map / minimap background. Kept
// host-agnostic (no DOM, no canvas) so it can be unit-tested directly and so
// the heavy per-pixel work can be time-sliced across idle callbacks by the HUD
// without forking the pixel math. It writes straight into a flat RGBA buffer
// (the same `Uint8ClampedArray` an `ImageData.data` exposes).
//
// The colours sample the SAME `terrainHeight`/`roadDistance` the renderer and
// sim use, so the map always matches the real world, do not diverge them.
import { ZONES } from '../sim/data';
import { roadDistance, terrainHeight, waterLevelAt, zoneBiomeAt } from '../sim/world';

export interface MapRegion {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Pixel height of a W-wide terrain canvas covering `region` (square-pixel).
export function mapCanvasHeight(W: number, region: MapRegion): number {
  return Math.round((W * (region.maxZ - region.minZ)) / (region.maxX - region.minX));
}

// Paint rows [y0, y1) of a W×H RGBA buffer for `region`. Splitting by whole
// rows is what lets the prewarm chunk the work: the only per-row state is the
// hillshade's left-neighbour height, which resets at each row's first pixel, so
// a chunked render is byte-identical to a single-pass one.
export function paintTerrainRows(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  region: MapRegion,
  seed: number,
  y0: number,
  y1: number,
): void {
  const spanX = region.maxX - region.minX;
  const spanZ = region.maxZ - region.minZ;
  for (let iy = y0; iy < y1; iy++) {
    let prevH = 0; // height of the left-neighbour pixel, for free hillshade
    for (let ix = 0; ix < W; ix++) {
      // +Z up, +X LEFT: facing 0 is +Z ("north") and turning right decreases
      // facing, so the world's east is -X, and drawing +X to the right mirrored
      // the whole map east-west
      const x = region.maxX - (ix / W) * spanX;
      const z = region.maxZ - (iy / H) * spanZ;
      const h = terrainHeight(x, z, seed);
      const wl = waterLevelAt(x, z);
      const biome = zoneBiomeAt(z);
      // NodeB59 Space Edition: minimap mirrors the violet regolith grade
      let r = 74,
        g = 58,
        b = 104;
      if (biome === 'marsh') {
        r = 44;
        g = 36;
        b = 68;
      } else if (biome === 'peaks') {
        r = 94;
        g = 88;
        b = 120;
      }
      if (h < waterLevelAt(x, z)) {
        r = 42;
        g = 22;
        b = 96;
      } else if (h > 26) {
        r = 172;
        g = 162;
        b = 190;
      } // ridge / peak rock+dust
      else if (h > 11) {
        r = 112;
        g = 100;
        b = 128;
      } else if (h > 6) {
        r = 90;
        g = 72;
        b = 116;
      }
      let nearHub = false;
      for (const zn of ZONES) {
        if (Math.hypot(x - zn.hub.x, z - zn.hub.z) < 14) {
          nearHub = true;
          break;
        }
      }
      if (nearHub) {
        r = 128;
        g = 96;
        b = 118;
      } else if (h >= wl && roadDistance(x, z) < 2.4) {
        r = 140;
        g = 108;
        b = 130;
      }
      // hillshade: relief from the west-to-east slope, reusing the already-computed
      // left-neighbour height so it costs no extra terrainHeight() calls
      const left = ix === 0 ? h : prevH;
      prevH = h;
      if (h >= wl) {
        const shade = Math.max(0.74, Math.min(1.28, 1 + (h - left) * 0.16));
        r = Math.min(255, r * shade);
        g = Math.min(255, g * shade);
        b = Math.min(255, b * shade);
      }
      const k = (iy * W + ix) * 4;
      data[k] = r;
      data[k + 1] = g;
      data[k + 2] = b;
      data[k + 3] = 255;
    }
  }
}
