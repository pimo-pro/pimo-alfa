// Hook responsável pelo estado central do projeto.
// Mantém o ProjectState, expõe getter/setter e inicialização.

import { useState, useRef, useEffect } from "react";
import { defaultState, applyResultados } from "../context/projectState";
import type { ProjectState } from "../context/projectTypes";

export function useProjectState() {
  const [project, setProject] = useState<ProjectState>(() => applyResultados(defaultState));
  const projectRef = useRef<ProjectState>(project);
  useEffect(() => { projectRef.current = project; }, [project]);
  return { project, setProject, projectRef };
}
