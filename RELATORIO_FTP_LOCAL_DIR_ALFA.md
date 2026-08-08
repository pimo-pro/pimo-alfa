# Mini-relatório — falha FTP Deploy Alfa (`local-dir`)

Data: 2026-08-08  
Workflow: `.github/workflows/deploy-alfa.yml`  
Run de referência: https://github.com/pimo-pro/pimo-alfa/actions/runs/31259093888

## Sintoma

Step **Deploy via FTP** falhou após **Build project** ter passado (Node 20).

Erro:

```text
local-dir should be a folder (must end with /)
```

## Causa

O `SamKirkland/FTP-Deploy-Action` exige que `local-dir` termine com `/`.  
O workflow tinha `local-dir: ./dist` (sem barra final).

O workflow de produção (`deploy.yml`) já usa o formato correto: `local-dir: dist/`.

## Correção

Único ficheiro alterado: `.github/workflows/deploy-alfa.yml`

```diff
- local-dir: ./dist
+ local-dir: ./dist/
```

Sem alterações a código industrial, estrutura do projeto, ou `deploy.yml` (pimo.pro).  
Node 20 mantido.

## Validação

Após push para `main`: novo run Deploy Alfa — confirmar Build success + início do step FTP sem o erro de `local-dir`.
