/**
 * Notas editoriais oficiais (pimo-soon).
 */

import type { PimoSoonNote } from "./pimoSoonTypes";

export const PIMO_SOON_NOTAS: PimoSoonNote[] = [
  {
    id: "note-opcional",
    body: "Todas as fases são opcionais e podem ser executadas sem pressão.",
  },
  {
    id: "note-industrial",
    body: "Nenhuma fase toca no pipeline industrial, CNC, cutlist, PROJETOS ou Viewer.",
  },
  {
    id: "note-hub",
    body: "São fases de evolução do Hub e do sistema documental.",
  },
  {
    id: "note-ativacao",
    body: "Podem ser ativadas quando o projeto exigir.",
  },
  {
    id: "note-estrategia",
    body: "Servem como base estratégica para o crescimento contínuo do PIMO.",
  },
];
