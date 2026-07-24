import { buildApiUrl } from "../../config/api";
import type { ViewerRenderOptions, ViewerRenderResult } from "../../context/projectTypes";

import { buildProjectsUrl } from "./projectsApi";

const THUMBS_BASE = "/api/projects/thumbs";

export type ProjectThumbnailRenderScene = (
  options: ViewerRenderOptions
) => Promise<ViewerRenderResult | null>;

/** Alinhado a coerce_safe_filename no PHP — nunca envia name vazio/ilegal. */
export function coerceSafeProjectThumbName(projectName: string): string | null {
  let name = String(projectName ?? "").trim();
  if (!name) return null;
  name = name.replace(/\.\./g, "");
  name = name.replace(/[\/\\<>:"|?*\x00]+/g, "_").replace(/^[.\s_]+|[.\s_]+$/g, "");
  if (!name) return null;
  if (name.length > 160) name = name.slice(0, 160).trim();
  return name || null;
}

function safeProjectFileName(projectName: string): string {
  return coerceSafeProjectThumbName(projectName) ?? "";
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
  const name = coerceSafeProjectThumbName(projectName);
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

async function blobToDataUrl(blob: Blob): Promise<string | null> {
  try {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
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

/**
 * Upload de thumbnail: multipart primeiro; se 400, fallback JSON dataUrl.
 * name vai sempre na query string (além do body) para não depender só de $_POST.
 */
export async function uploadProjectThumbnail(
  projectName: string,
  blob: Blob
): Promise<string | null> {
  const name = coerceSafeProjectThumbName(projectName);
  if (!name || !blob || blob.size === 0) return null;

  const ext = blob.type.includes("webp") ? "webp" : "jpg";
  const params = new URLSearchParams({ action: "thumb", name });

  const parseUrl = async (response: Response): Promise<string | null> => {
    const payload = (await response.json().catch(() => null)) as { url?: string; status?: string } | null;
    if (!response.ok) return null;
    const url = typeof payload?.url === "string" ? payload.url : buildProjectThumbnailPath(name, ext);
    return url.startsWith("/") ? buildApiUrl(url) : url;
  };

  try {
    const form = new FormData();
    form.append("name", name);
    form.append("file", blob, `${name}.${ext}`);

    const multipartResponse = await fetch(buildProjectsUrl(params), {
      method: "POST",
      body: form,
    });
    if (multipartResponse.ok) {
      return parseUrl(multipartResponse);
    }

    // Fallback: JSON com dataUrl (quando proxy/host rejeita multipart)
    const dataUrl = await blobToDataUrl(blob);
    if (!dataUrl) return null;

    const jsonResponse = await fetch(buildProjectsUrl(params), {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ name, dataUrl, mime: blob.type || "image/jpeg" }),
    });
    return parseUrl(jsonResponse);
  } catch {
    return null;
  }
}

export async function ensureProjectThumbnailUploaded(
  projectName: string,
  blob: Blob
): Promise<string | null> {
  const existing = await projectThumbnailExists(projectName);
  if (existing.exists) return existing.url;
  return uploadProjectThumbnail(projectName, blob);
}
