#!/usr/bin/env sh
# =============================================================================
# Hostinger — criar symlink api → backend real
#
# O comando pedido:
#   ln -s /home/u100505900/public_html/api api
# deve ser executado no DocumentRoot do DOMÍNIO (onde está o index.html do React),
# NÃO dentro de /home/u100505900/public_html se esse for o mesmo destino do link
# (evita auto-referência: api → .../public_html/api enquanto estás em ~/public_html).
#
# Exemplo típico Hostinger:
#   DOCROOT=/home/u100505900/domains/pimo.pro/public_html
#
# Uso (SSH):
#   chmod +x scripts/hostinger-create-api-symlink.sh
#   ./scripts/hostinger-create-api-symlink.sh /home/u100505900/domains/pimo.pro/public_html
#
# Variável opcional API_TARGET para alterar o destino sem editar o script:
#   API_TARGET=/home/u100505900/public_html/api ./scripts/hostinger-create-api-symlink.sh "$DOCROOT"
# =============================================================================

set -eu

API_TARGET="${API_TARGET:-/home/u100505900/public_html/api}"
DOCROOT="${1:-}"

if [ -z "$DOCROOT" ]; then
  echo "Uso: $0 <caminho-absoluto-do-documentroot-do-site>" >&2
  echo "Ex.: $0 /home/u100505900/domains/pimo.pro/public_html" >&2
  exit 1
fi

if [ ! -d "$DOCROOT" ]; then
  echo "Erro: DocumentRoot não existe: $DOCROOT" >&2
  exit 1
fi

if [ ! -d "$API_TARGET" ]; then
  echo "Erro: destino do symlink não existe: $API_TARGET" >&2
  exit 1
fi

cd "$DOCROOT" || exit 1

if [ -e api ] && [ ! -L api ]; then
  echo "Erro: já existe 'api' como ficheiro/pasta (não é symlink)." >&2
  echo "Faça backup e renomeie ou remova antes (ex.: mv api api.bak.$(date +%Y%m%d))." >&2
  exit 1
fi

# -f substitui symlink antigo; -n evita seguir symlink ao remover
ln -sfn "$API_TARGET" api

echo "OK — symlink criado em:"
echo "  $DOCROOT/api -> $API_TARGET"
ls -la "$DOCROOT/api"
