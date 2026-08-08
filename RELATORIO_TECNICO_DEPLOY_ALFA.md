# Relatório técnico — pimo-alfa (deploy automático alfa.pimo.pro)

Data: 2026-08-08  
Repositório: `https://github.com/pimo-pro/pimo-alfa`  
Diretório local: `E:\pimp-alfa\pimo-alfa`

---

## 1. Estado atual do projeto

| Item | Valor |
|------|-------|
| Nome npm | `pimo-v3` |
| Branch ativa | `main` (tracking `origin/main`) |
| Remote `origin` | `https://github.com/pimo-pro/pimo-alfa.git` |
| Remote `upstream` | `C:/Users/rn/Desktop/pimo-v3/pimo-criativo` (push **DISABLED** — sync one-way) |
| Stack | React 19 + Vite + TypeScript + Three.js |
| Tipo módulo | `"type": "module"` (ESM) |
| Script build | `tsc -b && vite build && node scripts/copyDeployApiToDist.mjs` |
| Script deploy local alfa | `npm run deploy-alfa` → `node deploy-alfa.js` |

### Estrutura relevante

- `src/` — aplicação frontend
- `public/` — assets estáticos
- `api/`, `hostinger/`, `backend/` — APIs / hosting
- `scripts/copyDeployApiToDist.mjs` — copia PHP de deploy para **`dist/`**
- `.github/workflows/deploy.yml` — fluxo legado de tags `v*` → `/public_html/` (pimo.pro) — **não alterado**
- `.github/workflows/deploy-alfa.yml` — **novo** fluxo `main` → `/public_html/alfa` (alfa.pimo.pro)

---

## 2. Pasta de saída do Vite: `dist` (confirmado)

- Em `vite.config.ts` **não existe** `build.outDir` customizado.
- O default do Vite é **`dist`**.
- O post-build `copyDeployApiToDist.mjs` escreve explicitamente em `path.join(root, "dist")`.
- O CI legado (`deploy.yml`) usa `local-dir: dist/` e artefactos `dist/**`.
- **Conclusão:** a pasta correta é `dist`, não `build`.

---

## 3. Deploy local (validação)

| Ficheiro | Estado |
|----------|--------|
| `deploy-alfa.js` | Presente; ESM; força `deleteRemote=false`; valida remote com `/public_html/alfa` |
| `ftp-alfa.json` | Presente (gitignored); `localRoot: ./dist`; remote alfa |
| `ftp-alfa.example.json` | Template versionado |
| `ftp-deploy` | Instalado (`^2.4.7` em `devDependencies`) |
| Import ESM | OK (`typeof FTPDeploy === 'function'`) |

Teste executado: `node deploy-alfa.js`  
Resultado esperado e obtido: recusa com *«Defina a password real em ftp-alfa.json»* enquanto `SENHA_FTP_AQUI` estiver no placeholder.

Para deploy local real:

```powershell
# 1) password real em ftp-alfa.json
npm run build
npm run deploy-alfa
```

---

## 4. Isolamento face ao pimo.pro

| Aspeto | pimo.pro (legado) | alfa (novo) |
|--------|-------------------|-------------|
| Workflow | `deploy.yml` | `deploy-alfa.yml` |
| Trigger | tags `v*` | push em `main` |
| Destino FTP | `/public_html/` | `${{ secrets.FTP_REMOTE_ROOT }}` → pasta **alfa** |
| Clean slate | `dangerous-clean-slate: false` | `dangerous-clean-slate: false` |
| Alterações neste trabalho | **Nenhuma** | Ficheiro novo apenas |

Garantias:

- Nada fora de `/public_html/alfa` é alvo do workflow alfa.
- `dangerous-clean-slate: false` impede wipe do remoto.
- `deploy.yml` (Publish and Deploy) permanece intacto.

---

## 5. Workflow GitHub Actions — Deploy Alfa

Ficheiro: `.github/workflows/deploy-alfa.yml`

- Trigger: `push` → `main`
- Build: Node 18 + `npm install` + `npm run build`
- Deploy: `SamKirkland/FTP-Deploy-Action@v4.3.0`
- `local-dir: ./dist`
- `server-dir: ${{ secrets.FTP_REMOTE_ROOT }}`
- `dangerous-clean-slate: false`

### Segredos GitHub necessários (Settings → Secrets and variables → Actions)

| Secret | Valor esperado |
|--------|----------------|
| `FTP_HOST` | `147.93.93.102` |
| `FTP_USERNAME` | `u100505900.pimo.pro` |
| `FTP_PASSWORD` | *(password FTP)* |
| `FTP_PORT` | `21` |
| `FTP_REMOTE_ROOT` | `/home/u100505900/domains/pimo.pro/public_html/alfa/` |

> Recomendado terminar `FTP_REMOTE_ROOT` com `/`.  
> Confirmar no painel Hostinger que o document root de **alfa.pimo.pro** aponta para `public_html/alfa`.

---

## 6. Checklist pós-implementação

- [x] Pasta de saída = `dist`
- [x] Deploy local scriptado e validado (bloqueio de password placeholder)
- [x] `deploy-alfa.yml` criado
- [x] `deploy.yml` (pimo.pro) não modificado
- [ ] Segredos FTP configurados no repositório GitHub
- [ ] Push para `main` para disparar o workflow
- [ ] Verificar run em GitHub → Actions → **Deploy Alfa**
- [ ] Verificar https://alfa.pimo.pro após sucesso

---

## 7. Ficheiros deste trabalho

- `.github/workflows/deploy-alfa.yml`
- `deploy-alfa.js` / `ftp-alfa.json` (local) / `ftp-alfa.example.json`
- `DEPLOY_ALFA_LOG.md`
- `RELATORIO_TECNICO_DEPLOY_ALFA.md` (este ficheiro)
