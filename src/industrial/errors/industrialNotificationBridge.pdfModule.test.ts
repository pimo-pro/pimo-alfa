import { describe, expect, it } from "vitest";
import { payloadFromUnknownError } from "../../industrial/errors/industrialNotificationBridge";

describe("payloadFromUnknownError � m�dulos PDF", () => {
  it("detecta falha de dynamic import / MIME HTML", () => {
    const err = new Error(
      "Failed to fetch dynamically imported module: https://pimo.pro/assets/cutLayoutPdf-BEJzUdjU.js"
    );
    const p = payloadFromUnknownError(err, { step: "PDF Etiquetas / Layout PRO" });
    expect(p.source).toBe("module");
    expect(p.severity).toBe("error");
    expect(p.hints?.length).toBeGreaterThan(0);
  });

  it("classifica erros de layout/pdf", () => {
    const p = payloadFromUnknownError(new Error("Layout PRO falhou no PDF"), {
      step: "Layout de Corte PRO",
    });
    expect(p.source).toBe("pdf");
  });
});
