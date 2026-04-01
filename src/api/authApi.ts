import axios from "axios";

import { apiClient } from "./apiClient";

export type LoginResponse = {
  status: "ok";
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
};

export type MeResponse = {
  status: "ok";
  user: {
    id: string;
    username: string;
    role: string;
    permissions: string[];
  };
};

function parseApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
    if (error.response?.status === 401) return "Não autenticado";
    if (error.response?.status === 400) return "Dados inválidos";
  }
  return "Erro inesperado";
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const { data } = await apiClient.post<LoginResponse>("/auth/login", { email, password });
    return data;
  } catch (error) {
    throw new Error(parseApiError(error));
  }
}

/** Garante arrays e campos mínimos quando a API /me devolve payload incompleto. */
function normalizeMeResponse(data: MeResponse | undefined): MeResponse {
  const u = data?.user;
  return {
    status: "ok",
    user: {
      id: u?.id ?? "",
      username: u?.username ?? "",
      role: u?.role ?? "",
      permissions: u?.permissions ?? [],
    },
  };
}

export async function getMe(): Promise<MeResponse> {
  try {
    const { data } = await apiClient.get<MeResponse>("/me");
    return normalizeMeResponse(data);
  } catch (error) {
    throw new Error(parseApiError(error));
  }
}
