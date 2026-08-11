import * as THREE from 'three';
import { DELUXE, DELUXE_BASE, NO_BORDER } from './borderFx';

export class BorderFactory {
  static create(type: number, hexColor1?: string, hexColor2?: string): THREE.Group {
    const group = new THREE.Group();
    (group.userData as any).borderType = parseInt(type as any);
    (group.userData as any).timeOffset = Math.random() * 100;
    /*
     * No border at all — not even the lit outline every other option starts from. The card
     * stands on the table as the card, and nothing is drawn around it.
     */
    if (parseInt(type as any) === NO_BORDER) return group;
    const color1 = new THREE.Color(hexColor1 || '#3b82f6');
    const color2 = new THREE.Color(hexColor2 || hexColor1 || '#ef4444');
    const w = 2.4, h = 3.6, d = 0.08;

    const wireMat = new THREE.ShaderMaterial({
      vertexShader: "varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec3 vPos; uniform vec3 c1; uniform vec3 c2; void main() { float t = clamp(((-vPos.x / 1.5 + vPos.y / 2.0) + 1.2) / 2.4, 0.0, 1.0); vec3 col = mix(c2, c1, t); gl_FragColor = vec4(col, 0.42); }",
      uniforms: { c1: { value: color1 }, c2: { value: color2 } },
      wireframe: true, transparent: true
    });

    const glowMat = new THREE.ShaderMaterial({
      vertexShader: "varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec3 vPos; uniform vec3 c1; uniform vec3 c2; void main() { float t = clamp(((-vPos.x / 1.5 + vPos.y / 2.0) + 1.2) / 2.4, 0.0, 1.0); vec3 col = mix(c2, c1, t); gl_FragColor = vec4(col, 0.85); }",
      uniforms: { c1: { value: color1 }, c2: { value: color2 } },
      transparent: true, blending: THREE.AdditiveBlending
    });
    
    // Base Outline
    const outline = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.ShaderMaterial({
      vertexShader: "uniform float t; varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * t, 1.0); }",
      fragmentShader: "varying vec3 vPos; uniform vec3 c1; uniform vec3 c2; void main() { float t = clamp(((-vPos.x / 1.5 + vPos.y / 2.0) + 1.2) / 2.4, 0.0, 1.0); vec3 col = mix(c2, c1, t); gl_FragColor = vec4(col, 1.0); }",
      uniforms: { t: { value: 0.02 }, c1: { value: color1 }, c2: { value: color2 } },
      side: THREE.BackSide
    }));
    group.add(outline);
    (group.userData as any).outline = outline;

    /*
     * The deluxe set lives above `DELUXE_BASE` and is opt-in only: a card with no
     * `art.border` takes `seedOf(id) % 17`, which can never reach up here, so none of
     * these appear in the card pool unless somebody chooses one in the designer.
     */
    const idx = parseInt(type as any);
    if (idx >= DELUXE_BASE) {
      const fx = DELUXE.find((d) => d.id === idx)?.build(color1, color2);
      if (fx) {
        group.add(fx.group);
        (group.userData as any).fx = fx.update;
        return group;
      }
    }

    switch(parseInt(type as any)) {
      case 2: { // Thunder Storm
        const pts: THREE.Vector3[] = [];
        for(let i=0; i<=20; i++) pts.push(new THREE.Vector3(-1.3 + 2.6*(i/20), 1.9, 0));
        for(let i=0; i<=30; i++) pts.push(new THREE.Vector3(1.3, 1.9 - 3.8*(i/30), 0));
        for(let i=0; i<=20; i++) pts.push(new THREE.Vector3(1.3 - 2.6*(i/20), -1.9, 0));
        for(let i=0; i<=30; i++) pts.push(new THREE.Vector3(-1.3, -1.9 + 3.8*(i/30), 0));
        const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
        (lineGeom.userData as any) = { origPos: lineGeom.attributes.position.clone() };
        const line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({color: 0xffffff, linewidth: 2}));
        const lineGlow = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({color: color1, transparent:true, opacity: 0.6}));
        group.add(line); group.add(lineGlow);
        (group.userData as any).lines = [line, lineGlow];
        break;
      }
      case 8: { // Energy Shield
        const shield = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.8, 0.2), wireMat);
        group.add(shield); (group.userData as any).shield = shield;
        break;
      }
      case 9: { // Void Shards
        const shards = new THREE.Group();
        for(let i=0; i<12; i++) {
          const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1+Math.random()*0.1), glowMat);
          s.position.set((Math.random()-0.5)*2.6, (Math.random()-0.5)*3.8, (Math.random()-0.5)*0.5);
          shards.add(s);
        }
        group.add(shards); (group.userData as any).shards = shards;
        break;
      }
      case 11: { // Quantum Strings
        // Was 2.6 x 3.8 — larger than the 1.8 x 2.7 card, so the lattice spilled
        // across its neighbours. Sized to the card it belongs to.
        const strGeom = new THREE.PlaneGeometry(1.78, 2.66, 12, 12);
        (strGeom.userData as any) = { orig: strGeom.attributes.position.clone() };
        const strMesh = new THREE.Mesh(strGeom, wireMat);
        strMesh.position.z = 0.1; group.add(strMesh); (group.userData as any).strings = strMesh;
        break;
      }
      case 16: { // Matrix Rain
        const matrix = new THREE.Group();
        for(let i=0; i<10; i++) {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.5), glowMat);
          m.position.set(-1.2 + 2.4*(i/9), 2, 0.1); matrix.add(m);
        }
        group.add(matrix); (group.userData as any).matrix = matrix;
        break;
      }
    }
    return group;
  }

  static update(group: THREE.Group, t: number) {
    if(!group) return;
    const time = t + ((group.userData as any).timeOffset || 0);
    const type = (group.userData as any).borderType;

    const fx = (group.userData as any).fx as ((t: number) => void) | undefined;
    if (fx) {
      if ((group.userData as any).outline) {
        (group.userData as any).outline.material.uniforms.t.value = 0.02 + Math.sin(time * 3) * 0.005;
      }
      fx(time);
      return;
    }
    
    if((group.userData as any).outline) {
      (group.userData as any).outline.material.uniforms.t.value = 0.02 + Math.sin(time * 3) * 0.005;
    }

    switch(type) {
      case 2:
        if((group.userData as any).lines && Math.floor(time*15) % 2 === 0) { 
          (group.userData as any).lines.forEach((line: THREE.Line) => {
            const geom = line.geometry;
            const pos = geom.attributes.position as THREE.BufferAttribute;
            const orig = (geom.userData as any).origPos;
            for(let i=0; i<pos.count; i++) {
              pos.setX(i, orig.getX(i) + (Math.random()-0.5)*0.2);
              pos.setY(i, orig.getY(i) + (Math.random()-0.5)*0.2);
            }
            pos.needsUpdate = true;
          });
        }
        break;
      case 8:
        if((group.userData as any).shield) {
          const s = 1 + Math.sin(time * 4)*0.05;
          (group.userData as any).shield.scale.set(s, s, s);
        }
        break;
      case 9:
        if((group.userData as any).shards) {
          (group.userData as any).shards.rotation.z = time * 0.2;
          (group.userData as any).shards.children.forEach((s: THREE.Object3D) => { s.rotation.x += 0.05; });
        }
        break;
      case 11:
        if((group.userData as any).strings) {
          const pos = (group.userData as any).strings.geometry.attributes.position as THREE.BufferAttribute;
          const orig = (group.userData as any).strings.geometry.userData.orig;
          for(let i=0; i<pos.count; i++) pos.setZ(i, Math.sin(time*5 + orig.getX(i) + orig.getY(i))*0.2);
          pos.needsUpdate = true;
        }
        break;
      case 16:
        if((group.userData as any).matrix) {
          (group.userData as any).matrix.children.forEach((m: THREE.Object3D, i: number) => {
            m.position.y -= 0.05 + i*0.01;
            if(m.position.y < -2) m.position.y = 2;
          });
        }
        break;
    }
  }
}

export function createHologramGroup(typeIndex: number, hexColor1?: string, hexColor2?: string): THREE.Group {
  const group = new THREE.Group();
  const color1 = new THREE.Color(hexColor1 || '#3b82f6');
  const color2 = new THREE.Color(hexColor2 || hexColor1 || '#ef4444');

  const solidMat = new THREE.MeshToonMaterial({
    color: 0x0a0a0a,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const wireMat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vPos; uniform vec3 c1; uniform vec3 c2; void main() { float t = clamp(((-vPos.x + vPos.y) + 1.0) / 2.0, 0.0, 1.0); vec3 col = mix(c2, c1, t); gl_FragColor = vec4(col, 0.85); }',
    uniforms: { c1: { value: color1 }, c2: { value: color2 } },
    wireframe: true,
    transparent: true,
  });

  const outlineMat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vPos; uniform float thickness; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * thickness, 1.0); }',
    fragmentShader: 'varying vec3 vPos; uniform vec3 c1; uniform vec3 c2; void main() { float t = clamp(((-vPos.x + vPos.y) + 1.0) / 2.0, 0.0, 1.0); vec3 col = mix(c2, c1, t); gl_FragColor = vec4(col, 1.0); }',
    uniforms: { thickness: { value: 0.03 }, c1: { value: color1 }, c2: { value: color2 } },
    side: THREE.BackSide,
    depthWrite: true,
  });

  function addCompoundMesh(geom: THREE.BufferGeometry, scale = 1) {
    const s = new THREE.Mesh(geom, solidMat);
    const w = new THREE.Mesh(geom, wireMat);
    const o = new THREE.Mesh(geom, outlineMat);
    s.scale.setScalar(scale);
    w.scale.setScalar(scale);
    o.scale.setScalar(scale);
    group.add(s, w, o);
  }

  switch (parseInt(typeIndex as any)) {
    case 0:
      addCompoundMesh(new THREE.IcosahedronGeometry(0.5, 1));
      break;
    case 1: // 神聖真理之眼
      addCompoundMesh(new THREE.TorusGeometry(0.6, 0.05, 8, 24));
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), wireMat);
      pupil.scale.z = 0.2;
      group.add(pupil);
      break;
    case 2:
      addCompoundMesh(new THREE.BoxGeometry(0.6, 0.6, 0.6));
      break;
    case 3:
      addCompoundMesh(new THREE.TorusKnotGeometry(0.35, 0.1, 64, 12));
      break;
    case 4:
      addCompoundMesh(new THREE.ConeGeometry(0.6, 0.8, 4));
      break;
    case 5: // 量子糾纏環
      addCompoundMesh(new THREE.TorusGeometry(0.5, 0.1, 16, 32));
      const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 16, 32), wireMat);
      r2.rotation.x = Math.PI / 2;
      group.add(r2);
      break;
    case 6:
      addCompoundMesh(new THREE.OctahedronGeometry(0.5, 0));
      break;
    case 7:
      addCompoundMesh(new THREE.TorusKnotGeometry(0.4, 0.05, 100, 8, 2, 5));
      break;
    case 8:
      addCompoundMesh(new THREE.DodecahedronGeometry(0.5, 0));
      break;
    case 9: // 終極禁忌陣列
      addCompoundMesh(new THREE.OctahedronGeometry(0.3, 0));
      addCompoundMesh(new THREE.TorusGeometry(0.7, 0.02, 8, 8));
      addCompoundMesh(new THREE.TorusGeometry(0.9, 0.02, 8, 12));
      break;
    case 10:
      addCompoundMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16));
      break;
    case 11: // 星體軌道
      addCompoundMesh(new THREE.SphereGeometry(0.3, 16, 16));
      const orb = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.65, 32), wireMat);
      group.add(orb);
      break;
    case 12:
      addCompoundMesh(new THREE.IcosahedronGeometry(0.5, 0));
      break;
    case 13: // 梅爾卡巴
      addCompoundMesh(new THREE.TetrahedronGeometry(0.5, 0));
      const t2 = new THREE.Mesh(new THREE.TetrahedronGeometry(0.5, 0), wireMat);
      t2.rotation.x = Math.PI;
      group.add(t2);
      break;
    case 14:
      addCompoundMesh(new THREE.OctahedronGeometry(0.6, 1));
      break;
    case 15:
      addCompoundMesh(new THREE.SphereGeometry(0.5, 8, 8));
      break;
    case 16:
      addCompoundMesh(new THREE.TorusGeometry(0.4, 0.15, 16, 16));
      break;
    case 17:
      addCompoundMesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 32));
      break;
    case 18:
      addCompoundMesh(new THREE.TorusGeometry(0.5, 0.2, 8, 24));
      break;
    case 19:
      addCompoundMesh(new THREE.TorusKnotGeometry(0.4, 0.1, 64, 8, 1, 3));
      break;
    default:
      addCompoundMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5));
      break;
  }
  return group;
}
