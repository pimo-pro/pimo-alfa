import qrcode from "qrcode-generator";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";

type ProjectQrContext = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
};

const sanitize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "");

function projectPrefix(projectName: string, mode?: RulesConfig["qrcode"]["modoPrefixoProjeto"]): string {
  const words = projectName?.trim?.().split(/\s+/).filter(Boolean).map(sanitize).filter(Boolean) ?? [];
  if (words.length === 0) return "prj";
  const safeMode = mode ?? "auto";
  const selectedMode = safeMode === "auto"
    ? (words.length === 1 ? "3" : words.length === 2 ? "2+2" : "1+1+1")
    : safeMode;
  if (selectedMode === "3") return (words[0] || "prj").slice(0, 3).padEnd(3, "x");
  if (selectedMode === "2+2") return `${(words[0] || "x").slice(0, 2)}${(words[1] || "x").slice(0, 2)}`;
  return words.map((w) => w[0]).join("").slice(0, 4).padEnd(3, "x");
}

function pieceTypeAbbr(tipo: string): string {
  const t = sanitize(tipo);
  if (t === "cima") return "ci";
  if (t === "fundo") return "fu";
  if (t === "lateralesquerda") return "le";
  if (t === "lateraldireita") return "ld";
  if (t === "prateleira") return "pr";
  if (t.includes("porta")) return "po";
  if (t.includes("gaveta")) return "ga";
  return t.slice(0, 2).padEnd(2, "x");
}

function orientationAbbr(nome: string, tipo: string): string {
  const n = sanitize(`${nome} ${tipo}`);
  if (n.includes("esquerda") || n.includes("_esq")) return "e";
  if (n.includes("direita") || n.includes("_dir")) return "d";
  if (n.includes("frente") || n.includes("_frente")) return "f";
  if (n.includes("tras") || n.includes("costa") || n.includes("_fundo")) return "t";
  return "";
}

function cyclicPieceNumber(index0: number, restart99: boolean): number {
  if (!restart99) return index0 + 1;
  return (index0 % 99) + 1;
}

export function generateShortCodeForPiece(
  piece: CutListItemComPreco,
  project: ProjectQrContext,
  pieceIndex0: number
): { shortCode: string; pieceNumber: number } {
  if (!project || !piece || !piece.tipo) {
    return { shortCode: "ERR", pieceNumber: 0 };
  }
  
  try {
    const projectName = project.projectName ?? "Projeto";
    const qrcodeMode = project.rules?.qrcode?.modoPrefixoProjeto ?? "auto";
    const restartAt99 = project.rules?.qrcode?.reiniciarContagemEm99 ?? true;
    
    const prefix = projectPrefix(projectName, qrcodeMode);
    const boxName = sanitize(project.boxes?.find?.((b) => b?.id === piece.boxId)?.nome ?? piece.boxId ?? "bx");
    const pieceAbbr = pieceTypeAbbr(piece.tipo);
    const o = orientationAbbr(piece.nome ?? "", piece.tipo);
    const number = cyclicPieceNumber(pieceIndex0, restartAt99);
    const shortCode = `${prefix}${boxName}${pieceAbbr}${o}${number}`;
    return { shortCode, pieceNumber: number };
  } catch (err) {
    console.warn("[qrcodeService] Error generating short code:", err);
    return { shortCode: "ERR", pieceNumber: 0 };
  }
}

export function generateQrCodeSvg(shortCode: string): string {
  const qr = qrcode(0, "M");
  qr.addData(shortCode);
  qr.make();
  return qr.createSvgTag({ scalable: true, margin: 0 });
}

export function attachQrCodesToCutlist(
  items: CutListItemComPreco[],
  project: ProjectQrContext
): CutListItemComPreco[] {
  if (!items || !Array.isArray(items)) return [];
  if (!project || !project.rules || !project.rules.qrcode) {
    console.warn("[qrcodeService] Invalid project context, returning items without QR codes");
    return items;
  }
  
  return items.map((item, idx) => {
    if (!item || !item.tipo) {
      console.warn("[qrcodeService] Skipping invalid item:", item);
      return item;
    }
    
    try {
      const generated = generateShortCodeForPiece(item, project, idx);
      return {
        ...item,
        shortCode: generated.shortCode,
        pieceNumber: generated.pieceNumber,
        qrSvg: generated.shortCode !== "ERR" ? generateQrCodeSvg(generated.shortCode) : "",
      };
    } catch (err) {
      console.warn(`[qrcodeService] Error attaching QR code to item ${idx}:`, err);
      return item;
    }
  });
}
