import { describe, expect, it } from "vitest";
import { projectMatchesId, type OfflineProjectRecord } from "./projectsOfflineStore";

describe("projectMatchesId", () => {
  const base: OfflineProjectRecord = {
    id: "local-1",
    remoteId: "pimo-abc123",
    name: "NP2625622",
    ownerId: "guest-x",
    ownerName: "Guest",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    thumbnailDataUrl: null,
    snapshot: {},
    deleted: false,
    lastSyncedAt: null,
  };

  it("corresponde por nome para load remoto por project.name", () => {
    expect(projectMatchesId(base, "NP2625622")).toBe(true);
    expect(projectMatchesId(base, "  NP2625622  ")).toBe(true);
  });

  it("continua a corresponder por id local e remoteId", () => {
    expect(projectMatchesId(base, "local-1")).toBe(true);
    expect(projectMatchesId(base, "pimo-abc123")).toBe(true);
  });
});
