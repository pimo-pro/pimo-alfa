import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type ValidationResult = {
  file: string;
  checks: {
    noW2200: boolean;
    noPieceComments: boolean;
    w89Complete: boolean;
    w2201LoopsClosed: boolean;
    side1Continuous: boolean;
    sideAuxAtEnd: boolean;
  };
  counts: {
    w89: number;
    w81: number;
    w2201: number;
    w2200: number;
    pieceComments: number;
  };
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "cnc-examples-output");
const BASE_FILE = join(OUT_DIR, "TEST 1 FINAL.tcn");

function countMatches(content: string, pattern: RegExp): number {
  return (content.match(pattern) ?? []).length;
}

function isW89Complete(line: string): boolean {
  if (!line.startsWith("W#89{")) return false;
  const required = ["WS=1", "#8015=0", "#1=", "#2=", "#3=", "#205=113", "#1001=100", "#2005=3", "#2002=21000", "#40=1"];
  return required.every((token) => line.includes(token));
}

function parseXY(line: string): { x: number; y: number } | null {
  const m = line.match(/X=([0-9]+(?:\.[0-9]+)?)\s+Y=([0-9]+(?:\.[0-9]+)?)/);
  if (!m) return null;
  return { x: Number(m[1]), y: Number(m[2]) };
}

function validateLoops(content: string): boolean {
  const lines = content.split(/\r?\n/);
  const loops: Array<Array<{ x: number; y: number }>> = [];
  let current: Array<{ x: number; y: number }> = [];

  for (const line of lines) {
    if (line.startsWith("W#2201 ")) {
      const p = parseXY(line);
      if (p) current.push(p);
      continue;
    }
    if (current.length > 0) {
      loops.push(current);
      current = [];
    }
  }
  if (current.length > 0) loops.push(current);
  if (loops.length === 0) return false;

  const eps = 0.001;
  return loops.every((loop) => {
    if (loop.length < 5) return false;
    const first = loop[0];
    const last = loop[loop.length - 1];
    return Math.abs(first.x - last.x) <= eps && Math.abs(first.y - last.y) <= eps;
  });
}

function validateSide1Continuous(content: string): boolean {
  const side1Start = content.indexOf("SIDE#1{");
  if (side1Start < 0) return false;
  const side1End = content.indexOf("}SIDE", side1Start);
  if (side1End < 0) return false;
  const side1Body = content.slice(side1Start, side1End);
  if (side1Body.includes(";PIECE")) return false;
  if (side1Body.includes("SIDE#3{") || side1Body.includes("SIDE#4{") || side1Body.includes("SIDE#5{") || side1Body.includes("SIDE#6{") || side1Body.includes("SIDE#2{")) {
    return false;
  }
  return true;
}

function validateSideAuxAtEnd(content: string): boolean {
  const side1Start = content.indexOf("SIDE#1{");
  if (side1Start < 0) return false;
  const side1End = content.indexOf("}SIDE", side1Start);
  if (side1End < 0) return false;
  const side3 = content.indexOf("SIDE#3{");
  const side4 = content.indexOf("SIDE#4{");
  const side5 = content.indexOf("SIDE#5{");
  const side6 = content.indexOf("SIDE#6{");
  const side2 = content.indexOf("SIDE#2{");
  const aux = [side3, side4, side5, side6, side2];
  if (aux.some((idx) => idx < 0)) return false;
  if (aux.some((idx) => idx < side1End)) return false;
  return side3 < side4 && side4 < side5 && side5 < side6 && side6 < side2;
}

function validateFile(file: string, content: string): ValidationResult {
  const lines = content.split(/\r?\n/);
  const w89Lines = lines.filter((l) => l.startsWith("W#89{"));
  return {
    file,
    checks: {
      noW2200: countMatches(content, /W#2200 /g) === 0,
      noPieceComments: countMatches(content, /;PIECE/g) === 0,
      w89Complete: w89Lines.length > 0 && w89Lines.every(isW89Complete),
      w2201LoopsClosed: validateLoops(content),
      side1Continuous: validateSide1Continuous(content),
      sideAuxAtEnd: validateSideAuxAtEnd(content),
    },
    counts: {
      w89: w89Lines.length,
      w81: countMatches(content, /W#81\{/g),
      w2201: countMatches(content, /W#2201 /g),
      w2200: countMatches(content, /W#2200 /g),
      pieceComments: countMatches(content, /;PIECE/g),
    },
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const base = await readFile(BASE_FILE, "utf8");

  // Variante A: igual ao final atual
  const variantA = base;

  // Variante B: remover W#81
  const variantB = base
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("W#81{"))
    .join("\n");

  // Variante C: igual à B + #3=10 em W#89
  const variantC = variantB.replace(
    /W#89\{ ::WTs WS=1 #8015=0 #1=([0-9]+\.[0-9]+) #2=([0-9]+\.[0-9]+) #3=([0-9]+\.[0-9]+) /g,
    "W#89{ ::WTs WS=1 #8015=0 #1=$1 #2=$2 #3=10.00 "
  );

  const pathA = join(OUT_DIR, "TEST_1_FINAL_A.tcn");
  const pathB = join(OUT_DIR, "TEST_1_FINAL_B.tcn");
  const pathC = join(OUT_DIR, "TEST_1_FINAL_C.tcn");
  await writeFile(pathA, variantA, "utf8");
  await writeFile(pathB, variantB, "utf8");
  await writeFile(pathC, variantC, "utf8");

  const valA = validateFile(pathA, variantA);
  const valB = validateFile(pathB, variantB);
  const valC = validateFile(pathC, variantC);

  const report = {
    generated: {
      variantA: pathA,
      variantB: pathB,
      variantC: pathC,
    },
    validations: [valA, valB, valC],
    differences: {
      A: "W#89 + W#81 + W#2201 (formato atual corrigido)",
      B: "W#89 + W#2201 (sem W#81)",
      C: "W#89 + W#2201 (sem W#81) com #3=10.00",
    },
    machineRecommendation: {
      closestToOriginal: "VARIANTE C",
      testOrder: ["VARIANTE C", "VARIANTE B", "VARIANTE A"],
      rationale:
        "C aproxima o exemplo original da máquina (#3=10) e elimina possível interferência do W#81 no parser de contorno.",
      observeOnMachine: [
        "Se os contornos aparecem na tela do post sem furos isolados.",
        "Se o preview exibe polilinhas fechadas para todas as peças.",
        "Se o ciclo de corte é aceito sem alertas de sintaxe/operação.",
        "Se a operação inicia em W#89 e segue W#2201 sem ignorar blocos.",
      ],
    },
  };

  const reportJson = join(OUT_DIR, "TEST_1_VARIANTS_REPORT.json");
  const reportTxt = join(OUT_DIR, "TEST_1_VARIANTS_REPORT.txt");
  await writeFile(reportJson, JSON.stringify(report, null, 2), "utf8");

  const txt = [
    "RELATORIO DE VARIANTES - TEST 1",
    `A: ${pathA}`,
    `B: ${pathB}`,
    `C: ${pathC}`,
    "",
    "CHECKS (A/B/C):",
    `noW2200: ${valA.checks.noW2200}/${valB.checks.noW2200}/${valC.checks.noW2200}`,
    `noPieceComments: ${valA.checks.noPieceComments}/${valB.checks.noPieceComments}/${valC.checks.noPieceComments}`,
    `w89Complete: ${valA.checks.w89Complete}/${valB.checks.w89Complete}/${valC.checks.w89Complete}`,
    `w2201LoopsClosed: ${valA.checks.w2201LoopsClosed}/${valB.checks.w2201LoopsClosed}/${valC.checks.w2201LoopsClosed}`,
    `side1Continuous: ${valA.checks.side1Continuous}/${valB.checks.side1Continuous}/${valC.checks.side1Continuous}`,
    `sideAuxAtEnd: ${valA.checks.sideAuxAtEnd}/${valB.checks.sideAuxAtEnd}/${valC.checks.sideAuxAtEnd}`,
    "",
    "RECOMENDACAO:",
    "Mais proxima do original: VARIANTE C",
    "Ordem de teste: C -> B -> A",
  ].join("\n");
  await writeFile(reportTxt, txt, "utf8");

  console.log("Variantes geradas:");
  console.log(pathA);
  console.log(pathB);
  console.log(pathC);
  console.log("Relatórios:");
  console.log(reportJson);
  console.log(reportTxt);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

