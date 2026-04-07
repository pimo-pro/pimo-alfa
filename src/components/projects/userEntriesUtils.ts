import type { ProjectUIOverlay } from "../../hooks/useProjectsUIOverlay";

export type UserEntry = {
  ownerId: string;
  ownerName: string;
  total: number;
  ready: number;
  sent: number;
};

export function buildUserEntries(
  projects: { id: string; ownerId: string; ownerName?: string }[],
  overlays: Record<string, ProjectUIOverlay>
): UserEntry[] {
  const map = new Map<string, UserEntry>();
  for (const p of projects) {
    const key = p.ownerId || "desconhecido";
    if (!map.has(key)) {
      map.set(key, {
        ownerId: key,
        ownerName: p.ownerName?.trim() || key,
        total: 0,
        ready: 0,
        sent: 0,
      });
    }
    const entry = map.get(key)!;
    entry.total += 1;
    const overlay = overlays[p.id];
    if (overlay?.tag === "ready") entry.ready += 1;
    if (overlay?.tag === "sent") entry.sent += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
