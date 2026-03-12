import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const versionFilePath = path.join(rootDir, "version.json");

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatNow(date) {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function incrementVersion(version) {
  const cleaned = String(version ?? "").trim();
  const prefix = cleaned.startsWith("V") ? "V" : "";
  const body = prefix ? cleaned.slice(1) : cleaned;
  const parts = body.split(".");

  if (parts.length === 0 || parts.some((part) => !/^\d+$/.test(part))) {
    throw new Error(`Formato de versao invalido em version.json: "${version}"`);
  }

  const lastIndex = parts.length - 1;
  const incrementedLast = String(Number(parts[lastIndex]) + 1);
  parts[lastIndex] = incrementedLast;

  return `${prefix}${parts.join(".")}`;
}

if (!fs.existsSync(versionFilePath)) {
  throw new Error(`Ficheiro nao encontrado: ${versionFilePath}`);
}

const currentRaw = fs.readFileSync(versionFilePath, "utf8");
const currentData = JSON.parse(currentRaw);
const nextVersion = incrementVersion(currentData.version);
const nextUpdatedAt = formatNow(new Date());

const nextData = {
  ...currentData,
  version: nextVersion,
  updatedAt: nextUpdatedAt,
};

fs.writeFileSync(versionFilePath, `${JSON.stringify(nextData, null, 2)}\n`, "utf8");

const commands = [
  "npm run build",
  "git add .",
  `git commit -m \"auto publish ${nextVersion}\"`,
  `git tag ${nextVersion}`,
  "git push",
  `git push origin ${nextVersion}`,
];

console.log(`Nova versao preparada: ${nextVersion}`);
console.log(`updatedAt: ${nextUpdatedAt}`);
console.log("Comandos sugeridos (nao executados):");
for (const command of commands) {
  console.log(command);
}
