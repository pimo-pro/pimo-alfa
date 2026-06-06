export function assertPieceId(pieceId: string): void {
  if (!pieceId || typeof pieceId !== 'string' || !pieceId.trim()) {
    throw new Error('pieceId inválido.');
  }
}

export function assertEntityId(entityId: string): void {
  if (!entityId || typeof entityId !== 'string' || !entityId.trim()) {
    throw new Error('entityId inválido.');
  }
}

export function isVec3(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

export function vec3ToJson(value: [number, number, number]) {
  return { x: value[0], y: value[1], z: value[2] };
}

export function jsonToVec3(value: unknown, fallback: [number, number, number] = [0, 0, 0]): [number, number, number] {
  if (!value || typeof value !== 'object') return fallback;
  const o = value as Record<string, unknown>;
  const x = typeof o.x === 'number' ? o.x : fallback[0];
  const y = typeof o.y === 'number' ? o.y : fallback[1];
  const z = typeof o.z === 'number' ? o.z : fallback[2];
  return [x, y, z];
}
