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

function parseError(_error: unknown): null {
  return null;
}

/**
 * GET /config/global. Em falha de rede ou resposta inválida devolve `null` (fallback no serviço).
 */
export async function getGlobalSettingsRemote(): Promise<GlobalSettingsRemoteResponse | null> {
  try {
    const { data } = await apiClient.get<GlobalSettingsRemoteResponse>("/config/global");
    if (!data || data.status !== "ok") return null;
    return data;
  } catch (error) {
    parseError(error);
    return null;
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
    const { data } = await apiClient.patch<GlobalSettingsRemoteResponse>("/config/global", body);
    if (!data || data.status !== "ok") {
      throw new Error("Resposta inválida do servidor");
    }
    return data;
  } catch (error) {
    throw new Error(parsePatchError(error));
  }
}
