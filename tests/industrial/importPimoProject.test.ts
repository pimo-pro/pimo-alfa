import { describe, expect, it } from "vitest";
import {
  detectPimoProject,
  loadPimoProjectState,
  type PimoImportFile,
} from "../../src/industrial/import/importPimoProjectFromFiles";
import { buildImportedProjectRouteSlug } from "../../src/industrial/import/importedProjectRouteSlug";
import {
  buildImportedPimoProjectPayload,
  prepareImportedProjectState,
} from "../../src/industrial/import/loadImportedPimoProject";
import { serializeState } from "../../src/context/projectPersistence";
import { defaultState } from "../../src/context/projectState";

function makeSnapshotJson(projectName: string) {
  const state = {
    ...defaultState,
    projectName,
    workspaceBoxes: [
      {
        ...defaultState.workspaceBoxes[0],
        id: "box-import-1",
        nome: "Caixa Import",
      },
    ],
    remates: [],
    rodapes: [],
  };
  return JSON.stringify({
    projectState: serializeState(state),
    viewerSnapshot: null,
    roomSnapshot: null,
  });
}

describe("importPimoProjectFromFiles", () => {
  it("detecta project.json com workspaceBoxes", () => {
    const files: PimoImportFile[] = [
      {
        path: "project.json",
        name: "project.json",
        text: makeSnapshotJson("Khaled 1 Cozinha Branca"),
      },
    ];
    const detected = detectPimoProject(files);
    expect(detected.mainJsonPath).toBe("project.json");
    expect(detected.hasBoxes).toBe(true);
    expect(detected.projectName).toBe("Khaled 1 Cozinha Branca");
  });

  it("carrega ProjectSnapshot sem recalcular", () => {
    const files: PimoImportFile[] = [
      {
        path: "pimo-envio-test.json",
        name: "pimo-envio-test.json",
        text: makeSnapshotJson("khaled"),
      },
    ];
    const loaded = loadPimoProjectState(files);
    expect(loaded?.projectName).toBe("khaled");
    expect(loaded?.snapshot.projectState).toBeTruthy();

    const prepared = prepareImportedProjectState(loaded!.snapshot.projectState);
    expect(prepared?.projectName).toBe("khaled");
    expect(prepared?.workspaceBoxes?.[0]?.id).toBe("box-import-1");
  });

  it("gera slug de rota com underscores", () => {
    expect(buildImportedProjectRouteSlug("khaled 1 cozinha branca")).toBe("khaled_1_cozinha_branca");
    expect(buildImportedProjectRouteSlug("khaled")).toBe("khaled");
  });

  it("monta payload importável", () => {
    const files: PimoImportFile[] = [
      {
        path: "state.json",
        name: "state.json",
        text: makeSnapshotJson("Meu Projeto"),
      },
    ];
    const loaded = loadPimoProjectState(files);
    const payload = buildImportedPimoProjectPayload(loaded!.snapshot, loaded!.projectName);
    expect(payload?.projectNameSlug).toBe("meu_projeto");
    expect(payload?.projectName).toBe("Meu Projeto");
  });
});
