export type RemateType = "completo" | "avista" | "L" | "rodape";

export type RematePosition = "dir" | "esq" | "cima" | "baixo" | "rodape";

export type RemateMaterialMode = "box" | "door" | "aluminio" | "custom";

export type RemateDimensions = {
  widthMm: number;
  heightMm: number;
  depthMm: number;
};

export type RemateTransform = {
  xMm?: number;
  yMm?: number;
  zMm?: number;
  rotacaoXRad?: number;
  rotacaoYRad?: number;
  rotacaoZRad?: number;
};

export type ProjectRemate = {
  id: string;
  parentBoxId: string;
  type: RemateType;
  position: RematePosition;
  materialId: string;
  materialMode?: RemateMaterialMode;
  thicknessMm: number;
  dimensions: RemateDimensions;
  name: string;
  transform?: RemateTransform;
};

export type CreateRemateInput = {
  type: RemateType;
  position: RematePosition;
  materialId?: string;
  materialMode?: RemateMaterialMode;
};

export type UpdateRemateInput = Partial<
  Pick<ProjectRemate, "materialId" | "materialMode" | "thicknessMm" | "dimensions" | "transform">
>;
