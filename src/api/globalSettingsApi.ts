import axios from "axios";

import { apiClient } from "./apiClient";

/** Resposta GET /config/global (público, sem JWT). */
export type GlobalSettingsRemoteResponse = {
  status: string;
  version: string;
  updatedAt: string | null;
  settings: Record<string, unknown>;
};

export type PatchGlobalSettingsBody = {
  version: string;
  settings: Record<string, unknown>;
};

function parsePatchError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; status?: string } | undefined;
    if (data?.message) return data.message;
    if (error.response?.status === 401) return "Não autenticado";
    if (error.response?.status === 403) return "Sem permissão (requer admin.full_access)";
  }
  return "Erro ao gravar configuração global";
}

/**
 * Normaliza payload de /config/global ou /config/global.json.
 * Aceita documento vazio / settings {} sem lançar.
 */
export function normalizeGlobalSettingsRemotePayload(
  raw: unknown
): GlobalSettingsRemoteResponse | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { status: "ok", version: "v0", updatedAt: null, settings: {} };
    }
    try {
      return normalizeGlobalSettingsRemotePayload(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const doc = raw as Record<string, unknown>;

  // Documento vazio {} → defaults seguros
  if (Object.keys(doc).length === 0) {
    return { status: "ok", version: "v0", updatedAt: null, settings: {} };
  }

  const status = typeof doc.status === "string" && doc.status.trim() ? doc.status : "ok";
  if (status !== "ok") return null;

  const version =
    typeof doc.version === "string" && doc.version.trim() ? doc.version.trim() : "v0";
  const updatedAt =
    typeof doc.updatedAt === "string" && doc.updatedAt.trim() ? doc.updatedAt : null;

  let settings: Record<string, unknown> = {};
  if (doc.settings == null) {
    settings = {};
  } else if (typeof doc.settings === "object" && !Array.isArray(doc.settings)) {
    settings = doc.settings as Record<string, unknown>;
  } else {
    return null;
  }

  return { status: "ok", version, updatedAt, settings };
}

/**
 * GET /config/global (rewrite → global.json em produção).
 * Em falha de rede, 404 ou payload vazio/ inválido devolve `null` (fallback no serviço).
 */
export async function getGlobalSettingsRemote(): Promise<GlobalSettingsRemoteResponse | null> {
  try {
    const { data, status } = await apiClient.get<unknown>("/config/global", {
      validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
    });
    if (status === 404) return null;
    return normalizeGlobalSettingsRemotePayload(data);
  } catch {
    // Fallback estático explícito (mesmo conteúdo que o rewrite serve)
    try {
      const res = await fetch("/config/global.json", {
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      });
      if (!res.ok) return null;
      const text = await res.text();
      if (!text.trim()) {
        return { status: "ok", version: "v0", updatedAt: null, settings: {} };
      }
      return normalizeGlobalSettingsRemotePayload(JSON.parse(text));
    } catch {
      return null;
    }
  }
}

/**
 * PATCH /config/global — JWT obrigatório; servidor exige `admin.full_access`.
 * Em erro lança `Error` com mensagem legível (nada alterado no cliente).
 */
export async function patchGlobalSettingsRemote(
  body: PatchGlobalSettingsBody
): Promise<GlobalSettingsRemoteResponse> {
  try {
    const { data } = await apiClient.patch<unknown>("/config/global", body);
    const normalized = normalizeGlobalSettingsRemotePayload(data);
    if (!normalized) {
      throw new Error("Resposta inválida do servidor");
    }
    return normalized;
  } catch (error) {
    throw new Error(parsePatchError(error));
  }
}
