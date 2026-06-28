import { buildApiUrl } from "@/config/api";
import type { ViewerRenderOptions, ViewerRenderResult } from "@/context/projectTypes";

import { buildProjectsUrl } from "./projectsApi";

const THUMBS_BASE = "/api/projects/thumbs";

export type ProjectThumbnailRenderScene = (
  options: ViewerRenderOptions
) => Promise<ViewerRenderResult | null>;

function safeProjectFileName(projectName: string): string {
  return String(projectName ?? "").trim();
}

export function buildProjectThumbnailPath(projectName: string, ext: "webp" | "jpg" = "jpg"): string {
  const name = safeProjectFileName(projectName);
  return `${THUMBS_BASE}/${encodeURIComponent(name)}.${ext}`;
}

export function resolveProjectThumbnailSrc(
  projectName: string,
  thumbnailDataUrl?: string | null,
  cacheKey?: string
): string | null {
  const trimmed = typeof thumbnailDataUrl === "string" ? thumbnailDataUrl.trim() : "";
  if (trimmed) {
    const withCache =
      cacheKey && !trimmed.startsWith("data:") && !trimmed.includes("?")
        ? `${trimmed}?v=${encodeURIComponent(cacheKey)}`
        : trimmed;
    return trimmed.startsWith("/") ? buildApiUrl(withCache) : withCache;
  }

  const name = safeProjectFileName(projectName);
  if (!name) return null;
  const path = buildProjectThumbnailPath(name, "jpg");
  const suffix = cacheKey ? `?v=${encodeURIComponent(cacheKey)}` : "";
  return `${buildApiUrl(path)}${suffix}`;
}

export async function projectThumbnailExists(
  projectName: string
): Promise<{ exists: boolean; url: string | null }> {
  const name = safeProjectFileName(projectName);
  if (!name) return { exists: false, url: null };

  const params = new URLSearchParams({ action: "thumb", name });
  try {
    const response = await fetch(buildProjectsUrl(params), { method: "HEAD" });
    if (response.ok) {
      return {
        exists: true,
        url: buildApiUrl(buildProjectThumbnailPath(name)),
      };
    }
    const getResponse = await fetch(buildProjectsUrl(params));
    if (!getResponse.ok) return { exists: false, url: null };
    const payload = (await getResponse.json()) as { exists?: boolean; url?: string };
    const url = typeof payload.url === "string" ? payload.url : null;
    return {
      exists: Boolean(payload.exists),
      url: url ? (url.startsWith("/") ? buildApiUrl(url) : url) : null,
    };
  } catch {
    return { exists: false, url: null };
  }
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(dataUrl);
    return await response.blob();
  } catch {
    return null;
  }
}

export async function captureWorkspaceProjectThumbnail(
  renderScene: ProjectThumbnailRenderScene
): Promise<Blob | null> {
  const result = await renderScene({
    size: "small",
    mode: "pbr",
    background: "project-transparent",
    preset: "iso1",
    format: "jpg",
    quality: 0.88,
    advancedRealism: true,
    watermark: false,
  });
  if (!result?.dataUrl) return null;
  return dataUrlToBlob(result.dataUrl);
}

export async function uploadProjectThumbnail(
  projectName: string,
  blob: Blob
): Promise<string | null> {
  const name = safeProjectFileName(projectName);
  if (!name || !blob || blob.size === 0) return null;

  const ext = blob.type.includes("webp") ? "webp" : "jpg";
  const form = new FormData();
  form.append("name", name);
  form.append("file", blob, `${name}.${ext}`);

  const params = new URLSearchParams({ action: "thumb" });
  const response = await fetch(buildProjectsUrl(params), {
    method: "POST",
    body: form,
  });
  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as { url?: string } | null;
  const url = typeof payload?.url === "string" ? payload.url : buildProjectThumbnailPath(name, ext);
  return url.startsWith("/") ? buildApiUrl(url) : url;
}

export async function ensureProjectThumbnailUploaded(
  projectName: string,
  blob: Blob
): Promise<string | null> {
  const existing = await projectThumbnailExists(projectName);
  if (existing.exists) return existing.url;
  return uploadProjectThumbnail(projectName, blob);
}
