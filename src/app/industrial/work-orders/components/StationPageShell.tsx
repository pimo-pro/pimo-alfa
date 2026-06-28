import { Link } from 'react-router-dom';

import StationCanvas from '@/industrial/ui/components/StationCanvas';
import StationPanel from '@/industrial/ui/components/StationPanel';
import StationSidebar from '@/industrial/ui/components/StationSidebar';
import { IndustrialThreeColumnLayout } from '@/industrial/ui/layouts/IndustrialThreeColumnLayout';
import type { IndustrialStation } from '@/industrial/work-orders/types';
import { STATION_LABELS } from '@/industrial/work-orders/types';

import { useStationPage } from '../hooks/useStationPage';
import StationHistorySidebar from './StationHistorySidebar';

interface StationPageShellProps {
  station: IndustrialStation;
}

export default function StationPageShell({ station }: StationPageShellProps) {
  const page = useStationPage(station);

  if (page.loading && page.tasks.length === 0) {
    return (
      <IndustrialThreeColumnLayout
        title={page.title}
        description={page.description}
        sidebarOpen={false}
        leftLeft={<div />}
        left={<div style={{ color: '#94a3b8', fontSize: 13 }}>A carregar estação…</div>}
        right={<div />}
      />
    );
  }

  return (
    <IndustrialThreeColumnLayout
      title={page.title}
      description={page.description}
      sidebarOpen={page.sidebarOpen}
      leftLeft={
        <StationSidebar
          activeStation={station}
          notificationCount={page.notifications.length}
          onToggleNotifications={() => page.setNotificationsOpen(!page.notificationsOpen)}
          onToggleChat={() => page.setChatOpen(!page.chatOpen)}
          chatOpen={page.chatOpen}
        />
      }
      history={
        <StationHistorySidebar tasks={page.tasks} orders={page.orders} eventLog={page.eventLog} />
      }
      left={
        <StationPanel
          title={page.config.panelTitle}
          description={page.description}
          sections={page.sections}
          codeInput={page.codeInput}
          onCodeInputChange={page.setCodeInput}
          onCodeSubmit={page.handleCodeSubmit}
          selectedTask={page.selectedTask}
          confirmLabel={page.config.confirmLabel}
          busy={page.busy}
          error={page.error}
          onConfirm={() => void page.handleConfirm()}
          onReject={() => void page.handleReject()}
          toolMode={page.toolMode}
          snapEnabled={page.snapEnabled}
          onToolMode={page.setToolMode}
          onToggleSnap={() => page.setSnapEnabled(!page.snapEnabled)}
          onReload={() => void page.reload()}
          onToggleSidebar={() => page.setSidebarOpen(!page.sidebarOpen)}
          sidebarOpen={page.sidebarOpen}
          extra={
            <Link
              to={`/industrial/supervisor?station=${station}`}
              style={{ fontSize: 12, color: '#60a5fa' }}
            >
              Ver no Supervisor
            </Link>
          }
        />
      }
      right={
        <StationCanvas
          pieces={page.canvasPieces}
          selectedPieceId={page.selectedPieceId}
          toolMode={page.toolMode}
          onSelectPiece={(pieceId) => {
            page.setSelectedPieceId(pieceId);
            const task = page.tasks.find(
              (t) =>
                t.pieceId === pieceId &&
                (t.status === 'pending' || t.status === 'in_progress'),
            );
            if (task) page.selectTask(task);
          }}
          onClearSelection={() => {
            page.setSelectedPieceId(null);
            page.selectTask(null);
          }}
          notifications={page.notifications}
          notificationsOpen={page.notificationsOpen}
          onToggleNotifications={() => page.setNotificationsOpen(!page.notificationsOpen)}
          onDismissNotification={(id) =>
            page.setDismissedNotifications((prev) => [...prev, id])
          }
          chatOpen={page.chatOpen}
          onToggleChat={() => page.setChatOpen(!page.chatOpen)}
          conversations={page.conversations}
          activeConversationId={page.activeConversationId}
          onSelectConversation={page.setActiveConversationId}
          onSendChatMessage={page.handleSendChatMessage}
          enableSupervisorChat={page.config.enableSupervisorChat}
          stationLabel={STATION_LABELS[station]}
        />
      }
    />
  );
}
