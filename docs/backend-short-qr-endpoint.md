# Short QR Endpoint (backend)

Este repositório é frontend; para cumprir a resolução via token curto no backend, use:

```js
app.get("/q/:token", async (req, res) => {
  const token = String(req.params.token || "").trim();
  if (!/^[A-Za-z0-9]{1,10}$/.test(token)) {
    return res.status(400).send("Invalid token");
  }
  const row = await db.query("SELECT * FROM items WHERE short_qr=$1", [token]);
  if (!row.rows.length) return res.status(404).send("Not found");
  return res.json(row.rows[0]); // ou redirect para URL interna
});
```

Payload do QR (frontend) configurável:
- `token_curto`: `<short_qr>`
- `url_completa`: `https://YOUR_DOMAIN/q/<short_qr>`
