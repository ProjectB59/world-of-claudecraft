import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { GFX, sharedUniforms } from './gfx';

// Post chain: RenderPass -> [GTAO (ultra)] -> UnrealBloom -> OutputPass
// (ACES tonemap + sRGB, reads renderer.toneMapping) -> GradePass (display
// space lift/gamma/gain, saturation, vignette, faint animated grain).
//
// AA: MSAA on the composer's HalfFloat target (WebGL2) — resolves geometry
// edges before post without smearing the crisp low-poly silhouettes.

const BLOOM_STRENGTH = 0.32; // subtle — fires/portals glow, sky must not blow out
const BLOOM_RADIUS = 0.55;
const BLOOM_THRESHOLD = 0.85;

const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;
    const vec3 LIFT = vec3(0.012, 0.010, 0.018);   // lifted cool shadows
    const vec3 GAIN = vec3(1.05, 1.02, 0.98);      // warm highlights
    const vec3 GAMMA = vec3(0.96);
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = pow(max(vec3(0.0), c * GAIN + LIFT), GAMMA);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, 1.12);                                  // saturation
      vec2 d = vUv - 0.5;
      c *= 1.0 - 0.20 * smoothstep(0.60, 0.95, dot(d, d) * 2.2);  // gentle vignette (0.32 crushed corners)
      c += (fract(sin(dot(vUv * 731.7 + uTime, vec2(12.9898, 78.233))) * 43758.5) - 0.5) * 0.012; // grain
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export interface PostPipeline {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  gtao: GTAOPass | null;
  grade: ShaderPass;
  setSize(width: number, height: number): void;
  render(): void;
}

export function buildComposer(
  webgl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): PostPipeline {
  const size = webgl.getDrawingBufferSize(new THREE.Vector2());
  // HDR + MSAA in one target (WebGL2); HalfFloat keeps >1 colors for bloom
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    samples: webgl.capabilities.isWebGL2 ? GFX.msaaSamples : 0,
    type: THREE.HalfFloatType,
  });
  const composer = new EffectComposer(webgl, target);
  composer.addPass(new RenderPass(scene, camera));

  let gtao: GTAOPass | null = null;
  if (GFX.ao) {
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.6, thickness: 1.2, scale: 1.0 });
    composer.addPass(gtao);
  }

  const bloom = new UnrealBloomPass(size.clone(), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const grade = new ShaderPass(GradeShader);
  grade.uniforms.uTime = sharedUniforms.uTime; // shared clock drives the grain
  composer.addPass(grade);

  return {
    composer,
    bloom,
    gtao,
    grade,
    setSize(width: number, height: number): void {
      composer.setSize(width, height); // also resizes every pass (GTAO, bloom)
    },
    render(): void {
      composer.render();
    },
  };
}
