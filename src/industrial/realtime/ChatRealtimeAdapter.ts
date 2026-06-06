import { industrialRealtimeGateway } from './IndustrialRealtimeGateway';
import type { RtoChatPayload } from './types';

export type ChatScope = RtoChatPayload['scope'];

export interface SendChatOptions {
  conversationId: string;
  author: string;
  body: string;
  scope: ChatScope;
  scopeId: string;
  eventAttachment?: string;
}

/**
 * Adaptador de chat industrial em tempo real via broadcast WebSocket.
 * Sem persistência na BD — mensagens instantâneas entre estações e supervisor.
 */
class ChatRealtimeAdapter {
  private typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  sendMessage(options: SendChatOptions): RtoChatPayload {
    industrialRealtimeGateway.connect();
    const message: RtoChatPayload = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      conversationId: options.conversationId,
      author: options.author,
      body: options.body,
      createdAt: new Date().toISOString(),
      scope: options.scope,
      scopeId: options.scopeId,
      eventAttachment: options.eventAttachment,
    };
    industrialRealtimeGateway.sendBroadcast('chat.message', message as unknown as Record<string, unknown>);
    industrialRealtimeGateway.dispatch('chat.message', message);
    return message;
  }

  sendTyping(conversationId: string, author: string, scope: ChatScope, scopeId: string): void {
    industrialRealtimeGateway.connect();
    const payload: RtoChatPayload = {
      id: `typing-${conversationId}`,
      conversationId,
      author,
      body: '',
      createdAt: new Date().toISOString(),
      scope,
      scopeId,
      typing: true,
    };
    industrialRealtimeGateway.sendBroadcast('chat.typing', payload as unknown as Record<string, unknown>);

    const key = `${conversationId}:${author}`;
    const existing = this.typingTimers.get(key);
    if (existing) clearTimeout(existing);
    this.typingTimers.set(
      key,
      setTimeout(() => this.typingTimers.delete(key), 3_000),
    );
  }

  markRead(conversationId: string, readerId: string, messageIds: string[]): void {
    industrialRealtimeGateway.connect();
    industrialRealtimeGateway.sendBroadcast('chat.read', {
      conversationId,
      readerId,
      messageIds,
      readAt: new Date().toISOString(),
    });
  }

  onMessage(handler: (message: RtoChatPayload) => void): () => void {
    return industrialRealtimeGateway.on<RtoChatPayload>('chat.message', handler);
  }

  onTyping(handler: (message: RtoChatPayload) => void): () => void {
    return industrialRealtimeGateway.on<RtoChatPayload>('chat.message', (payload) => {
      if (payload.typing) handler(payload);
    });
  }

  conversationIdForStation(station: string): string {
    return `station:${station}`;
  }

  conversationIdForPiece(pieceId: string): string {
    return `piece:${pieceId}`;
  }

  conversationIdForProject(projectId: string): string {
    return `project:${projectId}`;
  }
}

export const chatRealtimeAdapter = new ChatRealtimeAdapter();
