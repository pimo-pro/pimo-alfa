/**
 * Resolução do motor de nesting visual V4.
 * Entrada única: pro | experimental | deepnest.
 */

import type { NestingV4EngineId } from "../rules/nestingV4Rules";
import type { NestingV4Settings } from "../nestingV4Settings";
import type { V4Piece, V4Sheet, V4AutoLayoutResult } from "../nestingV4Types";
import { runNestingV4AutoLayout } from "../nestingV4Engine";

export type ResolvedEngineId = NestingV4EngineId;

export function resolveNestingV4EngineId(settings: NestingV4Settings): NestingV4EngineId {
  const id = settings.nestingEngine;
  if (id === "deepnest" || id === "experimental" || id === "pro") return id;
  return "experimental";
}

export function runResolvedNestingV4AutoLayout(
  pieces: V4Piece[],
  sheets: V4Sheet[],
  settings: NestingV4Settings
): V4AutoLayoutResult {
  return runNestingV4AutoLayout(pieces, sheets, {
    ...settings,
    nestingEngine: resolveNestingV4EngineId(settings),
  });
}
