import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const content = fs.readFileSync(
  path.join(__dirname, "..", "src", "context", "ProjectProvider.tsx"),
  "utf8"
);
const startMarker = "  const actions: ProjectActions = useMemo(() => ({";
const endMarker = "  }), [updateProject, viewerSync, exportActions]);";
const start = content.indexOf(startMarker);
const end = content.indexOf(endMarker);
if (start === -1 || end === -1) {
  console.error("Markers not found", start, end);
  process.exit(1);
}
const innerStart = start + startMarker.length;
let result = content.slice(innerStart, end);
result = result.replace(/^    (\w+): /gm, "    a.$1 = ");
result = result.replace(/actions\.addBox\(\)/g, "a.addBox()");
result = result.replace(/actions\.duplicateBox\(\)/g, "a.duplicateBox()");
result = result.replace(/actions\.toggleWorkspaceRotation\(/g, "a.toggleWorkspaceRotation(");
result = result.replace(/actions\.addModelToBox\(/g, "a.addModelToBox(");
result = result.replace(/serializeState\(project\)/g, "serializeState(projectRef.current)");
result = result.replace(/\bproject\.projectName\b/g, "projectRef.current.projectName");
fs.writeFileSync(
  path.join(__dirname, "..", "src", "context", "hooks", "actionsBody.txt"),
  result
);
console.log("Extracted", result.split("\n").length, "lines");
