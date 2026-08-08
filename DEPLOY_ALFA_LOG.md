# Deploy automático do pimo-alfa

- Deploy configurado para `/public_html/alfa`
- Sem impacto no pimo.pro
- `deleteRemote = false` (seguro)
- Script: `deploy-alfa.js`

## Destino

| Item | Valor |
|------|-------|
| Subdomínio | https://alfa.pimo.pro |
| Host FTP | `147.93.93.102` |
| Utilizador | `u100505900.pimo.pro` |
| Remoto | `/home/u100505900/domains/pimo.pro/public_html/alfa` |
| Local | `./dist` (saída do Vite; o template usava `./build`) |
| Apagar remoto | **não** (`deleteRemote: false`) |

## Isolamento do site principal

- Só se envia conteúdo para `/public_html/alfa`
- Não se usa `dangerous-clean-slate` / delete remoto
- O fluxo de deploy de produção (`pimo.pro` / `/public_html/`) não é alterado
- Config FTP do alfa: `ftp-alfa.json` (credenciais locais; não versionar password)

## Como usar

1. Substituir `SENHA_FTP_AQUI` em `ftp-alfa.json` pela password FTP real
2. Gerar o build e publicar:

```powershell
cd E:\pimp-alfa\pimo-alfa
npm run build
npm run deploy-alfa
```

## Ficheiros

- `ftp-alfa.json` — configuração FTP (só destino alfa; no `.gitignore`)
- `ftp-alfa.example.json` — template versionado (copiar para `ftp-alfa.json`)
- `deploy-alfa.js` — script Node (`ftp-deploy`)
- `package.json` → script `deploy-alfa`
