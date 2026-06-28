import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { IndustrialWorkOrderTask } from '@/industrial/work-orders/types';
import { getWorkOrderPieceDisplay } from '@/industrial/work-orders/resolveWorkOrderPiece';

type Props = {
  task: IndustrialWorkOrderTask;
  projectId: string;
  highlighted?: boolean;
  secondary?: ReactNode;
  actions?: React.ReactNode;
  linkToPiece?: boolean;
  style?: CSSProperties;
};

export default function WorkOrderPieceRow({
  task,
  projectId,
  highlighted = false,
  secondary,
  actions,
  linkToPiece = true,
  style,
}: Props) {
  const display = getWorkOrderPieceDisplay(task, projectId);

  return (
    <div
      style={{
        border: highlighted ? '2px solid #2563eb' : '1px solid #334155',
        borderRadius: 8,
        padding: 12,
        background: highlighted ? 'rgba(37, 99, 235, 0.08)' : 'rgba(255,255,255,0.04)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, wordBreak: 'break-word' }}>
            {linkToPiece ? (
              <Link to={`/industrial/piece/${task.pieceId}`} style={{ color: '#f8fafc', textDecoration: 'none' }}>
                {display.fullIndustrialName}
              </Link>
            ) : (
              display.fullIndustrialName
            )}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace' }}>
            {display.projectCode} · {display.boxCode} · {display.pieceCode} · NQR {display.nqrCode}
          </div>
          {secondary ? (
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{secondary}</div>
          ) : null}
        </div>
        {actions ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{actions}</div> : null}
      </div>
    </div>
  );
}
