/**
 * Renderizador Markdown leve para documentação READ-ONLY (sem dependências externas).
 */

import type { CSSProperties, ReactNode } from "react";
import { HELP_DOC_THEME as T } from "./helpDocTheme";

const mono: CSSProperties = { fontFamily: "ui-monospace, monospace", fontSize: 12 };

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={key++} style={{ color: T.text, fontWeight: 700 }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          style={{
            ...mono,
            padding: "1px 5px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 4,
            color: T.accent,
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const m = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (m) {
        parts.push(
          <a key={key++} href={m[2]} style={{ color: T.accent }}>
            {m[1]}
          </a>
        );
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function DocMarkdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre
          key={key++}
          style={{
            margin: "12px 0",
            padding: 12,
            background: "rgba(0,0,0,0.35)",
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            overflow: "auto",
            ...mono,
            color: T.text,
          }}
        >
          {lang ? <span style={{ color: T.muted, display: "block", marginBottom: 6 }}>{lang}</span> : null}
          {code.join("\n")}
        </pre>
      );
      i++;
      continue;
    }

    if (line.startsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!/^\|[\s\-:|]+\|$/.test(lines[i].trim())) {
          tableRows.push(
            lines[i]
              .split("|")
              .slice(1, -1)
              .map((c) => c.trim())
          );
        }
        i++;
      }
      if (tableRows.length > 0) {
        const [head, ...body] = tableRows;
        nodes.push(
          <div key={key++} style={{ overflowX: "auto", margin: "12px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {head.map((cell, ci) => (
                    <th
                      key={ci}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        borderBottom: `1px solid ${T.border}`,
                        color: T.text,
                      }}
                    >
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: "8px 10px",
                          borderBottom: `1px solid ${T.border}`,
                          color: T.muted,
                        }}
                      >
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    if (/^#{1,4}\s/.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s*/, "");
      const sizes = [0, 22, 18, 15, 13];
      const Tag = (`h${Math.min(level, 4)}` as "h1" | "h2" | "h3" | "h4");
      nodes.push(
        <Tag
          key={key++}
          style={{
            margin: level === 1 ? "0 0 16px" : "20px 0 10px",
            fontSize: sizes[level],
            fontWeight: level <= 2 ? 800 : 700,
            color: level === 1 ? T.text : level === 2 ? T.engineering : T.text,
            letterSpacing: level === 1 ? "-0.02em" : undefined,
          }}
        >
          {renderInline(text)}
        </Tag>
      );
      i++;
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ""));
        i++;
      }
      nodes.push(
        <ul key={key++} style={{ margin: "8px 0", paddingLeft: 20, color: T.muted, fontSize: 13, lineHeight: 1.7 }}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    nodes.push(
      <p key={key++} style={{ margin: "8px 0", fontSize: 13, color: T.muted, lineHeight: 1.7 }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <article style={{ fontFamily: T.font }}>{nodes}</article>;
}
