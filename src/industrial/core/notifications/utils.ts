import type { IndustrialNotification, NotificationSeverity } from './types';

export function getNotificationSeverityColor(severity: NotificationSeverity | string): string {
  switch (severity) {
    case 'success':
      return '#10b981';
    case 'warning':
      return '#f59e0b';
    case 'error':
    case 'critical':
      return '#ef4444';
    case 'info':
    default:
      return '#3b82f6';
  }
}

export function isUnreadNotification(notification: IndustrialNotification): boolean {
  return !notification.read_at;
}
