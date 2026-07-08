import * as THREE from 'three';

/**
 * src/render/space_grade.ts — NodeB59 Space Edition texture grading.
 *
 * The foliage GLBs ship baked green leaf sheets. Rather than fight them with
 * instance tints (multiplicative tints turn green albedo to mud, never to
 * violet), regrade the pixels once at load: green-dominant texels rotate to
 * the Xenon violet family, everything else passes through with a mild cool
 * cast. Results are cached per source texture so the 5 pine / 5 oak sheets
 * dedupe exactly like the material cache above them.
 */

const cache = new Map<string, THREE.Texture>();

export function xenonGradeTexture(
  src: THREE.Texture | null,
  mode: 'leaf' | 'bark',
): THREE.Texture | null {
  if (!src) return null;
  const key = `${src.uuid}:${mode}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const img = src.image as
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap
    | undefined;
  const w = img?.width ?? 0;
  const h = img?.height ?? 0;
  if (!img || w === 0 || h === 0) return src; // not decodable: leave untouched

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0);
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    return src; // tainted canvas etc.
  }
  const px = data.data;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    if (mode === 'leaf' && g > r * 0.9 && g > b * 0.9 && g > 40) {
      // green-dominant leaf texel: carry its luminance into violet-magenta
      px[i] = Math.min(255, Math.round(g * 0.78 + r * 0.1));
      px[i + 1] = Math.round(Math.min(r, b) * 0.5);
      px[i + 2] = Math.min(255, Math.round(g * 1.02 + b * 0.08));
    } else if (mode === 'bark') {
      // bark/rock: drain warmth, add a faint violet cast
      const l = (r + g + b) / 3;
      px[i] = Math.round(l * 0.86 + r * 0.1);
      px[i + 1] = Math.round(l * 0.78);
      px[i + 2] = Math.round(l * 0.92 + b * 0.12);
    }
  }
  ctx.putImageData(data, 0, 0);

  const out = new THREE.CanvasTexture(c);
  out.colorSpace = src.colorSpace;
  out.wrapS = src.wrapS;
  out.wrapT = src.wrapT;
  out.flipY = src.flipY;
  out.magFilter = src.magFilter;
  out.minFilter = src.minFilter;
  out.anisotropy = src.anisotropy;
  out.needsUpdate = true;
  cache.set(key, out);
  return out;
}
