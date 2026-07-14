import {
  RELEASE_PUBLICATIONS_URL,
  type ReleasePublicationEntry,
  type ReleasePublicationsFile,
} from "./releaseNotesTypes";

export function parseReleasePublicationsFile(data: unknown): ReleasePublicationEntry[] {
  if (!data || typeof data !== "object") return [];
  const publications = (data as ReleasePublicationsFile).publications;
  return Array.isArray(publications) ? publications : [];
}

export async function loadReleasePublications(): Promise<ReleasePublicationEntry[]> {
  const response = await fetch(RELEASE_PUBLICATIONS_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = (await response.json()) as ReleasePublicationsFile;
  return parseReleasePublicationsFile(data);
}
