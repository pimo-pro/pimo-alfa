import { describe, expect, it } from "vitest";
import {
  createLocalAuthSession,
  isLocalAuthCredentials,
  isLocalAuthToken,
  LOCAL_AUTH_PERMISSIONS,
  LOCAL_AUTH_TOKEN_PREFIX,
} from "./localAuth";
import { PERMISSIONS } from "./permissionsMap";

describe("localAuth (K/K)", () => {
  it("aceita apenas credenciais K/K (e K@local)", () => {
    expect(isLocalAuthCredentials("K", "K")).toBe(true);
    expect(isLocalAuthCredentials("k", "K")).toBe(true);
    expect(isLocalAuthCredentials("K@local", "K")).toBe(true);
    expect(isLocalAuthCredentials("K", "k")).toBe(false);
    expect(isLocalAuthCredentials("admin@pimo.local", "admin123")).toBe(false);
    expect(isLocalAuthCredentials("", "K")).toBe(false);
  });

  it("cria sessão admin com admin.full_access", () => {
    const session = createLocalAuthSession();
    expect(session.token).toBe(LOCAL_AUTH_TOKEN_PREFIX);
    expect(session.user.role).toBe("admin");
    expect(session.user.username).toBe("K");
    expect(session.permissions).toContain(PERMISSIONS.ADMIN_FULL_ACCESS);
    expect(session.permissions.length).toBe(LOCAL_AUTH_PERMISSIONS.length);
    expect(isLocalAuthToken(session.token)).toBe(true);
  });
});
