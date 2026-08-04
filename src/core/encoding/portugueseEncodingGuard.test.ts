import { describe, expect, it } from "vitest";
import {
  encodingAlertMessage,
  hasInvalidPortugueseEncoding,
  scanPortugueseEncoding,
} from "./portugueseEncodingGuard";

const u = (...cps: number[]) => String.fromCodePoint(...cps);

describe("portugueseEncodingGuard", () => {
  it("aceita portugues UTF-8 correcto", () => {
    const ok =
      "Configura" +
      u(0xe7, 0xf5) +
      "es v" +
      u(0xe1) +
      "lidas " +
      u(0x2014) +
      " Hist" +
      u(0xf3) +
      "rico do Respons" +
      u(0xe1) +
      "vel e T" +
      u(0xed) +
      "tulo da p" +
      u(0xe1) +
      "gina";
    expect(hasInvalidPortugueseEncoding(ok)).toBe(false);
    expect(scanPortugueseEncoding(ok).ok).toBe(true);
    expect(encodingAlertMessage(ok)).toBeNull();
  });

  it("detecta U+FFFD", () => {
    const bad = "Configura" + String.fromCodePoint(0xfffd) + "es";
    expect(hasInvalidPortugueseEncoding(bad)).toBe(true);
    expect(scanPortugueseEncoding(bad).replacementCount).toBe(1);
    expect(encodingAlertMessage(bad, "ADMIN")).toMatch(/Encoding portugues invalido/);
  });

  it("detecta mojibake tipico PT", () => {
    const bad = "Configura" + u(0xc3, 0xa7) + u(0xc3, 0xb5) + "es";
    expect(hasInvalidPortugueseEncoding(bad)).toBe(true);
    expect(scanPortugueseEncoding(bad).mojibakeCount).toBeGreaterThan(0);
  });
});
