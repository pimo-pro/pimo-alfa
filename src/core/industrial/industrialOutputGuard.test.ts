import { afterEach, describe, expect, it } from "vitest";
import {
  __disableIndustrialOutputTestBypass,
  assertIndustrialOutputAuthorized,
  IndustrialOutputBlockedError,
  withIndustrialOutputAuthorization,
  beginIndustrialOutputSession,
  endIndustrialOutputSession,
  isIndustrialOutputSessionActive,
} from "./industrialOutputGuard";

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
});
