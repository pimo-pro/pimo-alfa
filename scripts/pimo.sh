#!/usr/bin/env bash
# Fluxo único: build → lint → commit → tag → push → deploy (publish).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Erro: não é um repositório Git." >&2
  exit 1
fi

if [ -f .git/MERGE_HEAD ]; then
  echo "Erro: merge em curso; resolve os conflitos antes de publicar." >&2
  exit 1
fi
if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then
  echo "Erro: rebase em curso; conclui ou aborta antes de publicar." >&2
  exit 1
fi
if [ -n "$(git diff --name-only --diff-filter=U 2>/dev/null)" ]; then
  echo "Erro: existem ficheiros em conflito (unmerged)." >&2
  exit 1
fi

# Alterações não commitadas são aceites: o script fará git add e commit abaixo.
# Impede estado inconsistente: tudo tem de entrar no mesmo commit (nada fica por staged após add -A).
if ! npm run build; then
  echo "Erro: npm run build falhou. Publicação abortada." >&2
  exit 1
fi

if ! npm run lint; then
  echo "Erro: npm run lint falhou. Publicação abortada." >&2
  exit 1
fi

git add -A

if git diff --cached --quiet; then
  echo "Erro: não há alterações para commitar (working tree vazio após git add -A)." >&2
  exit 1
fi

git commit -m "feat(pimo): publicação automática via pimo script"

TAG="v$(date +%Y.%m.%d-%H%M)"
if git rev-parse "refs/tags/$TAG" >/dev/null 2>&1; then
  echo "Erro: a tag $TAG já existe localmente; escolhe outro instante ou remove a tag." >&2
  exit 1
fi

git tag -a "$TAG" -m "Publicação PIMO $TAG"

if ! git push; then
  echo "Erro: git push falhou." >&2
  exit 1
fi

if ! git push --tags; then
  echo "Erro: git push --tags falhou." >&2
  exit 1
fi

# Deploy = fluxo já usado no projeto (scripts/publish.js), não confundir com scripts/deploy.sh (Hostinger/manual).
if ! npm run publish; then
  echo "Erro: deploy (npm run publish) falhou — ver mensagens acima." >&2
  exit 1
fi

echo "PIMO publicado com sucesso."
