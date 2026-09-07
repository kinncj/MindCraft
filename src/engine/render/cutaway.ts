import * as THREE from 'three';

/**
 * The see-through camera: blocks inside a tube between the camera and the
 * character are dithered away, so walls and hills never hide the kid.
 * Shared uniforms; the engine moves the tube every frame. Radius 0 = off.
 */
export type Cutaway = { cutFrom: { value: THREE.Vector3 }; cutTo: { value: THREE.Vector3 }; cutRadius: { value: number } };

export function createCutaway(): Cutaway {
  return { cutFrom: { value: new THREE.Vector3() }, cutTo: { value: new THREE.Vector3() }, cutRadius: { value: 0 } };
}

export const CUTAWAY_PARS = /* glsl */ `
uniform vec3 cutFrom;
uniform vec3 cutTo;
uniform float cutRadius;
varying vec3 vCutPos;

/** 1 = keep, 0 = cut. A screen-door fade near the tube's edge so it never pops. */
float cutawayKeep() {
  if (cutRadius <= 0.0) return 1.0;
  vec3 seg = cutTo - cutFrom;
  float len2 = max(dot(seg, seg), 0.0001);
  float t = clamp(dot(vCutPos - cutFrom, seg) / len2, 0.0, 1.0);
  // Only between the camera and the character, never past the character.
  if (t > 0.92) return 1.0;
  float d = length(vCutPos - (cutFrom + seg * t));
  float fade = smoothstep(cutRadius * 0.6, cutRadius, d);
  return fade;
}
`;

/** Dither-discard: uses a 4×4 Bayer pattern so the edge fades instead of jumping. */
export const CUTAWAY_FRAG = /* glsl */ `
{
  float keep = cutawayKeep();
  if (keep < 1.0) {
    vec2 px = floor(gl_FragCoord.xy);
    float bayer = mod(px.x, 4.0) * 4.0 + mod(px.y, 4.0);
    float threshold = (mod(bayer * 9.0, 16.0) + 0.5) / 16.0;
    if (keep < threshold) discard;
  }
}
`;

export const CUTAWAY_VERTEX = 'vCutPos = (modelMatrix * vec4(position, 1.0)).xyz;';
