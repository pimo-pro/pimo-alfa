// pimo-kep-fix-005 — protegido, não modificar sem autorização

import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

const rootDir = process.cwd();
const dailyPath = path.join(rootDir, "public", "industrial", "release", "daily.json");

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`ERRO: variavel de ambiente ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

function readDailyFile() {
  if (!fs.existsSync(dailyPath)) {
    console.error(`ERRO: ficheiro nao encontrado: ${dailyPath}`);
    console.error("Execute primeiro: npm run release:daily");
    process.exit(1);
  }

  try {
    const data = JSON.parse(fs.readFileSync(dailyPath, "utf8").replace(/^\uFEFF/, ""));
    return {
      date: typeof data.date === "string" ? data.date : "",
      entries: Array.isArray(data.entries) ? data.entries : [],
    };
  } catch {
    console.error(`ERRO: nao foi possivel ler ${dailyPath}`);
    process.exit(1);
  }
}

function buildPlainTextBody(daily) {
  const lines = [
    "PIMO — Release Notes diarias",
    `Data: ${daily.date || "—"}`,
    "",
  ];

  if (daily.entries.length === 0) {
    lines.push("Sem publicacoes nas ultimas 24 horas.");
    return `${lines.join("\n")}\n`;
  }

  daily.entries.forEach((entry, index) => {
    const when = entry.publishedAt
      ? new Date(entry.publishedAt).toLocaleString("pt-PT")
      : "—";
    lines.push(`${index + 1}. ${entry.version || "—"}`);
    lines.push(`   Autor: ${entry.author || "—"}`);
    lines.push(`   Mensagem: ${entry.commitMessage || "—"}`);
    lines.push(`   Publicado: ${when}`);
    lines.push("");
  });

  return `${lines.join("\n")}\n`;
}

const smtpHost = requireEnv("SMTP_HOST");
const smtpPort = Number(requireEnv("SMTP_PORT"));
const smtpUser = requireEnv("SMTP_USER");
const smtpPass = requireEnv("SMTP_PASS");
const emailTo = requireEnv("EMAIL_TO");
const emailFrom = process.env.EMAIL_FROM?.trim() || smtpUser;

if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
  console.error("ERRO: SMTP_PORT invalido.");
  process.exit(1);
}

const daily = readDailyFile();
const textBody = buildPlainTextBody(daily);

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

const subject = `PIMO Release Notes — ${daily.date || "diario"}`;

try {
  const info = await transporter.sendMail({
    from: emailFrom,
    to: emailTo,
    subject,
    text: textBody,
  });
  console.log(`E-mail enviado: ${info.messageId || "ok"} (${daily.entries.length} entrada(s))`);
} catch (err) {
  console.error("ERRO ao enviar e-mail:", err instanceof Error ? err.message : err);
  process.exit(1);
}
