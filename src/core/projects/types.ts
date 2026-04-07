export type PersistedProjectSnapshot = {
  projectState: unknown;
  viewerSnapshot: unknown;
  roomSnapshot?: unknown;
};

export type PimoProjectData = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  room: unknown;
  boxes: unknown;
  shelves: unknown;
  dividers: unknown;
  centerDisplay: unknown;
  holes: unknown;
  drillMarkers: unknown;
  materials: unknown;
  viewerSnapshot: unknown;
  settings: unknown;
  ownerName?: string;
  thumbnailDataUrl?: string | null;
};

export type SavedProjectMeta = {
  id: string;
  name: string;
  sequence: number;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  ownerName: string;
  thumbnailDataUrl: string | null;
  /** Verdadeiro quando o snapshot do projeto estava inválido/nulo no storage. */
  corrupted?: boolean;
};

export type SavedProjectRecord = SavedProjectMeta & {
  projectData?: PimoProjectData;
  snapshot: PersistedProjectSnapshot;
};

export type SaveProjectRequest = {
  name?: string;
  ownerId: string;
  ownerName?: string;
  snapshot: PersistedProjectSnapshot;
  thumbnailDataUrl?: string | null;
  /** Id no servidor (após primeiro sync); enviado no POST para atualizar o mesmo ficheiro. */
  remoteProjectId?: string;
};

export type RenameProjectRequest = {
  name: string;
};
