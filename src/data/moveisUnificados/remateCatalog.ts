import type { RematePieceTipo } from "../../core/remate/rematePieceTypes";

export type RemateCatalogItem = {
  id: string;
  tipo: RematePieceTipo;
  nome: string;
  descricao?: string;
};

export const REMATE_CATALOG_ITEMS: RemateCatalogItem[] = [
  { id: "remate-dir", tipo: "DIR", nome: "Remate Direito" },
  { id: "remate-esq", tipo: "ESQ", nome: "Remate Esquerdo" },
  { id: "remate-cima", tipo: "CIMA", nome: "Remate Cima" },
  { id: "remate-baixo", tipo: "BAIXO", nome: "Remate Baixo" },
  { id: "remate-l", tipo: "L", nome: "Remate L" },
  { id: "remate-rodape", tipo: "RODAPE", nome: "Rodapé" },
  { id: "remate-rodape-l", tipo: "RODAPE_L", nome: "Rodapé L" },
];
