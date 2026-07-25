import fs from "node:fs";

const p = "src/core/docs/progresso/progressoSections.ts";
const buf = fs.readFileSync(p);
const text = buf.toString("utf8");
const line = text.split("\n").find((l) => l.includes("title:") && l.includes("1."));
console.log("line", line);
console.log("includes Fundação", text.includes("Fundação"));
console.log("includes Funda", text.includes("Funda"));
console.log("includes mojibake box", text.includes("?"));
console.log("BOM", buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf);

// show codepoints around Funda
const i = text.indexOf("Funda");
if (i >= 0) {
  const slice = text.slice(i, i + 20);
  console.log([...slice].map((c) => c + " U+" + c.codePointAt(0).toString(16)).join(" | "));
}
