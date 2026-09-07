import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/** Soft darkening toward the corners, like a camera lens. */
const VignetteShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, strength: { value: 0.35 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float strength;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float v = 1.0 - smoothstep(0.35, 0.95, dot(d, d) * 2.2) * strength;
      gl_FragColor = vec4(c.rgb * v, c.a);
    }`,
};

/**
 * Cinema's camera pipeline: ambient occlusion in the creases, a soft
 * bloom on bright things, a gentle vignette, then tone mapping. Built on
 * first use so the other modes never pay for it.
 */
export type PostFxOptions = { ao: boolean; bloom: boolean; vignette: boolean };

export class PostFx {
  enabled = false;
  /** Ambient occlusion is off by default: it costs a lot on phones and software GL. */
  options: PostFxOptions = { ao: false, bloom: true, vignette: true };
  private composer: EffectComposer | null = null;
  private gtao: GTAOPass | null = null;
  private bloom: UnrealBloomPass | null = null;
  private width = 1;
  private height = 1;
  private ratio = 1;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
  ) {}

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (on && !this.composer) this.build();
  }

  /** Rebuilds the pipeline with some passes off (quality settings, debugging). */
  setOptions(options: Partial<PostFxOptions>): void {
    this.options = { ...this.options, ...options };
    this.dispose();
    if (this.enabled) this.build();
  }

  private build(): void {
    const size = this.renderer.getSize(new THREE.Vector2());
    this.width = Math.max(1, size.x);
    this.height = Math.max(1, size.y);
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    const gtao = this.options.ao ? new GTAOPass(this.scene, this.camera, this.width, this.height) : null;
    if (gtao) {
      gtao.output = GTAOPass.OUTPUT.Default;
    gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1, thickness: 1, scale: 1.2, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 3, radiusExponent: 1, rings: 2, samples: 12 });
    gtao.blendIntensity = 0.85;
    composer.addPass(gtao);
    }
    const bloom = this.options.bloom ? new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 0.22, 0.6, 0.92) : null;
    if (bloom) composer.addPass(bloom);
    if (this.options.vignette) composer.addPass(new ShaderPass(VignetteShader));
    composer.addPass(new OutputPass());
    this.composer = composer;
    this.gtao = gtao;
    this.bloom = bloom;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.composer?.setSize(width, height);
    this.gtao?.setSize(width, height);
    this.bloom?.setSize(width, height);
  }

  render(): void {
    if (!this.composer) this.build();
    // The canvas may have been sized after the pipeline was built.
    const size = this.renderer.getSize(new THREE.Vector2());
    const ratio = this.renderer.getPixelRatio();
    if (size.x !== this.width || size.y !== this.height || ratio !== this.ratio) {
      this.ratio = ratio;
      this.composer?.setPixelRatio(ratio);
      this.resize(size.x, size.y);
    }
    this.composer?.render();
  }

  dispose(): void {
    this.composer?.dispose();
    this.composer = null;
    this.gtao = null;
    this.bloom = null;
  }
}
