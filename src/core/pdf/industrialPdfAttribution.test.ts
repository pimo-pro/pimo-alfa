import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    key: (i: number) => [...map.keys()][i] ?? null,
  };
}

describe("resolveIndustrialPdfAttribution", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("Visitante mantém o nome", async () => {
    localStorage.setItem("pimo_current_user_name", "Visitante");
    const { invalidateCurrentProjectUserCache } = await import("../projects/currentUser");
    invalidateCurrentProjectUserCache();
    const { resolveIndustrialPdfAttribution } = await import("./industrialPdfAttribution");
    const r = resolveIndustrialPdfAttribution();
    expect(r.designer).toBe("Visitante");
    expect(r.responsible).toBe("khaled");
  });

  it("não-admin usa o nome do designer", async () => {
    localStorage.setItem("pimo_auth_token", "tok");
    localStorage.setItem(
      "pimo_auth_user",
      JSON.stringify({ id: "u1", username: "maria", role: "pro" })
    );
    const { invalidateCurrentProjectUserCache } = await import("../projects/currentUser");
    invalidateCurrentProjectUserCache();
    const { resolveIndustrialPdfAttribution } = await import("./industrialPdfAttribution");
    const r = resolveIndustrialPdfAttribution();
    expect(r.designer).toBe("maria");
    expect(r.responsible).toBe("khaled");
  });

  it("admin ? designer khaled", async () => {
    localStorage.setItem("pimo_auth_token", "tok");
    localStorage.setItem(
      "pimo_auth_user",
      JSON.stringify({ id: "a1", username: "admin", role: "admin" })
    );
    const { invalidateCurrentProjectUserCache } = await import("../projects/currentUser");
    invalidateCurrentProjectUserCache();
    const { resolveIndustrialPdfAttribution } = await import("./industrialPdfAttribution");
    const r = resolveIndustrialPdfAttribution();
    expect(r.designer).toBe("khaled");
    expect(r.responsible).toBe("khaled");
  });

  it("substitui Designer admin por khaled mesmo com role não-admin", async () => {
    localStorage.setItem("pimo_auth_token", "tok");
    localStorage.setItem(
      "pimo_auth_user",
      JSON.stringify({ id: "a2", username: "admin", role: "pro" })
    );
    const { invalidateCurrentProjectUserCache } = await import("../projects/currentUser");
    invalidateCurrentProjectUserCache();
    const { resolveIndustrialPdfAttribution } = await import("./industrialPdfAttribution");
    expect(resolveIndustrialPdfAttribution().designer).toBe("khaled");
  });
});
