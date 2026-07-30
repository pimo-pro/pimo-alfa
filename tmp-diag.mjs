import * as THREE from 'three';
import { PanelFactory } from './src/3d/objects/PanelFactory.ts';
import { applyDrawerFrontMaterialToMesh, ensureDrawerFrontUnifiedGeometry, DRAWER_FRONT_EXTERIOR_FACE_INDEX, DRAWER_FRONT_INTERIOR_FACE_INDEX, resolveDrawerFrontFaceMaterialIndex } from './src/3d/objects/DrawerFactory.ts';

// ensureDrawerFrontUnifiedGeometry is not exported - diagnose via apply/create path only
const factory = new PanelFactory({
  resolvePanelMaterialOptions: (options) => options ?? { singleMaterial: new THREE.MeshStandardMaterial() },
});

function faceReport(mesh, label) {
  const geo = mesh.geometry;
  const normals = geo.getAttribute('normal');
  const pos = geo.getAttribute('position');
  const groups = geo.groups.length ? geo.groups : [{ start: 0, count: (geo.index?.count ?? pos.count), materialIndex: 0 }];
  const index = geo.index;
  const faces = [];
  for (let fi = 0; fi < 6; fi++) {
    const v0 = fi * 4;
    const n = { x: normals.getX(v0), y: normals.getY(v0), z: normals.getZ(v0) };
    const g = geo.groups[fi];
    faces.push({
      faceIndex: fi,
      assumedLabel: ['+X','-X','+Y','-Y','+Z','-Z'][fi],
      normal: n,
      materialIndex: g?.materialIndex ?? '(no group)',
      groupStart: g?.start,
      groupCount: g?.count,
    });
  }
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  console.log(JSON.stringify({
    label,
    isArray: Array.isArray(mesh.material),
    matCount: mats.length,
    sides: mats.map(m => m?.side),
    colors: mats.map(m => m?.color?.getHexString?.()),
    resolveIdx: resolveDrawerFrontFaceMaterialIndex(mesh),
    faces,
  }, null, 2));
}

const edge = new THREE.MeshStandardMaterial({ color: 0xb8a898, name: 'edge' });
const face = new THREE.MeshStandardMaterial({ color: 0xffffff, name: 'face-white' });
const mesh = factory.createPanel(0.4, 0.2, 0.019, 't', 'front', { edgeMaterial: edge, faceMaterial: face });
faceReport(mesh, 'BEFORE apply (edge/face)');
