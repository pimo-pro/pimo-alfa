import type { ReactNode } from 'react';

import {
  IndustrialLayout,
  type IndustrialLayoutTone,
} from '@/industrial/ui/components/IndustrialLayout';

import { industrialPanelStyle, industrialPanelStyleLight } from './industrialStyles';

export interface IndustrialThreeColumnLayoutProps {
  title: string;
  description?: string;
  sidebarOpen?: boolean;
  leftLeft: ReactNode;
  left: ReactNode;
  right: ReactNode;
  history?: ReactNode;
  tone?: IndustrialLayoutTone;
}

export function IndustrialThreeColumnLayout({
  title,
  description,
  sidebarOpen = true,
  leftLeft,
  left,
  right,
  history,
  tone = 'dark',
}: IndustrialThreeColumnLayoutProps) {
  const gridTemplateColumns =
    sidebarOpen && history ? '56px 260px 300px 1fr' : '56px 300px 1fr';
  const panelStyle = tone === 'light' ? industrialPanelStyleLight : industrialPanelStyle;

  return (
    <IndustrialLayout title={title} description={description} tone={tone}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns,
          gap: 16,
          minHeight: 'calc(100vh - 220px)',
        }}
      >
        <div style={{ ...panelStyle, padding: 8, display: 'grid', alignContent: 'start' }}>
          {leftLeft}
        </div>

        {sidebarOpen && history ? <div style={panelStyle}>{history}</div> : null}

        <div style={panelStyle}>{left}</div>

        <div style={{ minHeight: 0 }}>{right}</div>
      </div>
    </IndustrialLayout>
  );
}
