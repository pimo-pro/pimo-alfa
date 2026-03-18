export type PiSistemaGaveta = "AvanTech YOU L" | "AvanTech YOU XL" | "AvanTech YOU M";
export type PiTipoFrente = "full_overlay" | "inset" | "overlay";

export type PiModelSettings = {
  espessuraMadeiraMm: number;
  ativarFuracaoPrateleiras: boolean;
  ativarFuracaoDobradicas: boolean;
  ativarFuracaoGavetas: boolean;
  sistemaGavetas: PiSistemaGaveta;
  comprimentoCorredicaMm: number;
  numeroGavetas: number;
  tipoFrente: PiTipoFrente;
};

export const PI_MODEL_DEFAULT_SETTINGS: PiModelSettings = {
  espessuraMadeiraMm: 19,
  ativarFuracaoPrateleiras: true,
  ativarFuracaoDobradicas: true,
  ativarFuracaoGavetas: true,
  sistemaGavetas: "AvanTech YOU L",
  comprimentoCorredicaMm: 500,
  numeroGavetas: 3,
  tipoFrente: "full_overlay",
};

export function clampPiNumeroGavetas(value: number): number {
  return Math.min(4, Math.max(1, Math.round(value)));
}

