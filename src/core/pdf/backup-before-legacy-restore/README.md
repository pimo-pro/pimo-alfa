# Backup — versão atual (pré-modelo legado)

Esta pasta contém cópia dos arquivos **atuais** de PDF Técnico, Cut List, PDF Unificado, Modal e hook, antes da restauração do modelo legado v1.9 / v2.8.9.

## Conteúdo

- `gerarPdfTecnico.ts` — PDF Técnico com materials service (getMaterialForBox, getMaterialDisplayInfo)
- `pdfCutlist.ts` — Cut List com logo QR e settings
- `pdfUnified.ts` — PDF Unificado que usa buildTechnicalPdf na primeira parte
- `GerarArquivoModal.tsx` — Modal atual (rádios + exportação rápida)
- `useGerarArquivoHandlers.ts` — Hook que usa buildTechnicalPdf no onPdfTecnico

## Como restaurar a versão atual

Na **raiz do projeto** execute:

```powershell
.\scripts\restore-pdf-atual.ps1
```

Isso copia estes arquivos de volta para os locais originais, revertendo para o fluxo atual (sem o modelo legado).

## Não alterado

- Nenhum arquivo TCN, nesting ou CNC foi alterado.
- `pdfTechnical.ts`, `pdfEtiquetas.ts`, `cutlistFromBoxes`, manufacturing e regras permanecem como estavam.
