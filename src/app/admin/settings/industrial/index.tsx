import { Link } from 'react-router-dom';

import { IndustrialLayout, IndustrialPlaceholderPanel, useIndustrialPageState } from '@/industrial/ui/components';
import { industrialAdminConfig } from './config';

export default function IndustrialAdminSettingsRoute() {
  useIndustrialPageState();

  return (
    <IndustrialLayout title={industrialAdminConfig.title} description={industrialAdminConfig.description}>
      <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <Link
          to="/admin/system-settings/industrial/realtime-alerts"
          style={{ fontSize: 13, color: '#60a5fa', textDecoration: 'none' }}
        >
          System Settings → Industrial → Realtime Alerts
        </Link>
      </div>
      <IndustrialPlaceholderPanel
        module="Admin Settings Industrial"
        nextStep="Ligar formulários dinâmicos, permissões e feature flags na Fase 3C.2."
      />
    </IndustrialLayout>
  );
}
