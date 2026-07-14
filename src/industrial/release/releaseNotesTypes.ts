// pimo-kep-fix-001 — protegido, não modificar sem autorização

export type ReleasePublicationEntry = {
  publishedAt: string;
  author: string;
  commitMessage: string;
  version: string;
};

export type ReleasePublicationsFile = {
  _pimoKep?: string;
  publications: ReleasePublicationEntry[];
};

export const RELEASE_PUBLICATIONS_URL = "/industrial/release/publications.json";
