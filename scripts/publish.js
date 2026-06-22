/**
 * Publicação com versionamento definitivo: v{A}.{MMDD}.{HHMM}
 * Exemplo: v6.0316.1542
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const rootDir = process.cwd();
const versionFilePath = path.join(rootDir, "version.json");

function pad2(value) {
  return String(value).padStart(2, "0");
}


function getShortVersion() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-1); // último dígito do ano
  const mmdd = pad2(now.getMonth() + 1) + pad2(now.getDate());
  const hhmm = pad2(now.getHours()) + pad2(now.getMinutes());
  return `v${year}.${mmdd}.${hhmm}`;
}

if (!fs.existsSync(versionFilePath)) {
  throw new Error(`Ficheiro nao encontrado: ${versionFilePath}`);
}

const currentRaw = fs.readFileSync(versionFilePath, "utf8").replace(/^\uFEFF/, "");
const currentData = JSON.parse(currentRaw);
const now = new Date();
const nextVersion = getShortVersion();
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

function runOutput(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}


console.log(`Nova versao: ${nextVersion}`);
console.log(`updatedAt: ${nextData.updatedAt}`);

runStep("Executando build...", "npm run build");
// Evitar adicionar repositórios embutidos (ex.: backend/ tem o seu próprio .git)
// para não criar gitlinks/submodules acidentais no repo principal.
runStep("Adicionando arquivos ao git...", "git add . \":(exclude)backend\"");
runStep("Criando commit...", `git commit -m "Publicação automática"`);
const localTagRef = runOutput(`git rev-parse -q --verify refs/tags/${nextVersion}`);
if (!localTagRef) {
  runStep("Criando tag...", `git tag ${nextVersion}`);
} else {
  console.log(`Tag local já existe: ${nextVersion} (reutilizando)`);
}
runStep("Enviando push...", "git push origin HEAD");
const remoteTagRef = runOutput(`git ls-remote --tags origin refs/tags/${nextVersion}`);
if (!remoteTagRef) {
  runStep("Enviando push da nova tag...", `git push origin refs/tags/${nextVersion}`);
} else {
  console.log(`Tag já existe no remoto: ${nextVersion} (sem erro)`);
}

console.log("Publicação concluída.");
