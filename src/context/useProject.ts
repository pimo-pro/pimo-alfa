import { useContext } from "react";
import { defaultProjectContext } from "./defaultProjectContext";
import { ProjectContext } from "./projectContext";

let warnedMissingProvider = false;

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    if (!warnedMissingProvider) {
      console.warn("useProject chamado fora de ProjectProvider");
      warnedMissingProvider = true;
    }
    return defaultProjectContext;
  }
  return context;
}
