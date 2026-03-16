// src/hooks/useProjects.js
// Hook dedicado para gestão de projetos

import { useState, useCallback } from 'react';
import {
  getProjects,
  createNewProject,
  updateExistingProject,
  deleteProjectById,
} from '../services/apiClient';

export function useProjects(scope = 'mine', ownerId) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getProjects(scope, ownerId);
    if (result && result.success === false) {
      setError(result.error);
      setProjects([]);
    } else {
      setProjects(result);
    }
    setLoading(false);
  }, [scope, ownerId]);

  const addProject = useCallback(async (request) => {
    setLoading(true);
    setError(null);
    const result = await createNewProject(request);
    if (result && result.success === false) {
      setError(result.error);
    } else {
      await fetchProjects();
    }
    setLoading(false);
  }, [fetchProjects]);

  const editProject = useCallback(async (id, body) => {
    setLoading(true);
    setError(null);
    const result = await updateExistingProject(id, body);
    if (result && result.success === false) {
      setError(result.error);
    } else {
      await fetchProjects();
    }
    setLoading(false);
  }, [fetchProjects]);

  const removeProject = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    const result = await deleteProjectById(id);
    if (result && result.success === false) {
      setError(result.error);
    } else {
      await fetchProjects();
    }
    setLoading(false);
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    addProject,
    editProject,
    removeProject,
  };
}
