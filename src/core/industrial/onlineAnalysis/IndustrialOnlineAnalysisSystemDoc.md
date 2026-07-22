# Análise arquivo completo / PDFs industriais online

**Fase:** 1–6 (análise ? edição ? histórico ? download ? UEE ? robustez)  
**Módulo:** `src/core/industrial/onlineAnalysis/`  
**Flag:** `industrialOnlineAnalysis` (default `false`; controla páginas `/analise`)

## Fases 1–5 (resumo)

- Rotas `/PROJETOS/:project/analise` (+ `:docId`)
- Overrides + histórico append-only + download seletivo
- UEE: `applyDocumentaryOverridesToCutlistForEtiquetas` (só `overrides.cutlist`)
- CNC/TCN/drill/nesting no item base (sem document overrides)

## Fase 6 — Robustez e polish

### Validações

- `validateIndustrialOnlineAnalysisDraft` — **bloqueia Guardar** se qtd/material/obs inválidos em linhas tocadas
- `sanitizeIndustrialDocumentOverride` — remove keys bloqueadas; limpa patches em `deletedRowIds`
- Whitelist UEE usa os mesmos parsers (`parseIndustrialAnalysisQty`, material, obs)

### Testes

`src/core/industrial/onlineAnalysis/__tests__/` — P0 + P1 (multi-prefix, CNC ? UEE)

### Export

Aviso toast se flag off e cutlist com overrides (PDFs/etiquetas ainda reflectem; CNC intacto).

### UI

Encoding PT corrigido; copy alinhada à Fase 5; a11y básica (labels, roles, aria-live).

## Garantias

3D / rules / CNC / TCN / drill / nesting / geometria intocados. Piece edits ? document overrides.
