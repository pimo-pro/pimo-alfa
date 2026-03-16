// src/services/apiClient.js
// Serviço centralizado para operações CRUD de projetos

import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../core/projects/projectsClient';

export async function getProjects(scope = 'mine', ownerId) {
  try {
    return await fetchProjects(scope, ownerId);
  } catch (error) {
    return { success: false, error: error.message || 'Erro ao listar projetos.' };
  }
}

export async function createNewProject(request) {
  try {
    return await createProject(request);
  } catch (error) {
    return { success: false, error: error.message || 'Erro ao criar projeto.' };
  }
}

export async function updateExistingProject(id, body) {
  try {
    return await updateProject(id, body);
  } catch (error) {
    return { success: false, error: error.message || 'Erro ao atualizar projeto.' };
  }
}

export async function deleteProjectById(id) {
  try {
    return await deleteProject(id);
  } catch (error) {
    return { success: false, error: error.message || 'Erro ao apagar projeto.' };
  }
}
