// Hook responsável pelo estado central do projeto.
// Mantém o ProjectState, expõe getter/setter e inicialização.

import { useState, useRef, useEffect } from "react";
import { defaultState, applyResultados } from "../context/projectState";
import type { ProjectState } from "../context/projectTypes";

export function useProjectState(getInitial?: () => ProjectState | null | undefined) {
  const [project, setProject] = useState<ProjectState>(() => {
    const fromCaller = getInitial?.();
    if (fromCaller) return applyResultados(fromCaller);
    return applyResultados(defaultState);
  });
  const projectRef = useRef<ProjectState>(project);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);
  return { project, setProject, projectRef };
}
