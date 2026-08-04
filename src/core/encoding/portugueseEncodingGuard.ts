/**
 * Guarda de encoding portugues (UTF-8).
 * Detecta acentuacao partida / mojibake / U+FFFD sem alterar logica industrial.
 * Ver: src/core/rules/linguagem-portuguesa.md
 *
 * Needles construidos via fromCodePoint — o ficheiro nunca contem literais mojibake.
 */

const REPLACEMENT = String.fromCodePoint(0xfffd);
const u = (...cps: number[]) => String.fromCodePoint(...cps);

/** Sequencias tipicas de UTF-8 lido como Latin-1/CP1252 (mojibake PT). */
const MOJIBAKE_NEEDLES: readonly string[] = [
  u(0xc3, 0xa1),
  u(0xc3, 0xa0),
  u(0xc3, 0xa3),
  u(0xc3, 0xa9),
  u(0xc3, 0xa7),
  u(0xc3, 0xb3),
  u(0xc3, 0xba),
  u(0xc3, 0xad),
  u(0xc3, 0xb5),
  u(0xc3, 0xaa),
  u(0xc3, 0x81),
  u(0xc3, 0x89),
  u(0xc3, 0x93),
  u(0xc3, 0x87),
  u(0xef, 0xbf, 0xbd),
];

export type EncodingIssueKind = "replacement" | "mojibake";

export type EncodingScanResult = {
  ok: boolean;
  replacementCount: number;
  mojibakeCount: number;
  samples: string[];
};

function countNeedle(text: string, needle: string): number {
  if (!needle || !text) return 0;
  let n = 0;
  let i = 0;
  while ((i = text.indexOf(needle, i)) !== -1) {
    n += 1;
    i += needle.length;
  }
  return n;
}

/** Indica se o texto tem acentuacao partida ou simbolo de substituicao. */
export function hasInvalidPortugueseEncoding(text: string): boolean {
  if (!text) return false;
  if (text.includes(REPLACEMENT)) return true;
  return MOJIBAKE_NEEDLES.some((n) => text.includes(n));
}

/** Analise detalhada para alertas ADMIN / testes. */
export function scanPortugueseEncoding(text: string): EncodingScanResult {
  if (!text) {
    return { ok: true, replacementCount: 0, mojibakeCount: 0, samples: [] };
  }
  const replacementCount = countNeedle(text, REPLACEMENT);
  let mojibakeCount = 0;
  const samples: string[] = [];
  for (const needle of MOJIBAKE_NEEDLES) {
    const c = countNeedle(text, needle);
    if (c > 0) {
      mojibakeCount += c;
      if (samples.length < 6) samples.push(needle);
    }
  }
  return {
    ok: replacementCount === 0 && mojibakeCount === 0,
    replacementCount,
    mojibakeCount,
    samples,
  };
}

/**
 * Mensagem de alerta para UI ADMIN.
 * Devolve null se o texto estiver limpo.
 */
export function encodingAlertMessage(text: string, sourceLabel?: string): string | null {
  const scan = scanPortugueseEncoding(text);
  if (scan.ok) return null;
  const where = sourceLabel ? ` (${sourceLabel})` : "";
  const parts: string[] = [];
  if (scan.replacementCount > 0) {
    parts.push(`${scan.replacementCount} caractere(s) de substituicao (U+FFFD)`);
  }
  if (scan.mojibakeCount > 0) {
    parts.push(`${scan.mojibakeCount} sequencia(s) mojibake`);
  }
  return `Encoding portugues invalido${where}: ${parts.join("; ")}. Use UTF-8 sem BOM. Ver regras de linguagem.`;
}
