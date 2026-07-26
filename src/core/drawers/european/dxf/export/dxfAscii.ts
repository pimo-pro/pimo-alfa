/**
 * dxfAscii.ts — Serialização ASCII DXF (sem Node FS; seguro para browser).
 */

import type { DxfEntity } from "../dxfTypes";
import type { EuropeanDxfLayerDef } from "../dxfLayers";
import { EUROPEAN_DXF_LAYER_DEFS } from "../dxfLayers";

function pair(code: number, value: string | number): string {
  return `${code}\n${value}\n`;
}

function serializeLayers(layers: EuropeanDxfLayerDef[]): string {
  let s = pair(0, "SECTION") + pair(2, "TABLES");
  s += pair(0, "TABLE") + pair(2, "LAYER") + pair(70, layers.length);
  for (const layer of layers) {
    s +=
      pair(0, "LAYER") +
      pair(2, layer.name) +
      pair(70, 0) +
      pair(62, layer.color) +
      pair(6, "CONTINUOUS");
  }
  s += pair(0, "ENDTAB") + pair(0, "ENDSEC");
  return s;
}

function serializeEntity(entity: DxfEntity, ox = 0, oy = 0): string {
  if (entity.type === "LINE") {
    return (
      pair(0, "LINE") +
      pair(8, entity.layer) +
      pair(10, entity.start.x - ox) +
      pair(20, entity.start.y - oy) +
      pair(30, 0) +
      pair(11, entity.end.x - ox) +
      pair(21, entity.end.y - oy) +
      pair(31, 0)
    );
  }
  if (entity.type === "CIRCLE") {
    return (
      pair(0, "CIRCLE") +
      pair(8, entity.layer) +
      pair(10, entity.center.x - ox) +
      pair(20, entity.center.y - oy) +
      pair(30, 0) +
      pair(40, Math.max(0, entity.radius))
    );
  }
  const safe = String(entity.value).replace(/\r?\n/g, " ");
  return (
    pair(0, "TEXT") +
    pair(8, entity.layer) +
    pair(10, entity.position.x - ox) +
    pair(20, entity.position.y - oy) +
    pair(30, 0) +
    pair(40, Math.max(1, entity.height)) +
    pair(1, safe)
  );
}

export function serializeEntitiesToDxf(
  entities: DxfEntity[],
  layers: EuropeanDxfLayerDef[] = EUROPEAN_DXF_LAYER_DEFS,
  origin?: { x: number; y: number }
): string {
  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;
  let body = pair(0, "SECTION") + pair(2, "HEADER");
  body += pair(9, "$INSUNITS") + pair(70, 4);
  body += pair(0, "ENDSEC");
  body += serializeLayers(layers);
  body += pair(0, "SECTION") + pair(2, "ENTITIES");
  for (const e of entities) {
    body += serializeEntity(e, ox, oy);
  }
  body += pair(0, "ENDSEC");
  body += pair(0, "EOF");
  return body;
}

export function utf8ByteLength(content: string): number {
  if (typeof Buffer !== "undefined") return Buffer.byteLength(content, "utf8");
  return new TextEncoder().encode(content).length;
}
