import { useMemo } from 'react';

import { generateQrCodeSvg } from '@/core/qrcode/qrcodeService';
import type { IndustrialPiece } from '@/industrial/core/pieces/types';

interface PieceLabelProps {
  piece: IndustrialPiece;
  qrPayload: string;
  projectName?: string;
  boxName?: string;
}

export default function PieceLabel({ piece, qrPayload, projectName, boxName }: PieceLabelProps) {
  const qrSvg = useMemo(() => generateQrCodeSvg(qrPayload, 'M', 1), [qrPayload]);

  return (
    <div
      style={{
        border: '1px solid var(--border, #334155)',
        borderRadius: 8,
        padding: 12,
        background: 'var(--panel-bg, rgba(15, 23, 42, 0.55))',
        display: 'grid',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#94a3b8' }}>
        Etiqueta industrial
      </div>
      <div
        style={{ width: 120, height: 120, background: '#fff', borderRadius: 6, padding: 6 }}
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <dl style={{ margin: 0, display: 'grid', gap: 4, fontSize: 12 }}>
        <div><dt style={{ color: '#94a3b8' }}>ID</dt><dd style={{ margin: 0 }}>{piece.id}</dd></div>
        <div><dt style={{ color: '#94a3b8' }}>Projeto</dt><dd style={{ margin: 0 }}>{projectName ?? piece.projectId ?? '—'}</dd></div>
        <div><dt style={{ color: '#94a3b8' }}>Caixa</dt><dd style={{ margin: 0 }}>{boxName ?? piece.boxId ?? '—'}</dd></div>
        <div><dt style={{ color: '#94a3b8' }}>Material</dt><dd style={{ margin: 0 }}>{piece.material ?? '—'}</dd></div>
        <div>
          <dt style={{ color: '#94a3b8' }}>Dimensões</dt>
          <dd style={{ margin: 0 }}>
            {piece.dimensions.widthMm} × {piece.dimensions.heightMm} × {piece.dimensions.thicknessMm} mm
          </dd>
        </div>
        <div><dt style={{ color: '#94a3b8' }}>QR</dt><dd style={{ margin: 0, wordBreak: 'break-all' }}>{qrPayload}</dd></div>
      </dl>
    </div>
  );
}
