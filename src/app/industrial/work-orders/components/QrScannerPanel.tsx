import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { getRouteFromBarcode, parseBarcode } from '@/industrial/core/barcode/actions';

/**
 * Leitura QR / Barcode — modo individual + bulk (Enter adiciona; sem botão «Adicionar»).
 * Usado em ecrãs auxiliares; as estações industriais usam StationPanel.
 */
interface QrScannerPanelProps {
  onPieceScanned?: (pieceId: string) => void;
  /** Se true, cada leitura válida chama onPieceScanned e limpa o campo (leitura contínua). */
  continuous?: boolean;
}

export default function QrScannerPanel({ onPieceScanned, continuous = true }: QrScannerPanelProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastOk, setLastOk] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmed = value.trim();
    if (!trimmed) {
      setError('Introduza um código QR ou barcode.');
      return;
    }

    const codes = trimmed
      .split(/[\n\r,;\t]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    let navigated = false;
    for (const code of codes) {
      const parsed = parseBarcode(code);
      if (!parsed) {
        setError(`Formato inválido: ${code}. Exemplo: PC-abc123`);
        continue;
      }

      if (parsed.entityType === 'piece' && onPieceScanned) {
        onPieceScanned(parsed.id);
        setLastOk(parsed.id);
        continue;
      }

      const route = getRouteFromBarcode(code);
      if (!route) {
        setError(`Código não reconhecido: ${code}`);
        continue;
      }

      navigate(route.startsWith('/pieces/') ? route.replace('/pieces/', '/industrial/piece/') : route);
      navigated = true;
    }

    if (continuous || codes.length > 0) {
      setValue('');
    }
    if (navigated) setValue('');
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
        Leitura individual ou contínua: Enter adiciona automaticamente (cole vários códigos separados por linha).
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="PC-piece-id · Enter = adicionar"
          autoComplete="off"
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
      {lastOk ? (
        <p style={{ margin: '8px 0 0', color: '#16a34a', fontSize: 12 }}>Adicionado: {lastOk}</p>
      ) : null}
      {error ? <p style={{ margin: '8px 0 0', color: '#dc2626', fontSize: 12 }}>{error}</p> : null}
    </section>
  );
}

