import axios from "axios";

import { apiClient } from "./apiClient";

export type UserSettingsGetResponse = {
  status: "ok";
  settings: Record<string, unknown> | null;
  updatedAt?: string | null;
};

function parseApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
    if (error.response?.status === 401) return "Não autenticado";
  }
  return "Erro ao sincronizar configurações";
}

export async function getUserSettingsRemote(): Promise<UserSettingsGetResponse> {
  try {
    const { data } = await apiClient.get<UserSettingsGetResponse>("/user/settings");
    return {
      status: "ok",
      settings: data?.settings ?? null,
      updatedAt: data?.updatedAt ?? null,
    };
  } catch (error) {
    throw new Error(parseApiError(error));
  }
}

export async function patchUserSettingsRemote(body: Record<string, unknown>): Promise<void> {
  try {
    await apiClient.patch("/user/settings", body);
  } catch (error) {
    throw new Error(parseApiError(error));
  }
}
