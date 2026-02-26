import qrcode from "qrcode-generator";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";

type ProjectQrContext = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
};

const sanitize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "");
const TOKEN_MAX_LEN = 10;
const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

function normalizePieceDigits(value: number): 2 | 3 | 4 {
  if (!Number.isFinite(value)) return 3;
  if (value <= 2) return 2;
  if (value >= 4) return 4;
  return 3;
}

function getPieceSuffix(pieceNumber: number, pieceDigits: 2 | 3 | 4): string {
  const maxNumber = 10 ** pieceDigits - 1;
  const safeNumber = ((Math.max(1, Math.floor(pieceNumber)) - 1) % maxNumber) + 1;
  return String(safeNumber).padStart(pieceDigits, "0");
}

function deterministicPrefix(seed: string, prefixLen: number): string {
  if (prefixLen <= 0) return "";
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let out = "";
  let current = hash >>> 0;
  for (let i = 0; i < prefixLen; i++) {
    current = (Math.imul(current, 1103515245) + 12345) >>> 0;
    out += TOKEN_ALPHABET[current % TOKEN_ALPHABET.length];
  }
  return out;
}

function makeToken(seed: string, pieceNumber: number, pieceDigits: 2 | 3 | 4): string {
  const suffix = getPieceSuffix(pieceNumber, pieceDigits);
  const prefixLen = Math.max(1, TOKEN_MAX_LEN - pieceDigits);
  const prefix = deterministicPrefix(seed, prefixLen);
  return `${prefix}${suffix}`.slice(0, TOKEN_MAX_LEN);
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
    const restartAt99 = project.rules?.qrcode?.reiniciarContagemEm99 ?? true;
    const number = cyclicPieceNumber(pieceIndex0, restartAt99);
    const pieceDigits = normalizePieceDigits(project.rules?.etiqueta?.numeroDigitosPeca ?? 3);
    const projectName = sanitize(project.projectName ?? "projeto");
    const boxName = sanitize(project.boxes?.find?.((b) => b?.id === piece.boxId)?.nome ?? piece.boxId ?? "bx");
    const pieceAbbr = pieceTypeAbbr(piece.tipo);
    const o = orientationAbbr(piece.nome ?? "", piece.tipo);
    const seed = `${projectName}:${boxName}:${pieceAbbr}:${o}:${piece.id ?? piece.nome ?? "part"}:${pieceIndex0}`;
    const shortCode = makeToken(seed, number, pieceDigits);
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

export function buildQrPayload(shortCode: string, rules?: RulesConfig): string {
  const mode = rules?.etiqueta?.modoExibicaoQr ?? "token_curto";
  if (mode === "url_completa") {
    return `https://YOUR_DOMAIN/q/${shortCode}`;
  }
  return shortCode;
}

export function formatLabelNumber(
  shortCode: string,
  pieceNumber: number,
  rules?: RulesConfig
): string {
  const pieceDigits = normalizePieceDigits(rules?.etiqueta?.numeroDigitosPeca ?? 3);
  const piece = getPieceSuffix(pieceNumber, pieceDigits);
  const mode = rules?.etiqueta?.formatoNumeroExibido ?? "peca_apenas";
  if (mode === "token_apenas") return shortCode;
  if (mode === "token_peca") return `${shortCode}-${piece}`;
  const template = rules?.etiqueta?.templateNumero ?? "#{piece}";
  return template.replace(/\{piece\}/g, piece).replace(/#\{piece\}/g, `#${piece}`);
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
  
  const usedShortCodes = new Set<string>();
  return items.map((item, idx) => {
    if (!item || !item.tipo) {
      console.warn("[qrcodeService] Skipping invalid item:", item);
      return item;
    }
    
    try {
      const generated = generateShortCodeForPiece(item, project, idx);
      const pieceDigits = normalizePieceDigits(project.rules?.etiqueta?.numeroDigitosPeca ?? 3);
      const baseSeed = `${project.projectName ?? "projeto"}:${item.boxId ?? "bx"}:${item.id ?? item.nome ?? "part"}:${idx}`;
      let shortCode = generated.shortCode;
      if (usedShortCodes.has(shortCode)) {
        // Retry deterministic seeds to avoid collisions in the same cutlist batch.
        for (let attempt = 1; attempt <= 16; attempt += 1) {
          const next = makeToken(`${baseSeed}:retry:${attempt}`, generated.pieceNumber, pieceDigits);
          if (!usedShortCodes.has(next)) {
            shortCode = next;
            break;
          }
        }
      }
      usedShortCodes.add(shortCode);
      return {
        ...item,
        shortCode,
        pieceNumber: generated.pieceNumber,
        qrSvg:
          shortCode !== "ERR"
            ? generateQrCodeSvg(buildQrPayload(shortCode, project.rules))
            : "",
      };
    } catch (err) {
      console.warn(`[qrcodeService] Error attaching QR code to item ${idx}:`, err);
      return item;
    }
  });
}
