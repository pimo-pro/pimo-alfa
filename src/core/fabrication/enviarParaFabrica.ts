import {
  INDUSTRIAL_REQUIRED_ARTIFACT_KINDS,
  type IndustrialRequiredArtifactKind,
} from "../industrial/industrialOutputGuard";
import { ferragensTotaisPdfFileName } from "../pdf/pdfFerragensTotais";
import { pecasTotaisPdfFileName } from "../pdf/pdfPecasTotais";
import { resumoFinanceiroPdfFileName } from "../pdf/pdfResumoFinanceiro";
import { totaisProjetoPdfFileName } from "../pdf/pdfTotaisProjeto";
import { industrialFerragensPdfFileName, industrialFerragensXlsxFileName } from "./industrialProjectArtifacts";

export type EnviarParaFabricaValidation = {
  ok: boolean;
  missing: string[];
  projectName: string;
};

const BOTTOM_SECTION_PDFS = [
  resumoFinanceiroPdfFileName,
  pecasTotaisPdfFileName,
  ferragensTotaisPdfFileName,
  totaisProjetoPdfFileName,
] as const;

/**
 * Placeholder — valida artefactos industriais antes do envio ao PIMO TRAK.
 * Futuro: criar ordens de trabalho e anexar PDFs validados.
 */
export function enviarParaFabrica(
  projectName: string,
  generatedZipPaths: string[]
): EnviarParaFabricaValidation {
  const slug = projectName?.trim() || "Projeto";
  const expected = [
    resumoFinanceiroPdfFileName(slug),
    pecasTotaisPdfFileName(slug),
    ferragensTotaisPdfFileName(slug),
    totaisProjetoPdfFileName(slug),
    industrialFerragensPdfFileName(slug),
    industrialFerragensXlsxFileName(slug),
  ];

  const pathSet = new Set(generatedZipPaths.map((p) => p.split("/").pop() ?? p));
  const missing = expected.filter((name) => !pathSet.has(name));

  const requiredKinds: IndustrialRequiredArtifactKind[] = [...INDUSTRIAL_REQUIRED_ARTIFACT_KINDS];
  for (const kind of requiredKinds) {
    if (kind === "pdf-ferragens-industriais" && !pathSet.has(industrialFerragensPdfFileName(slug))) {
      if (!missing.includes(industrialFerragensPdfFileName(slug))) {
        missing.push(industrialFerragensPdfFileName(slug));
      }
    }
    if (kind === "xlsx-ferragens-industriais" && !pathSet.has(industrialFerragensXlsxFileName(slug))) {
      if (!missing.includes(industrialFerragensXlsxFileName(slug))) {
        missing.push(industrialFerragensXlsxFileName(slug));
      }
    }
  }

  for (const fn of BOTTOM_SECTION_PDFS) {
    const name = fn(slug);
    if (!pathSet.has(name) && !missing.includes(name)) missing.push(name);
  }

  return {
    ok: missing.length === 0,
    missing,
    projectName: slug,
  };
}
