/**
 * Publicação com versionamento definitivo: V{MAJOR}.{MINOR}.{PATCH}.{YYYYMMDD}.{HHMM}
 * Exemplo: V4.1.0.20260313.1534
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const rootDir = process.cwd();
const versionFilePath = path.join(rootDir, "version.json");

function pad2(value) {
  return String(value).padStart(2, "0");
}

function getVersionWithTimestamp() {
  const now = new Date();
  const yyyymmdd =
    now.getFullYear() +
    pad2(now.getMonth() + 1) +
    pad2(now.getDate());
  const hhmm = pad2(now.getHours()) + pad2(now.getMinutes());
  return `${yyyymmdd}.${hhmm}`;
}

if (!fs.existsSync(versionFilePath)) {
  throw new Error(`Ficheiro nao encontrado: ${versionFilePath}`);
}

const currentRaw = fs.readFileSync(versionFilePath, "utf8");
const currentData = JSON.parse(currentRaw);
const now = new Date();
const baseVersion = (currentData.version || "V4.1.0").replace(/\.\d{8}\.\d{4}$/, "");
const timestamp = getVersionWithTimestamp();
const nextVersion = `${baseVersion}.${timestamp}`;
const updatedAt = `${pad2(now.getDate())}.${pad2(now.getMonth() + 1)}.${now.getFullYear()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

const nextData = {
  ...currentData,
  version: nextVersion,
  updatedAt,
};

fs.writeFileSync(versionFilePath, `${JSON.stringify(nextData, null, 2)}\n`, "utf8");

function runStep(description, command) {
  console.log(description);
  try {
    execSync(command, { stdio: "inherit" });
  } catch (err) {
    console.error(`Erro ao executar: ${command}`);
    process.exit(1);
  }
}

console.log(`Nova versao: ${nextVersion}`);
console.log(`updatedAt: ${nextData.updatedAt}`);

runStep("Executando build...", "npm run build");
runStep("Adicionando arquivos ao git...", "git add .");
runStep("Criando commit...", `git commit -m "Publicação automática"`);
runStep("Criando tag...", `git tag ${nextVersion}`);
runStep("Enviando push...", "git push");
runStep("Enviando push das tags...", "git push --tags");

console.log("Publicação concluída.");
