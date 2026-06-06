import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { getRouteFromBarcode, parseBarcode } from '@/industrial/core/barcode/actions';

interface QrScannerPanelProps {
  onPieceScanned?: (pieceId: string) => void;
}

export default function QrScannerPanel({ onPieceScanned }: QrScannerPanelProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmed = value.trim();
    if (!trimmed) {
      setError('Introduza um código QR ou barcode.');
      return;
    }

    const parsed = parseBarcode(trimmed);
    if (!parsed) {
      setError('Formato inválido. Exemplo: PC-abc123');
      return;
    }

    if (parsed.entityType === 'piece' && onPieceScanned) {
      onPieceScanned(parsed.id);
      setValue('');
      return;
    }

    const route = getRouteFromBarcode(trimmed);
    if (!route) {
      setError('Código não reconhecido.');
      return;
    }

    navigate(route.startsWith('/pieces/') ? route.replace('/pieces/', '/industrial/piece/') : route);
    setValue('');
  };

  return (
    <section
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        background: 'rgba(15, 23, 42, 0.03)',
      }}
    >
      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Leitura QR / Barcode</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>
        Leia ou cole o código da peça (ex.: PC-&lt;id&gt;) para abrir a execução.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="PC-piece-id"
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            background: '#0f172a',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Ler
        </button>
      </form>
      {error ? <p style={{ margin: '8px 0 0', color: '#dc2626', fontSize: 12 }}>{error}</p> : null}
    </section>
  );
}
