import { afterEach, describe, expect, it } from "vitest";
import {
  __disableIndustrialOutputTestBypass,
  assertIndustrialOutputAuthorized,
  assertIndustrialRequiredArtifactsComplete,
  beginIndustrialRequiredArtifactTracking,
  endIndustrialRequiredArtifactTracking,
  IndustrialOutputBlockedError,
  IndustrialRequiredArtifactsMissingError,
  registerIndustrialRequiredArtifact,
  withIndustrialOutputAuthorization,
  beginIndustrialOutputSession,
  endIndustrialOutputSession,
  isIndustrialOutputSessionActive,
} from "./industrialOutputGuard";
import { runAuthorizedIndustrialCatalogBootstrap } from "../fabrication/industrialGenerationSuspend";

describe("industrialOutputGuard", () => {
  afterEach(() => {
    __disableIndustrialOutputTestBypass(false);
    while (isIndustrialOutputSessionActive()) {
      endIndustrialOutputSession();
    }
  });

  it("bloqueia exportação fora de sessão autorizada", () => {
    __disableIndustrialOutputTestBypass(true);
    expect(() => assertIndustrialOutputAuthorized("tcn")).toThrow(IndustrialOutputBlockedError);
  });

  it("withIndustrialOutputAuthorization liberta após execução", () => {
    __disableIndustrialOutputTestBypass(true);
    withIndustrialOutputAuthorization("tcn", () => {
      assertIndustrialOutputAuthorized("tcn");
    });
    expect(() => assertIndustrialOutputAuthorized("tcn")).toThrow(IndustrialOutputBlockedError);
  });

  it("beginIndustrialOutputSession autoriza saídas durante geração", () => {
    __disableIndustrialOutputTestBypass(true);
    beginIndustrialOutputSession();
    try {
      assertIndustrialOutputAuthorized("tcn");
      assertIndustrialOutputAuthorized("pdf-layout-pro");
    } finally {
      endIndustrialOutputSession();
    }
    expect(() => assertIndustrialOutputAuthorized("tcn")).toThrow(IndustrialOutputBlockedError);
  });

  it("runAuthorizedIndustrialCatalogBootstrap autoriza txml durante bootstrap", () => {
    __disableIndustrialOutputTestBypass(true);
    runAuthorizedIndustrialCatalogBootstrap(() => {
      assertIndustrialOutputAuthorized("txml");
      assertIndustrialOutputAuthorized("tcn");
    });
    expect(() => assertIndustrialOutputAuthorized("txml")).toThrow(IndustrialOutputBlockedError);
  });

  it("bloqueia saída industrial se faltarem artefactos obrigatórios de ferragens", () => {
    __disableIndustrialOutputTestBypass(true);
    beginIndustrialRequiredArtifactTracking();
    try {
      expect(() => assertIndustrialRequiredArtifactsComplete()).toThrow(
        IndustrialRequiredArtifactsMissingError
      );
      registerIndustrialRequiredArtifact("pdf-ferragens-industriais");
      expect(() => assertIndustrialRequiredArtifactsComplete()).toThrow(
        IndustrialRequiredArtifactsMissingError
      );
      registerIndustrialRequiredArtifact("xlsx-ferragens-industriais");
      expect(() => assertIndustrialRequiredArtifactsComplete()).not.toThrow();
    } finally {
      endIndustrialRequiredArtifactTracking();
    }
  });
});
