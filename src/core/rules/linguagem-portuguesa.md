# Regras oficiais — Linguagem portuguesa (PIMO)

Documento obrigatório para **qualquer agente automático** (IA, scripts, CI) antes de escrever ou alterar texto no projecto.

Encoding canónico: **UTF-8 sem BOM**.

---

## Regra 1

**Todo texto deve usar português correcto com acentuação latina (UTF-8), sem símbolos estranhos.**

Exemplos correctos: `válida`, `Histórico`, `Responsável`, `Configurações`, `Título da página`, `orçamento`, `secção`, `dimensões`.

Proibidos no lugar de letras: o caractere de substituição U+FFFD, sequências mojibake (UTF-8 lido como Latin-1, ex. bytes C3 A9 em vez de U+00E9), ou qualquer símbolo estranho no lugar de acentuação latina.

---

## Regra 2

**Nenhum agente de IA pode gerar texto com encoding partido.**

- Escrever sempre UTF-8 sem BOM.
- Preferir escapes Unicode (`\u00e9`, `String.fromCodePoint`) em scripts de reparação — nunca literais mojibake no próprio script de auditoria.
- Não "corrigir" ficheiros que intencionalmente documentam padrões partidos (ex.: `scripts/auditPortugueseEncoding.mjs`).

---

## Regra 3

**Qualquer texto novo deve ser validado antes de entrar no commit.**

Antes de commit / PR:

```bash
cd pimo-criativo
npm run encoding:check
```

Ou:

```bash
node scripts/auditPortugueseEncoding.mjs --ci
```

Corrigir automaticamente (mojibake + remoção de BOM):

```bash
npm run encoding:fix
```

---

## Regra 4

**Se aparecer acentuação partida, o commit deve ser bloqueado.**

- Hook pré-commit: `.githooks/pre-commit` (instalar com `npm run encoding:hooks`).
- Build: `prebuild` corre `encoding:check`.
- CI / `--ci` falha se houver mojibake ou BOM UTF-8.
- `--ci --strict` falha também com `U+FFFD` (carácter de substituição).

---

## Protecção runtime (ADMIN / Viewer)

- ADMIN mostra alerta se texto carregado tiver acentuação inválida.
- Leitura de ficheiros de texto **só** via UTF-8 (`readTextFileAsUtf8` / `FileReader` com `"UTF-8"`).
- Proibido fallback para Latin-1, Windows-1252 ou ISO-8859-1.

---

## Referência rápida

- Bytes UTF-8 `C3 A1` devem aparecer como U+00E1 (á), não como U+00C3 + U+00A1.
- Bytes UTF-8 `C3 A9` → U+00E9 (é).
- Bytes UTF-8 `C3 A7` → U+00E7 (ç).
- Bytes UTF-8 `C3 A3` → U+00E3 (ã).
- Bytes UTF-8 `C3 B3` → U+00F3 (ó).
- Bytes UTF-8 `C3 BA` → U+00FA (ú).
- Se aparecer U+FFFD, o original perdeu-se: reescrever a palavra.

---

*PIMO Industrial — regras de linguagem. Não alterar IDs, chaves técnicas nem estruturas industriais ao normalizar texto.*
