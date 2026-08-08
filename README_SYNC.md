# Sincronização pimp-alfa ← pimo-criativo

- pimp-alfa configurado como repositório local
- remote 'upstream' = pimo-criativo
- push desativado (one-way sync)
- último fetch/merge executado com sucesso

## Detalhes técnicos

| Item | Valor |
|------|-------|
| Diretório | `E:\pimp-alfa\pimo-alfa` |
| Remote upstream (fetch) | `C:/Users/rn/Desktop/pimo-v3/pimo-criativo` |
| Remote upstream (push) | `DISABLED` |
| Branch mergeada | `upstream/main` |
| Remotes removidos | `origin` (GitHub) e qualquer `upstream` prévio |
| Data | 2026-08-08 13:05 |

## Como atualizar (somente pull)

```powershell
cd E:\pimp-alfa\pimo-alfa
git fetch upstream
git merge upstream/main
```

Nunca use `git push upstream` — o URL de push está desativado de propósito.
