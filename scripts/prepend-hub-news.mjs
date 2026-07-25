/**
 * Prepend Hub feature entry to news.json (UTF-8 via \\u only).
 */
import fs from "node:fs";

const u = (...c) => String.fromCodePoint(...c);
const em = u(0x2014);
const Documentacao = "Documenta" + u(0xe7, 0xe3) + "o";
const Avancado = "Avan" + u(0xe7) + "ado";
const Secoes = "Sec" + u(0xe7) + u(0xf5) + "es";
const Historico = "Hist" + u(0xf3) + "rico";
const graficos = "gr" + u(0xe1) + "ficos";
const ligacoes = "liga" + u(0xe7) + u(0xf5) + "es";

const NEWS_PATH = "public/updates/news.json";
const raw = fs.readFileSync(NEWS_PATH, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw);
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const version = `v${String(now.getFullYear()).slice(-1)}.${pad(now.getMonth() + 1)}${pad(now.getDate())}.${pad(now.getHours())}${pad(now.getMinutes())}`;
const publishedAt = now.toISOString();

const title = `Hub de ${Documentacao} Interna completo ${em} Fases 10${u(0x2013)}12 + pimo-soon`;
const description = [
  `Hub de ${Documentacao} Interna completo em /documentacao:`,
  `Fase 10 ${em} Planeamento Futuro integrada;`,
  `Fase 11 ${em} Atual (Estado do Sistema) adicionada;`,
  `Fase 12 ${em} Dashboard ${Avancado} publicada;`,
  `pimo-soon ${em} Plano Futuro (fases 13${u(0x2013)}18) como sec${u(0xe7)}${u(0xe3)}o oficial;`,
  `layout full-width + grelha responsiva;`,
  `encoding UTF-8 sem BOM validado;`,
  `KPIs, snapshots, ${graficos} SVG e ${ligacoes} cruzadas ativos.`,
  `${Secoes}: ${Historico} + Refs + Progresso + Planeamento + Atual + Dashboard + pimo-soon.`,
].join(" ");

const entry = {
  version,
  title,
  description,
  publishedAt,
  type: "feature",
  author: "pimo-pro",
  icon: "feature",
};

// Remove previous broken hub entry if same hour versions or corrupted titles
const news = (Array.isArray(data.news) ? data.news : []).filter((n) => {
  if (!n || typeof n !== "object") return false;
  if (n.version === version) return false;
  if (typeof n.title === "string" && n.title.includes("\uFFFD")) return false;
  if (typeof n.title === "string" && /Documenta.{0,6}o Interna completo/.test(n.title) && n.version.startsWith("v6.0726.")) {
    return false;
  }
  return true;
});

news.unshift(entry);

const payload = {
  updatedAt: publishedAt,
  news,
};

fs.writeFileSync(NEWS_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

const check = JSON.parse(fs.readFileSync(NEWS_PATH, "utf8"));
const first = check.news[0];
console.log("version", first.version);
console.log("titleOk", first.title.includes(Documentacao) && !first.title.includes("\uFFFD"));
console.log("descOk", first.description.includes("Planeamento") && !first.description.includes("\uFFFD"));
console.log("total", check.news.length);
