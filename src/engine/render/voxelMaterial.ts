import * as THREE from 'three';
import type { RenderBucket } from '../blocks/BlockDefinition';
import type { TextureAtlas } from './TextureAtlas';
import { CUTAWAY_FRAG, CUTAWAY_PARS, CUTAWAY_VERTEX, type Cutaway } from './cutaway';

/**
 * Teaches a material about the baked voxel light attributes. The shared
 * dayLight uniform dims sky light at night while block light (torches,
 * campfires) keeps glowing warm.
 */
export function patchVoxelLighting(material: THREE.Material, dayLight: { value: number }, cutaway?: Cutaway): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.dayLight = dayLight;
    if (cutaway) Object.assign(shader.uniforms, cutaway);
    shader.vertexShader =
      'attribute float skylight;\nattribute float blocklight;\nvarying float vSky;\nvarying float vBlock;\nvarying vec3 vCutPos;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvSky = skylight;\nvBlock = blocklight;\n${CUTAWAY_VERTEX}`,
      );
    shader.fragmentShader =
      'uniform float dayLight;\nvarying float vSky;\nvarying float vBlock;\n' +
      CUTAWAY_PARS +
      shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${CUTAWAY_FRAG}`).replace(
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

export type MaterialOptions = { pbr: boolean; cutaway?: Cutaway };

/** Flat (Lambert) or physically based (Standard) materials per bucket. */
export function createBucketMaterials(atlas: TextureAtlas, dayLight: { value: number }, options: MaterialOptions = { pbr: false }): Record<RenderBucket, THREE.Material> {
  const pbr = options.pbr && atlas.buildHiRes();
  const map = (pbr ? atlas.hiResTexture : atlas.texture) ?? undefined;
  const normalMap = pbr ? (atlas.normalTexture ?? undefined) : undefined;
  const roughnessMap = pbr ? (atlas.roughnessTexture ?? undefined) : undefined;
  const normalScale = new THREE.Vector2(0.9, 0.9);

  const standard = (extra: THREE.MeshStandardMaterialParameters): THREE.Material =>
    new THREE.MeshStandardMaterial({ map, normalMap, normalScale, roughnessMap, roughness: 1, metalness: 0, envMapIntensity: 0.35, ...extra });
  const lambert = (extra: THREE.MeshLambertMaterialParameters): THREE.Material => new THREE.MeshLambertMaterial({ map, ...extra });
  const make = pbr ? standard : lambert;

  const materials: Record<RenderBucket, THREE.Material> = {
    opaque: make({}),
    water: pbr
      ? standard({ transparent: true, opacity: 0.82, depthWrite: false, roughness: 0.08, envMapIntensity: 1.2, metalness: 0.1 })
      : lambert({ transparent: true, opacity: 0.8, depthWrite: false }),
    alpha: make({ transparent: true, alphaTest: 0.04, side: THREE.DoubleSide }),
    plants: make({ transparent: true, alphaTest: 0.04, side: THREE.DoubleSide }),
    glow: pbr
      ? standard({ emissive: new THREE.Color('#fff3c0'), emissiveIntensity: 1.6, emissiveMap: map, roughness: 0.5 })
      : lambert({ emissive: new THREE.Color('#fff3c0'), emissiveIntensity: 0.4, emissiveMap: map }),
  };
  for (const [bucket, material] of Object.entries(materials)) {
    if (bucket !== 'glow') patchVoxelLighting(material, dayLight, options.cutaway);
  }
  return materials;
}
