import { describe, expect, it } from "vitest";
import {
  shouldProcessTransformDragEnd,
  TRANSFORM_DRAG_END_DEDUPE_MS,
} from "./transformDragLifecycle";

describe("transformDragLifecycle", () => {
  it("ignora duplicados dentro da janela de dedupe", () => {
    expect(shouldProcessTransformDragEnd(100, 100 + TRANSFORM_DRAG_END_DEDUPE_MS - 1)).toBe(false);
  });

  it("permite eventos fora da janela de dedupe", () => {
    expect(shouldProcessTransformDragEnd(100, 100 + TRANSFORM_DRAG_END_DEDUPE_MS)).toBe(true);
  });
});
