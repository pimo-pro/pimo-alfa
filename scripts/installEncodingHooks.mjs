#!/usr/bin/env node
/**
 * Instala o hook pre-commit de encoding no .git/hooks do repositorio.
 * Nao altera git config global — apenas escreve o hook local.
 */
import { copyFileSync, chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const repoRoot = existsSync(join(appRoot, "..", ".git"))
  ? resolve(appRoot, "..")
  : appRoot;
const srcHook = join(appRoot, ".githooks", "pre-commit");
const destDir = join(repoRoot, ".git", "hooks");
const destHook = join(destDir, "pre-commit");

if (!existsSync(srcHook)) {
  console.error("[encoding:hooks] Falta .githooks/pre-commit");
  process.exit(1);
}
if (!existsSync(join(repoRoot, ".git"))) {
  console.error("[encoding:hooks] .git nao encontrado em", repoRoot);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });

const body = readFileSync(srcHook, "utf8");
const isWin = process.platform === "win32";
if (isWin) {
  const wrapper = `#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";

const repoRoot = ${JSON.stringify(repoRoot)};
const candidates = [
  join(repoRoot, "pimo-criativo", "scripts", "auditPortugueseEncoding.mjs"),
  join(repoRoot, "scripts", "auditPortugueseEncoding.mjs"),
];
const script = candidates.find((p) => existsSync(p));
if (!script) {
  console.error("[encoding] script de auditoria nao encontrado");
  process.exit(1);
}
const cwd = dirname(dirname(script));
const r = spawnSync(process.execPath, [script, "--ci"], { cwd, stdio: "inherit" });
process.exit(r.status ?? 1);
`;
  writeFileSync(destHook, wrapper, { encoding: "utf8" });
} else {
  copyFileSync(srcHook, destHook);
  try {
    chmodSync(destHook, 0o755);
  } catch {
    /* ignore */
  }
}

console.log("[encoding:hooks] Instalado:", destHook);
console.log("[encoding:hooks] Regras: src/core/rules/linguagem-portuguesa.md");
void body;
