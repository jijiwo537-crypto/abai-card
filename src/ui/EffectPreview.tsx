/**
 * A live 3D preview of a card's battlefield presentation, for the card designer.
 *
 * Choosing a border effect and a floating emblem from a dropdown you cannot see is no
 * choice at all, so this is the real thing: the same `BorderFactory` and hologram builder
 * the board uses, over the same card face, lit and turning. It rebuilds whenever the
 * selection changes and tears its own scene down on unmount.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BorderFactory, createHologramGroup } from '../render/cardVisuals';
import { renderCardCanvas } from '../render/cardFace';
import type { CardDef } from '../game/types';

interface Props {
  card: CardDef;
  c1: string;
  c2: string;
  border: number;
  holo: number;
}

export const EffectPreview: React.FC<Props> = ({ card, c1, c2, border, holo }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    stage: THREE.Group;
    raf: number;
  } | null>(null);

  // The renderer is built once and kept; only the contents of `stage` change.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, host.clientWidth / host.clientHeight, 0.1, 60);
    camera.position.set(0, 0, 8.2);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2, 3, 5);
    scene.add(key);

    const stage = new THREE.Group();
    scene.add(stage);

    const state = { renderer, scene, camera, stage, raf: 0 };
    sceneRef.current = state;

    const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      const borderGroup = stage.getObjectByName('border') as THREE.Group | undefined;
      if (borderGroup) BorderFactory.update(borderGroup, t);
      const holoGroup = stage.getObjectByName('holo') as THREE.Group | undefined;
      if (holoGroup) {
        holoGroup.rotation.y = t * 0.7;
        holoGroup.rotation.x = Math.sin(t * 0.5) * 0.24;
      }
      // A slow rock, so the border's depth reads.
      stage.rotation.y = Math.sin(t * 0.45) * 0.3;
      stage.rotation.x = Math.sin(t * 0.32) * 0.1;
      renderer.render(scene, camera);
      state.raf = requestAnimationFrame(loop);
    };
    state.raf = requestAnimationFrame(loop);

    const onResize = () => {
      if (!host.clientWidth) return;
      renderer.setSize(host.clientWidth, host.clientHeight);
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(state.raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);

  // Rebuild the card, its border and its emblem whenever the design changes.
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    const { stage } = state;

    for (const child of [...stage.children]) {
      stage.remove(child);
      child.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
    }

    const tex = new THREE.CanvasTexture(renderCardCanvas(card, 0.5));
    tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 2.7, 0.06),
      [
        new THREE.MeshBasicMaterial({ color: 0x0b0b10 }),
        new THREE.MeshBasicMaterial({ color: 0x0b0b10 }),
        new THREE.MeshBasicMaterial({ color: 0x0b0b10 }),
        new THREE.MeshBasicMaterial({ color: 0x0b0b10 }),
        new THREE.MeshBasicMaterial({ map: tex }),
        new THREE.MeshBasicMaterial({ color: 0x0b0b10 }),
      ],
    );
    stage.add(face);

    const borderGroup = BorderFactory.create(border, c1, c2);
    borderGroup.name = 'border';
    borderGroup.scale.setScalar(0.75);
    stage.add(borderGroup);

    const holoGroup = createHologramGroup(holo, c1, c2);
    holoGroup.name = 'holo';
    holoGroup.position.set(0, 0.42, 0.55);
    holoGroup.scale.setScalar(0.78);
    stage.add(holoGroup);
  }, [card, c1, c2, border, holo]);

  return <div className="dsg-3d" ref={hostRef} />;
};
