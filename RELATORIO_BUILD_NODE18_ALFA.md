# Relatório técnico — falha de build no GitHub Actions (Deploy Alfa)

Data: 2026-08-08  
Repositório: `https://github.com/pimo-pro/pimo-alfa`  
Workflow: `.github/workflows/deploy-alfa.yml`  
Run analisado: https://github.com/pimo-pro/pimo-alfa/actions/runs/31258651415

---

## 1. Sintoma

O job **Deploy Alfa** falhou no step **Build project** (`npm run build`).  
O step **Deploy via FTP** foi ignorado (skipped).

Erro reportado:

```text
[vite:worker-import-meta-url] crypto.hash is not a function
```

---

## 2. Causa raiz

| Facto | Evidência |
|-------|-----------|
| Workflow usava **Node 18** | `node-version: 18` em `deploy-alfa.yml` |
| Projeto usa **Vite 7.3.1** (`^7.2.4`) | `package.json` / `node_modules/vite` |
| Vite 7 exige Node **`^20.19.0 \|\| >=22.12.0`** | `engines` em `vite/package.json` |
| `crypto.hash` não existe no Node 18 | API introduzida em linhas Node 20.12+ / 21.7+; Node 18 tem WebCrypto incompleto para este uso |
| Plugin Vite envolvido | `vite:worker-import-meta-url` chama `crypto.hash` durante o bundle |

**Conclusão:** a falha não é do código industrial nem da estrutura do projeto — é incompatibilidade de **runtime CI (Node 18)** com **Vite 7**.

O workflow legado de produção (`deploy.yml` / pimo.pro) já usa `node-version: "20.19"`, o que reforça o diagnóstico.

---

## 3. Correção aplicada

Ficheiro alterado (único): `.github/workflows/deploy-alfa.yml`

```yaml
- name: Setup Node
  uses: actions/setup-node@v3
  with:
    node-version: 20
```

(antes: `node-version: 18`)

### O que NÃO foi alterado

- Estrutura do projeto
- Qualquer ficheiro industrial / `src/` / APIs
- `deploy.yml` (pimo.pro)
- `deploy-alfa.js` / `ftp-alfa.json` (deploy local)

---

## 4. Validação esperada após push

1. Novo run **Deploy Alfa** com Node 20
2. Step **Build project** a verde (`dist/` gerado)
3. Step **Deploy via FTP** a correr (requer secrets `FTP_*` configurados)
4. Site: https://alfa.pimo.pro

---

## 5. Deploy local

Continua independente do CI:

```powershell
npm run build
npm run deploy-alfa
```

Requisitos locais: Node ≥ 20.19 (ambiente atual do developer: Node 24.x — compatível).
