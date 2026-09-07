import * as THREE from 'three';
import type { SmoothKind } from '../blocks/BlockDefinition';
import type { TextureAtlas } from './TextureAtlas';

/**
 * Materials for Cinema's smooth surfaces. Standard PBR, but textured
 * triplanarly from the atlas: every vertex carries the atlas rect of its
 * block's top and side tiles (flat-interpolated), the fragment shader
 * projects them along the three axes by world position and blends by the
 * surface normal, so hills get grass on top and earth on their flanks
 * with no UV seams. Normal and roughness maps go through the same path.
 */

const TRIPLANAR_PARS = /* glsl */ `
flat varying vec4 vTileTop;
flat varying vec4 vTileSide;
varying vec3 vWPos;
varying vec3 vWNormal;
uniform vec3 fillColor;
uniform float dayLight;
varying float vSky;
varying float vBlock;

vec4 tileSample(sampler2D t, vec4 rect, vec2 p) {
  vec2 uv = rect.xy + fract(p) * rect.zw;
  return textureGrad(t, uv, dFdx(p) * rect.zw, dFdy(p) * rect.zw);
}

void triplanar(out vec3 weights, out vec4 topRect) {
  vec3 n = normalize(vWNormal);
  vec3 w = pow(abs(n), vec3(4.0));
  weights = w / (w.x + w.y + w.z);
  topRect = n.y > 0.0 ? vTileTop : vTileSide;
}
`;

export function createSmoothMaterials(atlas: TextureAtlas, dayLight: { value: number }): Record<SmoothKind, THREE.Material> {
  atlas.buildHiRes();
  const map = atlas.hiResTexture ?? atlas.texture ?? undefined;
  const normalMap = atlas.normalTexture ?? undefined;
  const roughnessMap = atlas.roughnessTexture ?? undefined;

  const make = (fill: string, extra: THREE.MeshStandardMaterialParameters): THREE.Material => {
    const material = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, roughness: 1, metalness: 0, envMapIntensity: 0.55, ...extra });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.dayLight = dayLight;
      shader.uniforms.fillColor = { value: new THREE.Color(fill) };
      shader.vertexShader =
        'attribute vec4 tileTop;\nattribute vec4 tileSide;\nattribute float skylight;\nattribute float blocklight;\n' +
        'flat varying vec4 vTileTop;\nflat varying vec4 vTileSide;\nvarying vec3 vWPos;\nvarying vec3 vWNormal;\nvarying float vSky;\nvarying float vBlock;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvTileTop = tileTop;\nvTileSide = tileSide;\nvWPos = (modelMatrix * vec4(position, 1.0)).xyz;\nvWNormal = normalize(mat3(modelMatrix) * normal);\nvSky = skylight;\nvBlock = blocklight;',
        );
      shader.fragmentShader =
        TRIPLANAR_PARS +
        shader.fragmentShader
          .replace(
            '#include <map_fragment>',
            [
              'vec3 tw; vec4 tTop; triplanar(tw, tTop);',
              'vec4 cx = tileSample(map, vTileSide, vWPos.zy);',
              'vec4 cy = tileSample(map, tTop, vWPos.xz);',
              'vec4 cz = tileSample(map, vTileSide, vWPos.xy);',
              'vec4 texel = cx * tw.x + cy * tw.y + cz * tw.z;',
              'diffuseColor.rgb *= mix(fillColor, texel.rgb, texel.a);',
            ].join('\n'),
          )
          .replace(
            '#include <roughnessmap_fragment>',
            [
              'float roughnessFactor = roughness;',
              '#ifdef USE_ROUGHNESSMAP',
              'vec4 rx = tileSample(roughnessMap, vTileSide, vWPos.zy);',
              'vec4 ry = tileSample(roughnessMap, tTop, vWPos.xz);',
              'vec4 rz = tileSample(roughnessMap, vTileSide, vWPos.xy);',
              'roughnessFactor *= (rx * tw.x + ry * tw.y + rz * tw.z).g;',
              '#endif',
            ].join('\n'),
          )
          .replace(
            '#include <normal_fragment_maps>',
            [
              '#ifdef USE_NORMALMAP',
              'vec3 nx = tileSample(normalMap, vTileSide, vWPos.zy).xyz * 2.0 - 1.0;',
              'vec3 ny = tileSample(normalMap, tTop, vWPos.xz).xyz * 2.0 - 1.0;',
              'vec3 nz = tileSample(normalMap, vTileSide, vWPos.xy).xyz * 2.0 - 1.0;',
              'vec3 bump = vec3(0.0, nx.y, nx.x) * tw.x + vec3(ny.x, 0.0, ny.y) * tw.y + vec3(nz.x, nz.y, 0.0) * tw.z;',
              'vec3 worldN = normalize(normalize(vWNormal) + bump * normalScale.x * 0.8);',
              'normal = normalize((viewMatrix * vec4(worldN, 0.0)).xyz);',
              '#endif',
            ].join('\n'),
          )
          .replace(
            '#include <dithering_fragment>',
            [
              'float voxelLight = max(vBlock, vSky * dayLight);',
              'float lightAmount = 0.07 + 0.93 * voxelLight;',
              'float warmth = clamp(vBlock - vSky * dayLight, 0.0, 1.0);',
              'gl_FragColor.rgb *= lightAmount * mix(vec3(1.0), vec3(1.08, 0.95, 0.78), warmth);',
              '#include <dithering_fragment>',
            ].join('\n'),
          );
    };
    material.customProgramCacheKey = () => `smooth-${fill}`;
    return material;
  };

  return {
    terrain: make('#8a6a44', { normalScale: new THREE.Vector2(1, 1) }),
    foliage: make('#3f9a4c', { normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.9 }),
    water: make('#3d8fd6', { transparent: true, opacity: 0.8, depthWrite: false, roughness: 0.06, metalness: 0.05, envMapIntensity: 1.3, normalScale: new THREE.Vector2(0.35, 0.35) }),
  };
}
