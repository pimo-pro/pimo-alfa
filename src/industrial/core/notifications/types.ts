export type NotificationChannel = 'in-app' | 'email' | 'sms';
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error' | 'critical';

export interface IndustrialNotification {
  id: string;
  type: string;
  severity: NotificationSeverity | string;
  title: string;
  message: string;
  user_id: string;
  channel: NotificationChannel | string;
  read_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface IndustrialNotificationInput {
  type: string;
  severity?: NotificationSeverity | string;
  title: string;
  message: string;
  user_id: string;
  channel: NotificationChannel | string;
  metadata?: Record<string, unknown>;
}

export interface IndustrialNotificationFilter {
  user_id?: string;
  channel?: NotificationChannel | string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}
