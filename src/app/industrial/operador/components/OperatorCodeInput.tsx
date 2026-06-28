import { useCallback, useState, type FormEvent } from 'react';

import {
  industrialActionBtnStyle,
  industrialBtnStyle,
  industrialSectionTitleStyle,
} from '@/industrial/ui/layouts/industrialStyles';

import type { UseOperatorPageReturnExtended } from '../hooks/useOperatorPage';
import { useOperatorQrScanner } from '../hooks/useOperatorQrScanner';

type Props = {
  state: UseOperatorPageReturnExtended;
};

export default function OperatorCodeInput({ state }: Props) {
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScan = useCallback(
    async (code: string) => {
      if (state.mode === 'batch') {
        await state.loadBatchCodes(code);
      } else {
        await state.loadSingleCode(code);
      }
    },
    [state],
  );

  const scanner = useOperatorQrScanner({
    enabled: scannerOpen,
    continuous: true,
    onScan: handleScan,
  });

  const onSubmitSingle = (event: FormEvent) => {
    event.preventDefault();
    void state.loadSingleCode();
  };

  const onSubmitBatch = (event: FormEvent) => {
    event.preventDefault();
    void state.loadBatchCodes();
  };

  const toggleCamera = () => {
    if (scanner.cameraActive) {
      scanner.stopCamera();
      setScannerOpen(false);
      return;
    }
    setScannerOpen(true);
    void scanner.startCamera();
  };

  const toggleUsb = () => {
    if (scanner.usbCaptureActive) {
      scanner.stopUsbCapture();
      return;
    }
    scanner.startUsbCapture();
  };

  return (
    <section>
      <h3 style={{ ...industrialSectionTitleStyle, marginBottom: 8 }}>Entrada de códigos</h3>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => state.setMode('single')}
          style={industrialBtnStyle(state.mode === 'single')}
        >
          Individual
        </button>
        <button
          type="button"
          onClick={() => state.setMode('batch')}
          style={industrialBtnStyle(state.mode === 'batch')}
        >
          Lote
        </button>
      </div>

      {state.mode === 'single' ? (
        <form onSubmit={onSubmitSingle} style={{ display: 'grid', gap: 8 }}>
          <input
            value={state.codeInput}
            onChange={(event) => state.setCodeInput(event.target.value)}
            placeholder="NQR / código da peça / PC-…"
            data-operator-usb-capture="1"
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #334155',
              background: 'rgba(255,255,255,0.04)',
              color: '#f8fafc',
              fontSize: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" disabled={state.loading} style={industrialActionBtnStyle}>
              {state.loading ? 'A carregar…' : 'Carregar peça'}
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              style={industrialBtnStyle(scanner.cameraActive)}
            >
              {scanner.cameraActive ? 'Parar câmara' : 'Ler QR (câmara)'}
            </button>
            <button
              type="button"
              onClick={toggleUsb}
              style={industrialBtnStyle(scanner.usbCaptureActive)}
            >
              {scanner.usbCaptureActive ? 'USB activo' : 'Leitor USB'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={onSubmitBatch} style={{ display: 'grid', gap: 8 }}>
          <textarea
            value={state.batchInput}
            onChange={(event) => state.setBatchInput(event.target.value)}
            placeholder="Lista de códigos (um por linha ou separados por vírgula)"
            rows={4}
            data-operator-usb-capture="1"
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #334155',
              background: 'rgba(255,255,255,0.04)',
              color: '#f8fafc',
              fontSize: 12,
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" disabled={state.loading} style={industrialActionBtnStyle}>
              {state.loading ? 'A carregar…' : 'Carregar lote'}
            </button>
            <button type="button" onClick={toggleUsb} style={industrialBtnStyle(scanner.usbCaptureActive)}>
              {scanner.usbCaptureActive ? 'USB activo' : 'Leitor USB'}
            </button>
          </div>
        </form>
      )}

      {scanner.cameraActive ? (
        <div
          style={{
            marginTop: 10,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #334155',
            position: 'relative',
            maxHeight: 220,
          }}
        >
          <video
            ref={scanner.videoRef}
            muted
            playsInline
            style={{ width: '100%', display: 'block', background: '#000' }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              right: 8,
              fontSize: 10,
              color: '#e2e8f0',
              background: 'rgba(0,0,0,0.55)',
              padding: '4px 8px',
              borderRadius: 4,
            }}
          >
            Leitura contínua activa
            {scanner.lastScan ? ` · último: ${scanner.lastScan}` : ''}
          </div>
        </div>
      ) : null}

      {scanner.error ? (
        <p style={{ margin: '8px 0 0', color: '#f87171', fontSize: 11 }}>{scanner.error}</p>
      ) : null}

      {scanner.usbCaptureActive ? (
        <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 11 }}>
          Leitor USB activo — escaneie códigos (terminam com Enter).
        </p>
      ) : null}
    </section>
  );
}
