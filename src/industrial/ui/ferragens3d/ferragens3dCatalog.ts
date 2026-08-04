/**
 * Catálogo local das ferragens 3D (biblioteca isolada em /ferragens_3d/).
 * Apenas visualização — sem ligação ao sistema industrial / peças / Viewer principal.
 */

export interface Ferragem3DBoundingBoxMm {
  min: [number, number, number];
  max: [number, number, number];
  dimensoes: [number, number, number];
}

export interface Ferragem3DMedidas {
  tipo: string;
  norma?: string;
  dimensoes_mm?: Record<string, string | number>;
  material?: string;
  sistema_coordenadas?: string;
  escala?: string;
  bounding_box_mm?: Ferragem3DBoundingBoxMm;
  carga_nominal_kg?: number;
  abertura?: string;
}

export interface Ferragem3DEntry {
  id: string;
  label: string;
  modelUrl: string;
  medidas: Ferragem3DMedidas;
}

const modelUrlModules = import.meta.glob('../../../../ferragens_3d/*/modelo.gltf', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const medidasModules = import.meta.glob('../../../../ferragens_3d/*/medidas.json', {
  eager: true,
}) as Record<string, { default: Ferragem3DMedidas } | Ferragem3DMedidas>;

function folderIdFromGlobPath(globPath: string): string | null {
  const normalized = globPath.replace(/\\/g, '/');
  const match = normalized.match(/ferragens_3d\/([^/]+)\//);
  return match?.[1] ?? null;
}

function resolveMedidas(mod: { default: Ferragem3DMedidas } | Ferragem3DMedidas): Ferragem3DMedidas {
  if (mod && typeof mod === 'object' && 'default' in mod && mod.default) {
    return mod.default;
  }
  return mod as Ferragem3DMedidas;
}

function labelForId(id: string, tipo?: string): string {
  if (tipo) return `${id} · ${tipo}`;
  return id;
}

/** Lista estável de ferragens disponíveis para o painel de visualização. */
export function listFerragens3D(): Ferragem3DEntry[] {
  const medidasById = new Map<string, Ferragem3DMedidas>();
  for (const [path, mod] of Object.entries(medidasModules)) {
    const id = folderIdFromGlobPath(path);
    if (!id) continue;
    medidasById.set(id, resolveMedidas(mod));
  }

  const entries: Ferragem3DEntry[] = [];
  for (const [path, url] of Object.entries(modelUrlModules)) {
    const id = folderIdFromGlobPath(path);
    if (!id) continue;
    const medidas = medidasById.get(id) ?? { tipo: id };
    entries.push({
      id,
      label: labelForId(id, medidas.tipo),
      modelUrl: url,
      medidas,
    });
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id, 'pt'));
}

/** Dimensão máxima da bounding box em metros (para enquadramento da câmara). */
export function maxExtentMeters(entry: Ferragem3DEntry): number {
  const dims = entry.medidas.bounding_box_mm?.dimensoes;
  if (!dims?.length) return 0.12;
  return Math.max(...dims.map((d) => Math.abs(d))) / 1000;
}
