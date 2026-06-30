import type { PortaRange } from "../../rules/rulesConfig";
import type { DoorRulesGaps, DoorRulesValidationIssue, ResolvedDoorRules } from "./doorRulesTypes";

export function validatePortaRanges(ranges: PortaRange[]): DoorRulesValidationIssue[] {
  const issues: DoorRulesValidationIssue[] = [];
  if (!ranges.length) {
    issues.push({ field: "hingeRanges", message: "Deve existir pelo menos um range de altura." });
    return issues;
  }

  const sorted = [...ranges].sort((a, b) => a.min - b.min);
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    if (!Number.isFinite(r.min) || !Number.isFinite(r.max) || !Number.isFinite(r.dobradicas)) {
      issues.push({ field: `hingeRanges[${i}]`, message: "Valores numéricos inválidos." });
      continue;
    }
    if (r.min > r.max) {
      issues.push({ field: `hingeRanges[${i}]`, message: "Altura mínima não pode exceder a máxima." });
    }
    if (r.dobradicas < 1) {
      issues.push({ field: `hingeRanges[${i}].dobradicas`, message: "Mínimo 1 dobradiça por range." });
    }
    if (i > 0 && r.min <= sorted[i - 1].max) {
      issues.push({
        field: `hingeRanges[${i}]`,
        message: `Range sobrepõe o anterior (${sorted[i - 1].min}–${sorted[i - 1].max}).`,
      });
    }
  }
  return issues;
}

export function validateDoorGaps(gaps: DoorRulesGaps): DoorRulesValidationIssue[] {
  const issues: DoorRulesValidationIssue[] = [];
  if (gaps.verticalMm < 0) issues.push({ field: "gaps.verticalMm", message: "Folga vertical não pode ser negativa." });
  if (gaps.horizontalMm < 0) issues.push({ field: "gaps.horizontalMm", message: "Folga horizontal não pode ser negativa." });
  if (gaps.duplaMm < 0) issues.push({ field: "gaps.duplaMm", message: "Gap entre folhas não pode ser negativo." });
  if (gaps.posZOffsetMm < 0) issues.push({ field: "gaps.posZOffsetMm", message: "Offset Z não pode ser negativo." });
  return issues;
}

export function validateResolvedDoorRules(resolved: ResolvedDoorRules): DoorRulesValidationIssue[] {
  return [...validateDoorGaps(resolved.gaps), ...validatePortaRanges(resolved.hingeRanges)];
}
