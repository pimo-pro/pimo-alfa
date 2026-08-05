/**
 * Middleware Vite: GET /api/materials + POST /api/materials/familia-texture
 */

import fs from "node:fs";
import path from "node:path";
import type { Connect, PreviewServer, ViteDevServer } from "vite";
import { buildMaterialsApiPayload } from "./materialsApi";

function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: Connect.ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function slugFamilia(familia: string): string {
  return String(familia ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "familia";
}

function extFrom(fileName: string, mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "jpg";
  const m = String(fileName ?? "").toLowerCase().match(/\.([a-z0-9]+)$/);
  if (m && ["jpg", "jpeg", "png", "webp"].includes(m[1]!)) {
    return m[1] === "jpeg" ? "jpg" : m[1]!;
  }
  return "jpg";
}

async function handleFamiliaTextureUpload(
  req: Connect.IncomingMessage,
  res: Connect.ServerResponse,
  rootDir: string
): Promise<void> {
  try {
    const body = (await readJsonBody(req)) as {
      familia?: string;
      fileName?: string;
      mimeType?: string;
      dataBase64?: string;
    };
    const familia = String(body.familia ?? "").trim();
    const dataBase64 = String(body.dataBase64 ?? "").trim();
    const mimeType = String(body.mimeType ?? "image/jpeg").trim();
    const fileName = String(body.fileName ?? "texture.jpg").trim();
    if (!familia || !dataBase64) {
      sendJson(res, 400, { ok: false, error: "familia e dataBase64 são obrigatórios." });
      return;
    }
    if (!mimeType.startsWith("image/")) {
      sendJson(res, 400, { ok: false, error: "Apenas imagens são permitidas." });
      return;
    }
    const buf = Buffer.from(dataBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    if (!buf.length || buf.length > 8 * 1024 * 1024) {
      sendJson(res, 400, { ok: false, error: "Imagem inválida ou demasiado grande (máx. 8 MB)." });
      return;
    }
    const slug = slugFamilia(familia);
    const ext = extFrom(fileName, mimeType);
    const relDir = path.join("public", "textures", "materials", "familias");
    const absDir = path.join(rootDir, relDir);
    fs.mkdirSync(absDir, { recursive: true });
    const outName = `${slug}.${ext}`;
    const absFile = path.join(absDir, outName);
    fs.writeFileSync(absFile, buf);
    const url = `/textures/materials/familias/${outName}`;
    sendJson(res, 200, { ok: true, url, path: url, familia, fileName: outName });
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao gravar textura.",
    });
  }
}

function materialsApiHandler(rootDir: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const urlPath = (req.url ?? "").split("?")[0] ?? "";

    if (req.method === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (
      (urlPath === "/familia-texture" || urlPath.startsWith("/familia-texture")) &&
      req.method === "POST"
    ) {
      void handleFamiliaTextureUpload(req, res, rootDir);
      return;
    }

    if (req.method === "GET" && (urlPath === "/" || urlPath === "" || urlPath === "/index")) {
      sendJson(res, 200, buildMaterialsApiPayload());
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found" });
  };
}

export function attachMaterialsApiMiddleware(
  server: ViteDevServer | PreviewServer,
  rootDir: string
): void {
  server.middlewares.use("/api/materials", materialsApiHandler(rootDir));
}
