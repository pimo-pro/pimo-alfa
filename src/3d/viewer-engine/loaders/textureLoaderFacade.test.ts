import { describe, expect, it } from "vitest";
import { createTextureLoaderFacade } from "./textureLoaderFacade";

describe("textureLoaderFacade", () => {
  it("expõe operações do cache de texturas", () => {
    const facade = createTextureLoaderFacade();

    expect(typeof facade.loadAsync).toBe("function");
    expect(typeof facade.getCached).toBe("function");
    expect(typeof facade.release).toBe("function");
    expect(typeof facade.clearCache).toBe("function");
  });
});
