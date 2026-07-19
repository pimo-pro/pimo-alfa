import { describe, expect, it } from "vitest";
import { coerceSafeProjectThumbName } from "./projectThumbnail";

describe("coerceSafeProjectThumbName", () => {
  it("aceita nomes com espacos e acentos", () => {
    expect(coerceSafeProjectThumbName("Antunes Novo Cozinha")).toBe("Antunes Novo Cozinha");
    expect(coerceSafeProjectThumbName("  Projeto  ")).toBe("Projeto");
  });

  it("substitui caracteres ilegais em vez de falhar", () => {
    expect(coerceSafeProjectThumbName('Projeto: A/B|C')).toBe("Projeto_ A_B_C");
  });

  it("rejeita vazio", () => {
    expect(coerceSafeProjectThumbName("")).toBeNull();
    expect(coerceSafeProjectThumbName("   ")).toBeNull();
    expect(coerceSafeProjectThumbName("...")).toBeNull();
  });
});
