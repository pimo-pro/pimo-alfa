import type { ReactNode } from 'react';

import { IndustrialLayout } from '@/industrial/ui/components/IndustrialLayout';

import { industrialPanelStyle } from './industrialStyles';

export interface IndustrialThreeColumnLayoutProps {
  title: string;
  description?: string;
  sidebarOpen?: boolean;
  leftLeft: ReactNode;
  left: ReactNode;
  right: ReactNode;
  history?: ReactNode;
}

export function IndustrialThreeColumnLayout({
  title,
  description,
  sidebarOpen = true,
  leftLeft,
  left,
  right,
  history,
}: IndustrialThreeColumnLayoutProps) {
  const gridTemplateColumns = sidebarOpen && history
    ? '56px 260px 300px 1fr'
    : '56px 300px 1fr';

  return (
    <IndustrialLayout title={title} description={description}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns,
          gap: 16,
          minHeight: 'calc(100vh - 220px)',
        }}
      >
        <div style={{ ...industrialPanelStyle, padding: 8, display: 'grid', alignContent: 'start' }}>
          {leftLeft}
        </div>

        {sidebarOpen && history ? (
          <div style={industrialPanelStyle}>{history}</div>
        ) : null}

        <div style={industrialPanelStyle}>{left}</div>

        <div style={{ minHeight: 0 }}>{right}</div>
      </div>
    </IndustrialLayout>
  );
}
