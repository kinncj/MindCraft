import * as THREE from 'three';
import type { RenderBucket } from '../blocks/BlockDefinition';

/**
 * Teaches a material about the baked voxel light attributes. The shared
 * dayLight uniform dims sky light at night while block light (torches,
 * campfires) keeps glowing warm.
 */
export function patchVoxelLighting(material: THREE.Material, dayLight: { value: number }): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.dayLight = dayLight;
    shader.vertexShader =
      'attribute float skylight;\nattribute float blocklight;\nvarying float vSky;\nvarying float vBlock;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvSky = skylight;\nvBlock = blocklight;',
      );
    shader.fragmentShader =
      'uniform float dayLight;\nvarying float vSky;\nvarying float vBlock;\n' +
      shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        [
          'float voxelLight = max(vBlock, vSky * dayLight);',
          // Never pitch black (scary), and warm-tint torch-lit areas.
          'float lightAmount = 0.07 + 0.93 * voxelLight;',
          'float warmth = clamp(vBlock - vSky * dayLight, 0.0, 1.0);',
          'vec3 lightTint = mix(vec3(1.0), vec3(1.08, 0.95, 0.78), warmth);',
          'gl_FragColor.rgb *= lightAmount * lightTint;',
          '#include <dithering_fragment>',
        ].join('\n'),
      );
  };
  material.customProgramCacheKey = () => 'voxel-light';
}

export function createBucketMaterials(
  atlas: THREE.Texture | null,
  dayLight: { value: number },
): Record<RenderBucket, THREE.Material> {
  const map = atlas ?? undefined;
  const materials: Record<RenderBucket, THREE.Material> = {
    opaque: new THREE.MeshLambertMaterial({ map, vertexColors: false }),
    water: new THREE.MeshLambertMaterial({ map, transparent: true, opacity: 0.8, depthWrite: false }),
    alpha: new THREE.MeshLambertMaterial({ map, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide }),
    glow: new THREE.MeshLambertMaterial({
      map,
      emissive: new THREE.Color('#fff3c0'),
      emissiveIntensity: 0.4,
      emissiveMap: map,
    }),
  };
  for (const [bucket, material] of Object.entries(materials)) {
    if (bucket !== 'glow') patchVoxelLighting(material, dayLight);
  }
  return materials;
}
