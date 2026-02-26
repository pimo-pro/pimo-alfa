-- Migração de suporte ao token curto QR (máx. 10 chars)
-- Ajuste o nome da tabela se necessário.

ALTER TABLE items ADD COLUMN IF NOT EXISTS short_qr VARCHAR(10);
CREATE UNIQUE INDEX IF NOT EXISTS ux_items_short_qr ON items(short_qr);

-- Endpoint esperado (backend): GET /q/:token -> SELECT ... WHERE short_qr = $1
