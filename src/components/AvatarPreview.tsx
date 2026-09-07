import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildAvatarBody, type PlayerLook } from '../engine/entities/PlayerAvatar';

/** A little spinning 3D view of the kid's character. Updates as you tap. */
export function AvatarPreview({ look }: { look: PlayerLook }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; body: THREE.Group | null; frame: number } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(220, 260);
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 220 / 260, 0.1, 20);
    camera.position.set(0, 1.2, 4.6);
    camera.lookAt(0, 1.05, 0);
    scene.add(new THREE.HemisphereLight('#dff1ff', '#8ab86a', 1.4));
    const sun = new THREE.DirectionalLight('#fffbe8', 1.4);
    sun.position.set(2, 4, 3);
    scene.add(sun);
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 24), new THREE.MeshLambertMaterial({ color: '#3b4a7a' }));
    stage.position.y = -0.06;
    scene.add(stage);
    const state = { scene, renderer, camera, body: null as THREE.Group | null, frame: 0 };
    sceneRef.current = state;
    const tick = (): void => {
      if (state.body) state.body.rotation.y += 0.012;
      renderer.render(scene, camera);
      state.frame = requestAnimationFrame(tick);
    };
    state.frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(state.frame);
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    if (state.body) {
      state.scene.remove(state.body);
      state.body.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const m = child.material;
          for (const mat of Array.isArray(m) ? m : [m]) mat.dispose();
        }
      });
    }
    const parts = buildAvatarBody(look);
    parts.armLeft.rotation.x = 0.25;
    parts.armRight.rotation.x = -0.25;
    state.body = parts.group;
    state.scene.add(parts.group);
  }, [look]);

  return (
    <div className="avatar-preview" ref={hostRef} aria-label="Your character" role="img">
      <span className="avatar-preview-fallback" aria-hidden="true">
        {look.style === 'girl' ? '👧' : '👦'}
      </span>
    </div>
  );
}
