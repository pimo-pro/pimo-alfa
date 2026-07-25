/**
 * Tipos do hub — pimo-soon / Plano Futuro.
 */

export type PimoSoonStatus = "planned" | "optional" | "blocked";

export type PimoSoonItem = {
  id: string;
  label: string;
};

export type PimoSoonFase = {
  id: string;
  number: number;
  title: string;
  summary: string;
  status: PimoSoonStatus;
  items: PimoSoonItem[];
};

export type PimoSoonNote = {
  id: string;
  body: string;
};

export type HubPimoSoonSnapshot = {
  tag: "pimo-soon";
  title: string;
  blurb: string;
  fases: PimoSoonFase[];
  notas: PimoSoonNote[];
};
