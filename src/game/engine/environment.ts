import * as THREE from 'three';
import type { TimeMode, WeatherMode } from '../../types/game';
import { WORLD_SIZE } from './world';
import type { VisualModeDefinition } from '../../shaders/visualModes';

/**
 * Sky, sun, moonlight, stars, sparkles, and weather in one place.
 * The day/night cycle drives the shared `dayLight` uniform, which the
 * voxel shader multiplies with the baked sky-light attribute — that's
 * how night makes an unlit shelter genuinely dark while a torch keeps
 * its corner warm.
 */

const CYCLE_SECONDS = 240; // a full day every four minutes
const RAIN_DROPS = 900;
const STAR_COUNT = 220;
const SPARKLE_COUNT = 160;

export class EnvironmentSystem {
  readonly dayLight = { value: 1 };
  private timeOfDay = 0.3; // morning
  private timeMode: TimeMode = 'cycle';
  private weather: WeatherMode = 'sunny';
  private mode: VisualModeDefinition;
  private stars: THREE.Points;
  private sparkles: THREE.Points;
  private rain: THREE.Points;
  private rainVelocity: number[] = [];
  private skyColor = new THREE.Color();

  constructor(
    private scene: THREE.Scene,
    private sun: THREE.DirectionalLight,
    private hemisphere: THREE.HemisphereLight,
    private renderer: THREE.WebGLRenderer,
    initialMode: VisualModeDefinition,
    private shadowsAllowed: boolean,
  ) {
    this.mode = initialMode;
    this.stars = this.buildStars();
    this.sparkles = this.buildSparkles();
    this.rain = this.buildRain();
    scene.add(this.stars, this.sparkles, this.rain);
    this.applyVisualMode(initialMode);
  }

  private buildStars(): THREE.Points {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      positions[i * 3] = Math.random() * 200 - 70;
      positions[i * 3 + 1] = 40 + Math.random() * 60;
      positions[i * 3 + 2] = Math.random() * 200 - 70;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: '#fff8d0',
      size: 0.5,
      transparent: true,
      opacity: 0,
      fog: false,
    });
    return new THREE.Points(geometry, material);
  }

  private buildSparkles(): THREE.Points {
    const positions = new Float32Array(SPARKLE_COUNT * 3);
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      positions[i * 3] = Math.random() * WORLD_SIZE.width;
      positions[i * 3 + 1] = 2 + Math.random() * 18;
      positions[i * 3 + 2] = Math.random() * WORLD_SIZE.depth;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: '#ffd6ef',
      size: 0.22,
      transparent: true,
      opacity: 0.85,
    });
    const points = new THREE.Points(geometry, material);
    points.visible = false;
    return points;
  }

  private buildRain(): THREE.Points {
    const positions = new Float32Array(RAIN_DROPS * 3);
    for (let i = 0; i < RAIN_DROPS; i++) {
      positions[i * 3] = Math.random() * WORLD_SIZE.width;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = Math.random() * WORLD_SIZE.depth;
      this.rainVelocity.push(14 + Math.random() * 8);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: '#9fc8e8',
      size: 0.16,
      transparent: true,
      opacity: 0.7,
    });
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

  applyVisualMode(mode: VisualModeDefinition): void {
    this.mode = mode;
    this.renderer.toneMapping =
      mode.toneMapping === 'aces' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    this.renderer.toneMappingExposure = mode.exposure;
    this.renderer.shadowMap.enabled = this.shadowsAllowed && mode.lighting.shadowsEnabled;
    this.sparkles.visible = mode.effects.sparkles;
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = mode.fog.near;
      this.scene.fog.far = mode.fog.far;
    }
  }

  /** 0..1 sun height factor: 1 at noon, 0 at night. */
  private sunFactor(): number {
    const angle = this.timeOfDay * Math.PI * 2;
    return THREE.MathUtils.clamp(Math.sin(angle) * 1.4, 0, 1);
  }

  update(dt: number, elapsed: number): void {
    if (this.timeMode === 'cycle') {
      this.timeOfDay = (this.timeOfDay + dt / CYCLE_SECONDS) % 1;
    }

    const sunUp = this.sunFactor();
    // Moonlight floor keeps night friendly, never pitch black.
    const weatherDim = this.weather === 'sunny' ? 1 : 0.7;
    this.dayLight.value = Math.max(0.16, sunUp) * weatherDim;

    // Sun orbits the world; light fades near the horizon.
    const angle = this.timeOfDay * Math.PI * 2;
    this.sun.position.set(
      WORLD_SIZE.width / 2 + Math.cos(angle) * 70,
      Math.sin(angle) * 70,
      WORLD_SIZE.depth / 2 - 24,
    );
    this.sun.intensity = this.mode.lighting.sunIntensity * sunUp * weatherDim;
    this.hemisphere.intensity =
      this.mode.lighting.hemisphereIntensity * (0.35 + 0.65 * sunUp) * weatherDim;

    // Sky: night ↔ dawn ↔ day blend.
    const sky = this.mode.sky;
    const dawnBand = THREE.MathUtils.clamp(1 - Math.abs(sunUp - 0.25) / 0.25, 0, 1) * 0.8;
    this.skyColor
      .set(sky.night)
      .lerp(new THREE.Color(sky.day), sunUp)
      .lerp(new THREE.Color(sky.dawn), dawnBand * (1 - sunUp));
    if (this.weather !== 'sunny') {
      this.skyColor.lerp(new THREE.Color('#8b9bab'), 0.45);
    }
    (this.scene.background as THREE.Color).copy(this.skyColor);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(this.skyColor);
    }

    // Stars fade in at night.
    (this.stars.material as THREE.PointsMaterial).opacity = THREE.MathUtils.clamp(
      0.9 - sunUp * 2,
      0,
      0.9,
    );

    // Falling rain or snow, looping back to the top.
    if (this.rain.visible) {
      const positions = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
      const speedScale = this.weather === 'snow' ? 0.18 : 1;
      for (let i = 0; i < RAIN_DROPS; i++) {
        let y = positions.getY(i) - this.rainVelocity[i] * speedScale * dt;
        if (y < 0) y = 38 + Math.random() * 4;
        positions.setY(i, y);
        if (this.weather === 'snow') {
          positions.setX(i, positions.getX(i) + Math.sin(elapsed * 2 + i) * dt * 0.6);
        }
      }
      positions.needsUpdate = true;
    }

    // Dream sparkles drift gently.
    if (this.sparkles.visible) {
      this.sparkles.position.y = Math.sin(elapsed * 0.6) * 0.8;
      (this.sparkles.material as THREE.PointsMaterial).opacity =
        0.6 + Math.sin(elapsed * 1.7) * 0.25;
    }
  }

  dispose(): void {
    for (const points of [this.stars, this.sparkles, this.rain]) {
      this.scene.remove(points);
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    }
  }
}
