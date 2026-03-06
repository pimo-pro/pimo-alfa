import type { IncomingMessage, ServerResponse } from "node:http";
import { buildMaterialsApiPayload } from "../src/server/materialsApi";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function writeJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  if (req.method === "OPTIONS") {
    writeJson(res, 200, { ok: true });
    return;
  }
  if (req.method && req.method !== "GET") {
    writeJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }
  writeJson(res, 200, buildMaterialsApiPayload());
}

// Compatibilidade para runtimes com API estilo Fetch.
export async function GET(): Promise<Response> {
  return new Response(JSON.stringify(buildMaterialsApiPayload()), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
