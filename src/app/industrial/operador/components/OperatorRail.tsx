import { Link } from 'react-router-dom';

import IndustrialSpriteIcon from '@/components/icons/IndustrialSpriteIcon';
import { industrialBtnStyle } from '@/industrial/ui/layouts/industrialStyles';

export default function OperatorRail() {
  return (
    <nav style={{ display: 'grid', gap: 8, justifyItems: 'center' }} aria-label="Operador rail">
      <div
        title="Operador Industrial"
        style={{
          ...industrialBtnStyle(true),
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          padding: 0,
        }}
      >
        <IndustrialSpriteIcon name="industrial-stations" size={18} />
      </div>

      <Link
        to="/industrial/supervisor"
        title="Supervisor"
        style={{
          ...industrialBtnStyle(false),
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          textDecoration: 'none',
          padding: 0,
        }}
      >
        <IndustrialSpriteIcon name="industrial-supervisor" size={16} />
      </Link>

      <Link
        to="/industrial/work-orders"
        title="Work Orders"
        style={{
          ...industrialBtnStyle(false),
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          textDecoration: 'none',
          padding: 0,
        }}
      >
        <IndustrialSpriteIcon name="industrial-stations" size={16} />
      </Link>
    </nav>
  );
}
