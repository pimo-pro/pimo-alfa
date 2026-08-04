import JSZip from "jszip";
import type { ProjectSnapshot } from "../../context/projectTypes";

export type PimoImportFile = {
  path: string;
  name: string;
  text: string;
};

export type DetectedPimoProject = {
  mainJsonPath: string | null;
  projectName: string | null;
  hasBoxes: boolean;
  hasRemates: boolean;
  hasRodapes: boolean;
  hasMaterials: boolean;
  fileCount: number;
};

export type LoadedPimoProject = {
  projectName: string;
  snapshot: ProjectSnapshot;
};

const MAIN_JSON_BASENAMES = ["project.json", "state.json"] as const;

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function basename(path: string): string {
  const normalized = normalizePath(path);
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

function isJsonFile(file: PimoImportFile): boolean {
  const lower = file.name.toLowerCase();
  return lower.endsWith(".json");
}

function readProjectNameFromState(state: unknown): string | null {
  if (!state || typeof state !== "object") return null;
  const name = (state as { projectName?: unknown }).projectName;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function hasWorkspaceBoxes(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as { workspaceBoxes?: unknown }).workspaceBoxes)
  );
}

function extractProjectStateCandidate(parsed: unknown): unknown | null {
  if (!parsed || typeof parsed !== "object") return null;
  const root = parsed as Record<string, unknown>;

  if (hasWorkspaceBoxes(root)) {
    return root;
  }

  if (root.projectState && hasWorkspaceBoxes(root.projectState)) {
    return root.projectState;
  }

  const snapshot = root.snapshot;
  if (snapshot && typeof snapshot === "object") {
    const snap = snapshot as Record<string, unknown>;
    if (hasWorkspaceBoxes(snap.projectState)) {
      return snap.projectState;
    }
  }

  return null;
}

function extractProjectSnapshot(parsed: unknown): ProjectSnapshot | null {
  if (!parsed || typeof parsed !== "object") return null;
  const root = parsed as Record<string, unknown>;

  if (hasWorkspaceBoxes(root.projectState)) {
    return {
      projectState: root.projectState,
      viewerSnapshot: (root.viewerSnapshot ?? null) as ProjectSnapshot["viewerSnapshot"],
      roomSnapshot: (root.roomSnapshot ?? null) as ProjectSnapshot["roomSnapshot"],
    };
  }

  if (hasWorkspaceBoxes(root)) {
    return {
      projectState: root,
      viewerSnapshot: null,
      roomSnapshot: null,
    };
  }

  const snapshot = root.snapshot;
  if (snapshot && typeof snapshot === "object") {
    const snap = snapshot as Record<string, unknown>;
    if (hasWorkspaceBoxes(snap.projectState)) {
      return {
        projectState: snap.projectState,
        viewerSnapshot: (snap.viewerSnapshot ?? null) as ProjectSnapshot["viewerSnapshot"],
        roomSnapshot: (snap.roomSnapshot ?? null) as ProjectSnapshot["roomSnapshot"],
      };
    }
  }

  return null;
}

function scoreMainJsonCandidate(file: PimoImportFile, parsed: unknown): number {
  const base = basename(file.path).toLowerCase();
  let score = 0;

  if (MAIN_JSON_BASENAMES.includes(base as (typeof MAIN_JSON_BASENAMES)[number])) {
    score += 100;
  }
  if (base.startsWith("pimo-envio") && base.endsWith(".json")) {
    score += 90;
  }
  if (base.includes("project") && base.endsWith(".json")) {
    score += 40;
  }
  if (base.includes("state") && base.endsWith(".json")) {
    score += 35;
  }

  const projectState = extractProjectStateCandidate(parsed);
  if (projectState) {
    score += 50;
    const state = projectState as Record<string, unknown>;
    if (Array.isArray(state.workspaceBoxes) && state.workspaceBoxes.length > 0) score += 20;
    if (Array.isArray(state.remates) && state.remates.length > 0) score += 5;
    if (Array.isArray(state.rodapes) && state.rodapes.length > 0) score += 5;
    if (state.material || state.materialId) score += 3;
  }

  if (file.path.split("/").length <= 2) {
    score += 5;
  }

  return score;
}

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Identifica ficheiro principal e componentes conhecidos de um projeto PIMO. */
export function detectPimoProject(files: PimoImportFile[]): DetectedPimoProject {
  const jsonFiles = files.filter(isJsonFile);
  let bestPath: string | null = null;
  let bestScore = -1;
  let bestProjectName: string | null = null;
  let bestState: unknown | null = null;

  for (const file of jsonFiles) {
    const parsed = parseJson(file.text);
    if (!parsed) continue;
    const score = scoreMainJsonCandidate(file, parsed);
    if (score <= 0) continue;
    if (score > bestScore) {
      bestScore = score;
      bestPath = file.path;
      bestState = extractProjectStateCandidate(parsed);
      bestProjectName =
        readProjectNameFromState(bestState) ??
        (typeof parsed === "object" && parsed !== null && typeof (parsed as { name?: unknown }).name === "string"
          ? String((parsed as { name: string }).name).trim() || null
          : null);
    }
  }

  const state = bestState && typeof bestState === "object" ? (bestState as Record<string, unknown>) : null;

  return {
    mainJsonPath: bestPath,
    projectName: bestProjectName,
    hasBoxes: Array.isArray(state?.workspaceBoxes) && (state.workspaceBoxes as unknown[]).length > 0,
    hasRemates: Array.isArray(state?.remates) && (state.remates as unknown[]).length > 0,
    hasRodapes: Array.isArray(state?.rodapes) && (state.rodapes as unknown[]).length > 0,
    hasMaterials: !!(state?.material || state?.materialId),
    fileCount: files.length,
  };
}

/** Lê o estado completo do projeto PIMO a partir dos ficheiros (sem recalcular). */
export function loadPimoProjectState(files: PimoImportFile[]): LoadedPimoProject | null {
  const detected = detectPimoProject(files);
  if (!detected.mainJsonPath) return null;

  const mainFile = files.find((f) => f.path === detected.mainJsonPath);
  if (!mainFile) return null;

  const parsed = parseJson(mainFile.text);
  const snapshot = extractProjectSnapshot(parsed);
  if (!snapshot) return null;

  const projectName =
    readProjectNameFromState(snapshot.projectState) ??
    detected.projectName ??
    basename(detected.mainJsonPath).replace(/\.json$/i, "") ??
    "Projeto";

  return {
    projectName,
    snapshot,
  };
}

export async function readPimoImportFilesFromFileList(fileList: FileList | File[]): Promise<PimoImportFile[]> {
  const files = Array.from(fileList);
  const out: PimoImportFile[] = [];

  for (const file of files) {
    const relativePath =
      "webkitRelativePath" in file && typeof file.webkitRelativePath === "string" && file.webkitRelativePath
        ? file.webkitRelativePath
        : file.name;

    if (file.name.toLowerCase().endsWith(".zip")) {
      const zipEntries = await readPimoImportFilesFromZip(file);
      out.push(...zipEntries);
      continue;
    }

    if (!file.name.toLowerCase().endsWith(".json")) {
      continue;
    }

    out.push({
      path: normalizePath(relativePath),
      name: file.name,
      text: await file.text(),
    });
  }

  return out;
}

export async function readPimoImportFilesFromZip(file: File): Promise<PimoImportFile[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const out: PimoImportFile[] = [];

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (!path.toLowerCase().endsWith(".json")) continue;
    out.push({
      path: normalizePath(path),
      name: basename(path),
      text: await entry.async("string"),
    });
  }

  return out;
}

export async function readPimoImportFilesFromDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  prefix = ""
): Promise<PimoImportFile[]> {
  const out: PimoImportFile[] = [];
  const entries = (
    dirHandle as FileSystemDirectoryHandle & {
      entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
    }
  ).entries();

  for await (const [name, handle] of entries) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "directory") {
      out.push(
        ...(await readPimoImportFilesFromDirectoryHandle(handle as FileSystemDirectoryHandle, path))
      );
      continue;
    }
    if (!name.toLowerCase().endsWith(".json")) continue;
    const file = await (handle as FileSystemFileHandle).getFile();
    out.push({
      path: normalizePath(path),
      name,
      text: await file.text(),
    });
  }

  return out;
}
