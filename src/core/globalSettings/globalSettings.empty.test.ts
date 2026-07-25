import { describe, expect, it } from "vitest";
import { normalizeGlobalSettingsRemotePayload } from "../../api/globalSettingsApi";
import { validateGlobalSettings } from "./globalSettingsService";

describe("normalizeGlobalSettingsRemotePayload", () => {
  it("aceita documento vazio / settings vazios", () => {
    expect(normalizeGlobalSettingsRemotePayload({})).toEqual({
      status: "ok",
      version: "v0",
      updatedAt: null,
      settings: {},
    });
    expect(
      normalizeGlobalSettingsRemotePayload({
        status: "ok",
        version: "v0",
        updatedAt: null,
        settings: {},
      })
    ).toMatchObject({ status: "ok", settings: {} });
  });

  it("aceita string vazia como placeholder", () => {
    expect(normalizeGlobalSettingsRemotePayload("")).toEqual({
      status: "ok",
      version: "v0",
      updatedAt: null,
      settings: {},
    });
  });
});

describe("validateGlobalSettings", () => {
  it("aceita documento vazio sem erro", () => {
    expect(validateGlobalSettings({})).toEqual({ valid: true, errors: [] });
  });

  it("aceita settings vazios", () => {
    expect(
      validateGlobalSettings({
        status: "ok",
        version: "v0",
        updatedAt: null,
        settings: {},
      })
    ).toEqual({ valid: true, errors: [] });
  });
});
