import axios from "axios";

import { apiClient } from "./apiClient";

export type ProjectListItem = {
  id: string;
  title: string;
  slug: string;
  isPublic: boolean;
  ownerId: string;
  factoryId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectsResponse = {
  status: "ok";
  projects: ProjectListItem[];
};

function parseApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
    if (error.response?.status === 401) return "Não autenticado";
  }
  return "Erro ao carregar projetos";
}

export async function getProjects(): Promise<ProjectsResponse> {
  try {
    const { data } = await apiClient.get<ProjectsResponse>("/projects");
    return {
      ...data,
      // @PIMO-KEEP — guard: API pode devolver projects:undefined
      projects: data?.projects ?? [],
    };
  } catch (error) {
    throw new Error(parseApiError(error));
  }
}
