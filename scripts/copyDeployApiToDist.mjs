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
const srcUserSettings = path.join(root, "api", "user-settings", "index.php");
const srcGlobalConfig = path.join(root, "api", "global-config", "index.php");

if (!fs.existsSync(srcAuth) || !fs.existsSync(srcUsers)) {
  console.warn("[copyDeployApiToDist] api/auth ou api/users em falta — nada a copiar.");
  process.exit(0);
}

copyFile(srcAuth, path.join(dist, "api", "_impl", "auth", "index.php"));
copyFile(srcUsers, path.join(dist, "api", "_impl", "users", "index.php"));
if (fs.existsSync(srcUserSettings)) {
  copyFile(srcUserSettings, path.join(dist, "api", "_impl", "user-settings", "index.php"));
}
if (fs.existsSync(srcGlobalConfig)) {
  copyFile(srcGlobalConfig, path.join(dist, "api", "_impl", "global-config", "index.php"));
}

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

const userSettingsStub = `<?php
define('PIMO_USER_SETTINGS_ROUTER', true);
require_once __DIR__ . '/../_impl/user-settings/index.php';
`;

const globalConfigStub = `<?php
define('PIMO_GLOBAL_CONFIG_ROUTER', true);
require_once __DIR__ . '/../_impl/global-config/index.php';
`;

ensureDir(path.join(dist, "api", "auth"));
ensureDir(path.join(dist, "api", "users"));
fs.writeFileSync(path.join(dist, "api", "auth", "index.php"), authStub, "utf8");
fs.writeFileSync(path.join(dist, "api", "users", "index.php"), usersStub, "utf8");
if (fs.existsSync(srcUserSettings)) {
  ensureDir(path.join(dist, "api", "user-settings"));
  fs.writeFileSync(path.join(dist, "api", "user-settings", "index.php"), userSettingsStub, "utf8");
}
if (fs.existsSync(srcGlobalConfig)) {
  ensureDir(path.join(dist, "api", "global-config"));
  fs.writeFileSync(path.join(dist, "api", "global-config", "index.php"), globalConfigStub, "utf8");
}

const extras = [];
if (fs.existsSync(srcUserSettings)) extras.push("user-settings");
if (fs.existsSync(srcGlobalConfig)) extras.push("global-config");
console.log(
  "[copyDeployApiToDist] Copiado auth/users" +
    (extras.length ? "/" + extras.join("/") : "") +
    " para dist/api/ (_impl + stubs)."
);
