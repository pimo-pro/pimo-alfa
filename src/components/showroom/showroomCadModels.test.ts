import { describe, expect, it } from "vitest";

import { resolveShowroomModelPath } from "./showroomCadModels";

describe("resolveShowroomModelPath", () => {
  it("aceita data URLs e paths absolutos", () => {
    expect(resolveShowroomModelPath("data:model/gltf-binary;base64,abc")).toBe(
      "data:model/gltf-binary;base64,abc"
    );
    expect(resolveShowroomModelPath("/assets/foo.glb")).toBe("/assets/foo.glb");
  });

  it("resolve ids de catálogo para /models/cad/{id}.glb", () => {
    expect(resolveShowroomModelPath("puxador-128")).toBe("/models/cad/puxador-128.glb");
    expect(resolveShowroomModelPath("catalog:armario-forno")).toBe("/models/cad/armario-forno.glb");
  });
});
