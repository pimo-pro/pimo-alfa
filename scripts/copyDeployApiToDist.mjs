/**
 * Após `vite build`, coloca PHP de auth/users (e .gitkeep de data) em dist/
 * para o FTP-Deploy enviar tudo dentro de public_html.
 * Layout: dist/api/auth/index.php (stub) → ../_impl/auth/index.php
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

if (!fs.existsSync(dist)) {
  console.warn("[copyDeployApiToDist] dist/ inexistente — ignorar (correr após vite build).");
  process.exit(0);
}

const srcAuth = path.join(root, "api", "auth", "index.php");
const srcUsers = path.join(root, "api", "users", "index.php");

if (!fs.existsSync(srcAuth) || !fs.existsSync(srcUsers)) {
  console.warn("[copyDeployApiToDist] api/auth ou api/users em falta — nada a copiar.");
  process.exit(0);
}

copyFile(srcAuth, path.join(dist, "api", "_impl", "auth", "index.php"));
copyFile(srcUsers, path.join(dist, "api", "_impl", "users", "index.php"));

const gitkeep = path.join(root, "api", "data", ".gitkeep");
if (fs.existsSync(gitkeep)) {
  copyFile(gitkeep, path.join(dist, "api", "_impl", "data", ".gitkeep"));
}

const authStub = `<?php
define('PIMO_AUTH_ROUTER', true);
require_once __DIR__ . '/../_impl/auth/index.php';
`;

const usersStub = `<?php
define('PIMO_USERS_ROUTER', true);
require_once __DIR__ . '/../_impl/users/index.php';
`;

ensureDir(path.join(dist, "api", "auth"));
ensureDir(path.join(dist, "api", "users"));
fs.writeFileSync(path.join(dist, "api", "auth", "index.php"), authStub, "utf8");
fs.writeFileSync(path.join(dist, "api", "users", "index.php"), usersStub, "utf8");

console.log("[copyDeployApiToDist] Copiado auth/users para dist/api/ (_impl + stubs).");
