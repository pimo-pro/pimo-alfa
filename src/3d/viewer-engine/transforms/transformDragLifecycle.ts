export const TRANSFORM_DRAG_END_DEDUPE_MS = 8;

export function shouldProcessTransformDragEnd(
  lastStampMs: number,
  nextStampMs: number,
  thresholdMs = TRANSFORM_DRAG_END_DEDUPE_MS
): boolean {
  return nextStampMs - lastStampMs >= thresholdMs;
}
