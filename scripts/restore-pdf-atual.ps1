# [OBSOLETO - Fase 6] O conteúdo do backup foi removido; o pipeline usa apenas cutlistFromBoxes.
# Este script mantido apenas como referência histórica. Não executar.
# Restaura os arquivos atuais de PDF/Cut List, Modal e hook a partir do backup
# criado antes da restauração do modelo legado. Execute na raiz do projeto:
#   .\scripts\restore-pdf-atual.ps1

$ErrorActionPreference = "Stop"
$backup = "src\core\pdf\backup-before-legacy-restore"
$pdf = "src\core\pdf"
$modal = "src\components\layout\right-panel"
$hooks = "src\hooks"

if (-not (Test-Path $backup)) {
  Write-Error "Pasta de backup não encontrada: $backup"
}

Copy-Item -Path "$backup\gerarPdfTecnico.ts" -Destination "$pdf\gerarPdfTecnico.ts" -Force
Copy-Item -Path "$backup\pdfCutlist.ts" -Destination "$pdf\pdfCutlist.ts" -Force
Copy-Item -Path "$backup\pdfUnified.ts" -Destination "$pdf\pdfUnified.ts" -Force
Copy-Item -Path "$backup\GerarArquivoModal.tsx" -Destination "$modal\GerarArquivoModal.tsx" -Force
Copy-Item -Path "$backup\useGerarArquivoHandlers.ts" -Destination "$hooks\useGerarArquivoHandlers.ts" -Force

Write-Host "Restauração concluída. Arquivos atuais (pré-legado) foram repostos."
Write-Host "  - $pdf\gerarPdfTecnico.ts"
Write-Host "  - $pdf\pdfCutlist.ts"
Write-Host "  - $pdf\pdfUnified.ts"
Write-Host "  - $modal\GerarArquivoModal.tsx"
Write-Host "  - $hooks\useGerarArquivoHandlers.ts"
