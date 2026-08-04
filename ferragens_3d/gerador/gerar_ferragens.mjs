#!/usr/bin/env node
/**
 * GERADOR DE FERRAGENS 3D — PIMO-Criativo (biblioteca isolada) — v2
 * ------------------------------------------------------------------
 * Gera ficheiros GLB (glTF 2.0 binário) com geometria primitiva
 * (caixas/cilindros) em escala 1:1, dimensões reais em METROS,
 * sistema de coordenadas right-handed (X direita, Y cima, Z observador).
 *
 * v2 — alterações:
 *   • Dobradiça de porta: INALTERADA (mantida exatamente como v1)
 *   • Corrediças: série parametrizada 250/300/350/400/450/500 mm
 *   • Cavilhas: removidas Ø6 e Ø8; mantida apenas Ø10×35
 *   • Parafusos: mantidos 3×30 e 4×50; novos 4×35, 5×50, 3.5×16
 *   • medidas.json inclui bounding box real (mm) calculada da geometria
 *
 * NÃO toca em nenhum ficheiro do projeto principal.
 * Saída: /ferragens_3d/<nome>/modelo.gltf + medidas.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, '..');

/* ------------------------------------------------------------------ */
/*  Utilitários de geometria                                           */
/* ------------------------------------------------------------------ */

/** Caixa centrada na origem, dimensões (dx, dy, dz) em metros. */
function caixa(dx, dy, dz) {
  const hx = dx / 2, hy = dy / 2, hz = dz / 2;
  const v = [
    [-hx, -hy, -hz], [ hx, -hy, -hz], [ hx,  hy, -hz], [-hx,  hy, -hz],
    [-hx, -hy,  hz], [ hx, -hy,  hz], [ hx,  hy,  hz], [-hx,  hy,  hz],
  ];
  const faces = [
    { idx: [4,5,6, 4,6,7], n: [0,0,1] },
    { idx: [1,0,3, 1,3,2], n: [0,0,-1] },
    { idx: [5,1,2, 5,2,6], n: [1,0,0] },
    { idx: [0,4,7, 0,7,3], n: [-1,0,0] },
    { idx: [3,7,6, 3,6,2], n: [0,1,0] },
    { idx: [4,0,1, 4,1,5], n: [0,-1,0] },
  ];
  const pos = [], norm = [], idx = [];
  for (const f of faces) {
    for (const i of f.idx) {
      pos.push(...v[i]);
      norm.push(...f.n);
    }
    const base = idx.length;
    idx.push(base, base + 1, base + 2);
  }
  return { pos, norm, idx };
}

/** Cilindro ao longo do eixo Y, raio r, altura h, segmentos. */
function cilindro(r, h, seg = 24) {
  const pos = [], norm = [], idx = [];
  const hy = h / 2;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    const x0 = Math.cos(a0), z0 = Math.sin(a0);
    const x1 = Math.cos(a1), z1 = Math.sin(a1);
    const base = pos.length / 3;
    pos.push(x0 * r, -hy, z0 * r, x1 * r, -hy, z1 * r, x1 * r, hy, z1 * r, x0 * r, hy, z0 * r);
    norm.push(x0, 0, z0, x1, 0, z1, x1, 0, z1, x0, 0, z0);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  for (const sgn of [1, -1]) {
    const center = pos.length / 3;
    pos.push(0, sgn * hy, 0);
    norm.push(0, sgn, 0);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      const base = pos.length / 3;
      pos.push(Math.cos(a0) * r, sgn * hy, Math.sin(a0) * r, Math.cos(a1) * r, sgn * hy, Math.sin(a1) * r);
      norm.push(0, sgn, 0, 0, sgn, 0);
      if (sgn === 1) idx.push(center, base + 1, base);
      else idx.push(center, base, base + 1);
    }
  }
  return { pos, norm, idx };
}

/** Cilindro orientado ao longo do eixo Z (para parafusos horizontais). */
function cilindroZ(r, h, seg = 24) {
  const c = cilindro(r, h, seg);
  const rot = (p) => [p[0], -p[2], p[1]];
  const pos = [], norm = [];
  for (let i = 0; i < c.pos.length; i += 3) {
    const p = rot([c.pos[i], c.pos[i + 1], c.pos[i + 2]]);
    pos.push(...p);
  }
  for (let i = 0; i < c.norm.length; i += 3) {
    const n = rot([c.norm[i], c.norm[i + 1], c.norm[i + 2]]);
    norm.push(...n);
  }
  return { pos, norm, idx: c.idx };
}

/** Desloca uma malha por (dx, dy, dz) em metros. */
function deslocar(mesh, dx, dy, dz) {
  for (let i = 0; i < mesh.pos.length; i += 3) {
    mesh.pos[i] += dx;
    mesh.pos[i + 1] += dy;
    mesh.pos[i + 2] += dz;
  }
  return mesh;
}

/** Calcula bounding box real (metros) de um conjunto de malhas. */
function calcularBoundingBox(malhas) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const m of malhas) {
    for (let i = 0; i < m.mesh.pos.length; i += 3) {
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], m.mesh.pos[i + a]);
        max[a] = Math.max(max[a], m.mesh.pos[i + a]);
      }
    }
  }
  return { min, max };
}

/** Converte bounding box (metros) para mm arredondados a 2 casas. */
function bboxParaMm(bbox) {
  const r2 = (v) => Math.round(v * 1000 * 100) / 100;
  const min = bbox.min.map(r2);
  const max = bbox.max.map(r2);
  return {
    min,
    max,
    dimensoes: [r2(bbox.max[0] - bbox.min[0]), r2(bbox.max[1] - bbox.min[1]), r2(bbox.max[2] - bbox.min[2])],
  };
}

/* ------------------------------------------------------------------ */
/*  Serialização GLTF                                                  */
/* ------------------------------------------------------------------ */

function float32(arr) {
  const b = new Float32Array(arr);
  return Buffer.from(b.buffer, b.byteOffset, b.byteLength);
}
function uint16(arr) {
  const b = new Uint16Array(arr);
  return Buffer.from(b.buffer, b.byteOffset, b.byteLength);
}

function construirGLTF(malhas) {
  const buffers = [];
  const bufferViews = [];
  const accessors = [];
  const meshes = [];
  const nodes = [];
  const materials = [];

  let offset = 0;
  const pushBuffer = (buf) => {
    buffers.push(buf);
    const start = offset;
    offset += buf.length;
    return start;
  };

  malhas.forEach((m) => {
    const posBuf = float32(m.mesh.pos);
    const normBuf = float32(m.mesh.norm);
    const idxBuf = uint16(m.mesh.idx);

    const posStart = pushBuffer(posBuf);
    const normStart = pushBuffer(normBuf);
    const idxStart = pushBuffer(idxBuf);

    const posView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: posStart, byteLength: posBuf.length, target: 34962 });
    const normView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: normStart, byteLength: normBuf.length, target: 34962 });
    const idxView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: idxStart, byteLength: idxBuf.length, target: 34963 });

    const posAcc = accessors.length;
    accessors.push({ bufferView: posView, componentType: 5126, count: m.mesh.pos.length / 3, type: 'VEC3', min: [0,0,0], max: [0,0,0] });
    const normAcc = accessors.length;
    accessors.push({ bufferView: normView, componentType: 5126, count: m.mesh.norm.length / 3, type: 'VEC3' });
    const idxAcc = accessors.length;
    accessors.push({ bufferView: idxView, componentType: 5123, count: m.mesh.idx.length, type: 'SCALAR' });

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < m.mesh.pos.length; k += 3) {
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], m.mesh.pos[k + a]);
        max[a] = Math.max(max[a], m.mesh.pos[k + a]);
      }
    }
    accessors[posAcc].min = min;
    accessors[posAcc].max = max;

    const mat = materials.length;
    materials.push({
      pbrMetallicRoughness: {
        baseColorFactor: [...m.color, 1.0],
        metallicFactor: 0.2,
        roughnessFactor: 0.6,
      },
      name: m.name + '_mat',
    });

    const meshIdx = meshes.length;
    meshes.push({
      primitives: [{ attributes: { POSITION: posAcc, NORMAL: normAcc }, indices: idxAcc, material: mat }],
      name: m.name,
    });

    nodes.push({ mesh: meshIdx, name: m.name });
  });

  const totalLen = offset;
  const bufferData = Buffer.concat(buffers);

  const gltf = {
    asset: { version: '2.0', generator: 'PIMO-Ferragens3D-Gerador-v2', copyright: 'PIMO-Criativo — biblioteca isolada' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i), name: 'Cena' }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: totalLen }],
  };

  const json = Buffer.from(JSON.stringify(gltf));
  const bin = bufferData;

  const glbHeader = Buffer.alloc(12);
  glbHeader.writeUInt32LE(0x46546C67, 0);
  glbHeader.writeUInt32LE(2, 4);
  glbHeader.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(json.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4);

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(bin.length, 0);
  binChunkHeader.writeUInt32LE(0x004E4942, 4);

  return Buffer.concat([glbHeader, jsonChunkHeader, json, binChunkHeader, bin]);
}

/* ------------------------------------------------------------------ */
/*  Definição das ferragens                                            */
/* ------------------------------------------------------------------ */

const FERRAGENS = [];

/* 1. DOBRADIÇA DE PORTA — INALTERADA (v1) -------------------------- */
{
  const nome = 'dobradica_porta';
  const malhas = [];
  malhas.push({ name: 'placa', mesh: caixa(0.045, 0.0015, 0.045), color: [0.75, 0.75, 0.78] });
  const copo = deslocar(cilindro(0.0175, 0.0115, 24), 0, -0.0065, 0);
  malhas.push({ name: 'copo', mesh: copo, color: [0.6, 0.6, 0.62] });
  malhas.push({ name: 'braco', mesh: caixa(0.030, 0.008, 0.002), color: [0.55, 0.55, 0.58] });
  FERRAGENS.push({ nome, malhas, medidas: {
    tipo: 'Dobradiça de porta europeia (copo 35mm)',
    norma: 'EN 15570 / DIN 355',
    dimensoes_mm: { placa: '45 x 45 x 1.5', copo_diametro: 35, copo_profundidade: 11.5, braco: '30 x 8 x 2' },
    abertura: '95° - 110° (conforme versão)',
    material: 'Aço zincado / latão',
    sistema_coordenadas: 'Placa no plano XZ, copo orientado para -Y, braço em +Y',
    escala: '1:1 (metros no ficheiro)',
  } });
}

/* 2. CORREDIÇAS DE GAVETA — série parametrizada 250–500mm ---------- */
function criarCorredica(comprimentoMm) {
  const nome = 'corredica_gaveta_' + comprimentoMm;
  const comp = comprimentoMm / 1000;
  const larg = 0.027, alt = 0.012;
  const malhas = [];
  // Trilho fixo (corpo)
  malhas.push({ name: 'trilho_fixo', mesh: caixa(comp, alt, larg), color: [0.5, 0.5, 0.52] });
  // Trilho móvel (telescópico) — ligeiramente mais curto, deslocado em Z
  const movel = deslocar(caixa(comp - 0.010, alt * 0.7, larg * 0.7), 0, 0, 0.012);
  malhas.push({ name: 'trilho_movel', mesh: movel, color: [0.65, 0.65, 0.68] });
  // Rolamentos (esferas) — 3, espaçados proporcionalmente ao comprimento
  for (let k = 0; k < 3; k++) {
    const x = (k - 1) * comp * 0.3;
    const esfera = deslocar(cilindro(0.003, 0.003, 16), x, 0, 0.006);
    malhas.push({ name: 'rolamento_' + k, mesh: esfera, color: [0.85, 0.85, 0.85] });
  }
  FERRAGENS.push({ nome, malhas, medidas: {
    tipo: 'Corrediça de gaveta telescópica (slide) — ' + comprimentoMm + 'mm',
    norma: 'EN 15570 (carga) / série industrial ' + comprimentoMm + 'mm',
    dimensoes_mm: { comprimento: comprimentoMm, largura: 27, altura: 12, extensao: '100% (full extension)' },
    carga_nominal_kg: 35,
    material: 'Aço laminado a frio, zincado',
    sistema_coordenadas: 'Trilho ao longo do eixo X, largura em Z, altura em Y',
    escala: '1:1 (metros no ficheiro)',
  } });
}
[250, 300, 350, 400, 450, 500].forEach(criarCorredica);

/* 3. CAVILHA 10mm (única mantida) ---------------------------------- */
{
  const nome = 'cavilha_10mm';
  const malhas = [];
  malhas.push({ name: 'cavilha', mesh: cilindro(0.005, 0.035, 24), color: [0.72, 0.55, 0.32] });
  FERRAGENS.push({ nome, malhas, medidas: {
    tipo: 'Cavilha / Chaveta / Espiga (pino de madeira)',
    norma: 'DIN 68840 / EN 14257',
    dimensoes_mm: { diametro: 10, comprimento: 35, tolerancia: 'h9' },
    material: 'Faia (Fagus sylvatica)',
    sistema_coordenadas: 'Eixo longitudinal ao longo de Y',
    escala: '1:1 (metros no ficheiro)',
  } });
}

/* 4. PARAFUSOS — série parametrizada --------------------------------- */
function criarParafuso(nome, diametro, comprimento, cabecaDiametro, cabecaAltura, passo) {
  const malhas = [];
  const d = diametro / 1000, c = comprimento / 1000;
  const cd = cabecaDiametro / 1000, ca = cabecaAltura / 1000;
  // Corpo roscado: centrado na origem, de -c/2 a +c/2 ao longo de Z
  malhas.push({ name: 'corpo', mesh: cilindroZ(d / 2, c, 20), color: [0.75, 0.75, 0.78] });
  // Cabeça: contígua ao corpo, de +c/2 a +c/2+ca
  const cabeca = deslocar(cilindroZ(cd / 2, ca, 20), 0, 0, c / 2 + ca / 2);
  malhas.push({ name: 'cabeca', mesh: cabeca, color: [0.8, 0.8, 0.82] });
  FERRAGENS.push({ nome, malhas, medidas: {
    tipo: 'Parafuso de madeira (rosca parcial)',
    norma: 'DIN 7997 / EN 14592',
    dimensoes_mm: { diametro: diametro, comprimento: comprimento, cabeca_diametro: cabecaDiametro, cabeca_altura: cabecaAltura, passo_rosca: passo },
    material: 'Aço zincado',
    sistema_coordenadas: 'Eixo longitudinal ao longo de Z, cabeça em +Z',
    escala: '1:1 (metros no ficheiro)',
  } });
}

criarParafuso('parafuso_3x30',    3,   30, 6,   3,   1.0);
criarParafuso('parafuso_4x35',    4,   35, 8,   4,   1.3);
criarParafuso('parafuso_4x50',    4,   50, 8,   4,   1.3);
criarParafuso('parafuso_5x50',    5,   50, 10,  5,   1.6);
criarParafuso('parafuso_3.5x16',  3.5, 16, 7,   3.5, 1.2);

/* ------------------------------------------------------------------ */
/*  Geração                                                            */
/* ------------------------------------------------------------------ */

for (const f of FERRAGENS) {
  const dir = join(RAIZ, f.nome);
  mkdirSync(dir, { recursive: true });
  const glb = construirGLTF(f.malhas);
  writeFileSync(join(dir, 'modelo.gltf'), glb);

  // bounding box real calculada da geometria (mm)
  const bbox = bboxParaMm(calcularBoundingBox(f.malhas));
  const medidas = { ...f.medidas, bounding_box_mm: bbox };
  writeFileSync(join(dir, 'medidas.json'), JSON.stringify(medidas, null, 2) + '\n');
  console.log(`✔ ${f.nome.padEnd(20)} (${(glb.length / 1024).toFixed(1).padStart(6)} KB)  bbox=${bbox.dimensoes.map(v => v + 'mm').join(' x ')}`);
}

console.log(`\nGeradas ${FERRAGENS.length} ferragens em ${RAIZ}`);