import { Link } from 'react-router-dom';

import {
  INDUSTRIAL_CONTROL_CLASS,
  ensureIndustrialInteractionStyles,
  industrialBtnStyle,
} from '@/industrial/ui/layouts/industrialStyles';

const RAIL_LABEL_STYLE = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.3,
  textTransform: 'uppercase' as const,
};

export default function OperatorRail() {
  ensureIndustrialInteractionStyles();

  return (
    <nav style={{ display: 'grid', gap: 8, justifyItems: 'center' }} aria-label="Operador rail">
      <div
        title="Operador Industrial · QR / execução"
        className={INDUSTRIAL_CONTROL_CLASS}
        data-active="true"
        style={{
          ...industrialBtnStyle(true),
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          padding: 0,
          ...RAIL_LABEL_STYLE,
          boxShadow: '0 0 0 2px rgba(59,130,246,0.45)',
        }}
      >
        OPR
      </div>

      <div style={{ height: 1, width: '100%', background: 'var(--border, #334155)', margin: '4px 0' }} />

      <Link
        to="/industrial/supervisor"
        title="Supervisor Industrial"
        className={INDUSTRIAL_CONTROL_CLASS}
        style={{
          ...industrialBtnStyle(false),
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          textDecoration: 'none',
          padding: 0,
          ...RAIL_LABEL_STYLE,
        }}
      >
        SUP
      </Link>

      <Link
        to="/industrial/work-orders"
        title="Ordens de trabalho"
        className={INDUSTRIAL_CONTROL_CLASS}
        style={{
          ...industrialBtnStyle(false),
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          textDecoration: 'none',
          padding: 0,
          ...RAIL_LABEL_STYLE,
        }}
      >
        WOS
      </Link>
    </nav>
  );
}
