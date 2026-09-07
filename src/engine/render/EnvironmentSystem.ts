import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { System } from '../core/System';
import type { VisualModeDefinition } from '../../shaders/visualModes';
import type { TimeMode, WeatherMode } from '../../types/game';

/**
 * Sky, sun, moonlight, stars, sparkles, and weather in one place. The
 * day/night cycle drives the shared `dayLight` uniform, which the voxel
 * shader multiplies with the baked sky-light attribute.
 */

const CYCLE_SECONDS = 480; // a full day every eight minutes
const RAIN_DROPS = 900;
const STAR_COUNT = 260;
const SPARKLE_COUNT = 160;
const WEATHER_RADIUS = 48;

export class EnvironmentSystem implements System {
  readonly name = 'environment';
  readonly dayLight = { value: 1 };
  readonly sun: THREE.DirectionalLight;
  readonly hemisphere: THREE.HemisphereLight;
  private timeOfDay = 0.3; // morning
  private timeMode: TimeMode = 'cycle';
  private weather: WeatherMode = 'sunny';
  private mode: VisualModeDefinition;
  private stars: THREE.Points;
  private sparkles: THREE.Points;
  private rain: THREE.Points;
  private rainVelocity: number[] = [];
  private skyColor = new THREE.Color();
  private focus = { x: 0, y: 0, z: 0 };
  private sky: Sky | null = null;
  private pmrem: THREE.PMREMGenerator | null = null;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private envBakedAt = -10;
  private envBakedTime = -1;
  private underwater = false;
  /** Phones cap the sun shadow map (set by the engine). */
  maxShadowMap = 4096;
  /** The baked sky, for PBR materials only (flat materials would just darken). */
  envMap: THREE.Texture | null = null;
  private envListeners = new Set<(map: THREE.Texture | null) => void>();

  onEnvMap(listener: (map: THREE.Texture | null) => void): () => void {
    this.envListeners.add(listener);
    listener(this.envMap);
    return () => this.envListeners.delete(listener);
  }

  constructor(
    private scene: THREE.Scene,
    private renderer: THREE.WebGLRenderer,
    initialMode: VisualModeDefinition,
    private shadowsAllowed: boolean,
  ) {
    this.mode = initialMode;
    this.sun = new THREE.DirectionalLight('#fffbe8', 1.6);
    this.sun.castShadow = shadowsAllowed;
    this.sun.shadow.mapSize.set(2048, 2048);
    const cam = this.sun.shadow.camera;
    cam.left = -60;
    cam.right = 60;
    cam.top = 60;
    cam.bottom = -60;
    cam.near = 1;
    cam.far = 300;
    this.sun.shadow.bias = -0.0005;
    cam.updateProjectionMatrix();
    scene.add(this.sun, this.sun.target);
    this.hemisphere = new THREE.HemisphereLight('#cfe9ff', '#9ad07c', 1.1);
    scene.add(this.hemisphere);
    scene.background = new THREE.Color('#aee3ff');
    scene.fog = new THREE.Fog('#aee3ff', 70, 170);

    this.stars = this.buildStars();
    this.sparkles = this.buildSparkles();
    this.rain = this.buildRain();
    scene.add(this.stars, this.sparkles, this.rain);
    this.applyVisualMode(initialMode);
  }

  /** Where the player is: sun, stars, and weather follow. */
  setFocus(x: number, y: number, z: number): void {
    this.focus = { x, y, z };
  }

  get time(): number {
    return this.timeOfDay;
  }

  get weatherName(): WeatherMode {
    return this.weather;
  }

  setTime(t: number): void {
    this.timeOfDay = ((t % 1) + 1) % 1;
  }

  private buildStars(): THREE.Points {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      // On a dome so they stay far away in every direction.
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45;
      const r = 300;
      positions[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
      positions[i * 3 + 1] = Math.cos(phi) * r * 0.6 + 20;
      positions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: '#fff8d0', size: 1.4, transparent: true, opacity: 0, fog: false, sizeAttenuation: true });
    return new THREE.Points(geometry, material);
  }

  private buildSparkles(): THREE.Points {
    const positions = new Float32Array(SPARKLE_COUNT * 3);
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * WEATHER_RADIUS * 2;
      positions[i * 3 + 1] = 2 + Math.random() * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * WEATHER_RADIUS * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: '#ffd6ef', size: 0.22, transparent: true, opacity: 0.85 });
    const points = new THREE.Points(geometry, material);
    points.visible = false;
    return points;
  }

  private buildRain(): THREE.Points {
    const positions = new Float32Array(RAIN_DROPS * 3);
    for (let i = 0; i < RAIN_DROPS; i++) {
      positions[i * 3] = (Math.random() - 0.5) * WEATHER_RADIUS * 2;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * WEATHER_RADIUS * 2;
      this.rainVelocity.push(14 + Math.random() * 8);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: '#9fc8e8', size: 0.16, transparent: true, opacity: 0.7 });
    const points = new THREE.Points(geometry, material);
    points.visible = false;
    return points;
  }

  setTimeMode(mode: TimeMode): void {
    this.timeMode = mode;
    if (mode === 'day') this.timeOfDay = 0.3;
    if (mode === 'night') this.timeOfDay = 0.8;
  }

  setWeather(weather: WeatherMode): void {
    this.weather = weather;
    const material = this.rain.material as THREE.PointsMaterial;
    if (weather === 'rain') {
      material.color.set('#9fc8e8');
      material.size = 0.16;
    } else if (weather === 'snow') {
      material.color.set('#ffffff');
      material.size = 0.22;
    }
    this.rain.visible = weather !== 'sunny';
  }

  /** Cozy blue haze while the camera is under water. */
  setUnderwater(on: boolean): void {
    if (on === this.underwater) return;
    this.underwater = on;
    if (this.sky) {
      // The sky dome stays out of the water: swap to a flat blue background.
      if (on) this.scene.background = new THREE.Color(this.skyColor);
      else this.envBakedAt = -10;
    }
  }

  applyVisualMode(mode: VisualModeDefinition): void {
    this.mode = mode;
    this.renderer.toneMapping = mode.toneMapping === 'aces' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    this.renderer.toneMappingExposure = mode.exposure;
    this.renderer.shadowMap.enabled = this.shadowsAllowed && mode.lighting.shadowsEnabled;
    this.sparkles.visible = mode.effects.sparkles;
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = mode.fog.near;
      this.scene.fog.far = mode.fog.far;
    }
    const size = this.shadowsAllowed ? Math.min(mode.rendering.shadowMap, this.maxShadowMap) : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    if (mode.rendering.envMap && this.shadowsAllowed) this.enableSky();
    else this.disableSky();
  }

  /** A physically based sky dome, baked into an environment map for IBL. */
  private enableSky(): void {
    if (this.sky) return;
    this.sky = new Sky();
    this.sky.scale.setScalar(4000);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 6;
    u.rayleigh.value = 1.6;
    u.mieCoefficient.value = 0.006;
    u.mieDirectionalG.value = 0.8;
    this.scene.add(this.sky);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envBakedAt = -10;
  }

  private disableSky(): void {
    if (!this.sky) return;
    this.scene.remove(this.sky);
    this.sky.material.dispose();
    this.sky.geometry.dispose();
    this.sky = null;
    this.envMap = null;
    for (const listener of this.envListeners) listener(null);
    this.scene.background = new THREE.Color(this.skyColor);
    this.envTarget?.dispose();
    this.envTarget = null;
    this.pmrem?.dispose();
    this.pmrem = null;
  }

  private updateSky(elapsed: number, sunUp: number, angle: number): void {
    if (!this.sky || !this.pmrem) return;
    const u = this.sky.material.uniforms;
    const dir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), -0.3).normalize();
    u.sunPosition.value.copy(dir);
    const cloudy = this.weather !== 'sunny';
    u.turbidity.value = cloudy ? 8 : 3 + (1 - sunUp) * 5;
    u.rayleigh.value = cloudy ? 1.0 : 1.4 + (1 - sunUp) * 2.0;
    u.mieCoefficient.value = cloudy ? 0.012 : 0.004 + (1 - sunUp) * 0.015;
    this.sky.position.set(this.focus.x, this.focus.y, this.focus.z);
    // Re-bake the environment every couple of seconds or when time jumps.
    if (elapsed - this.envBakedAt > 2 || Math.abs(this.timeOfDay - this.envBakedTime) > 0.05) {
      this.envBakedAt = elapsed;
      this.envBakedTime = this.timeOfDay;
      const target = this.pmrem.fromScene(this.sky as unknown as THREE.Scene, 0.04);
      this.envTarget?.dispose();
      this.envTarget = target;
      this.scene.background = target.texture;
      this.scene.backgroundBlurriness = 0;
      this.envMap = target.texture;
      for (const listener of this.envListeners) listener(target.texture);
    }
  }

  private sunFactor(): number {
    const angle = this.timeOfDay * Math.PI * 2;
    return THREE.MathUtils.clamp(Math.sin(angle) * 1.4, 0, 1);
  }

  update(dt: number, elapsed: number): void {
    if (this.timeMode === 'cycle') this.timeOfDay = (this.timeOfDay + dt / CYCLE_SECONDS) % 1;

    const sunUp = this.sunFactor();
    const weatherDim = this.weather === 'sunny' ? 1 : 0.7;
    this.dayLight.value = Math.max(0.16, sunUp) * weatherDim;

    const angle = this.timeOfDay * Math.PI * 2;
    const f = this.focus;
    this.sun.position.set(f.x + Math.cos(angle) * 90, f.y + Math.sin(angle) * 90, f.z - 30);
    this.sun.target.position.set(f.x, f.y, f.z);
    this.sun.intensity = this.mode.lighting.sunIntensity * sunUp * weatherDim;
    this.hemisphere.intensity = this.mode.lighting.hemisphereIntensity * (0.35 + 0.65 * sunUp) * weatherDim;

    const sky = this.mode.sky;
    const dawnBand = THREE.MathUtils.clamp(1 - Math.abs(sunUp - 0.25) / 0.25, 0, 1) * 0.8;
    this.skyColor
      .set(sky.night)
      .lerp(new THREE.Color(sky.day), sunUp)
      .lerp(new THREE.Color(sky.dawn), dawnBand * (1 - sunUp));
    if (this.weather !== 'sunny') this.skyColor.lerp(new THREE.Color('#8b9bab'), 0.45);
    if (this.underwater) this.skyColor.set('#1f6ea8').multiplyScalar(0.35 + 0.65 * sunUp);
    if (this.scene.background instanceof THREE.Color) this.scene.background.copy(this.skyColor);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(this.skyColor);
      this.scene.fog.near = this.underwater ? 1 : this.mode.fog.near;
      this.scene.fog.far = this.underwater ? 26 : this.mode.fog.far;
    }
    this.updateSky(elapsed, sunUp, angle);

    this.stars.position.set(f.x, 0, f.z);
    (this.stars.material as THREE.PointsMaterial).opacity = THREE.MathUtils.clamp(0.9 - sunUp * 2, 0, 0.9);

    if (this.rain.visible) {
      this.rain.position.set(f.x, Math.max(0, f.y - 10), f.z);
      const positions = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
      const speedScale = this.weather === 'snow' ? 0.18 : 1;
      for (let i = 0; i < RAIN_DROPS; i++) {
        let y = positions.getY(i) - this.rainVelocity[i] * speedScale * dt;
        if (y < 0) y = 38 + Math.random() * 4;
        positions.setY(i, y);
        if (this.weather === 'snow') positions.setX(i, positions.getX(i) + Math.sin(elapsed * 2 + i) * dt * 0.6);
      }
      positions.needsUpdate = true;
    }

    if (this.sparkles.visible) {
      this.sparkles.position.set(f.x, f.y - 4 + Math.sin(elapsed * 0.6) * 0.8, f.z);
      (this.sparkles.material as THREE.PointsMaterial).opacity = 0.6 + Math.sin(elapsed * 1.7) * 0.25;
    }
  }

  dispose(): void {
    this.disableSky();
    for (const points of [this.stars, this.sparkles, this.rain]) {
      this.scene.remove(points);
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    }
    this.scene.remove(this.sun, this.sun.target, this.hemisphere);
  }
}
