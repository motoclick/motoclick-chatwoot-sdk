import { isVisible, mapMessage, type RawMessage } from './client';
import type { SupportMessage } from './types';

/**
 * Conexión en tiempo real con Chatwoot (ActionCable en /cable).
 * Avisa cuando un agente responde en cualquier conversación del contacto.
 */
export class Realtime {
  private ws: WebSocket | null = null;
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    private chatwootUrl: string,
    private pubsubToken: string,
    private onMessage: (m: SupportMessage) => void,
  ) {}

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
  }

  private connect(): void {
    if (typeof WebSocket === 'undefined') return;
    const url = this.chatwootUrl.replace(/\/+$/, '').replace(/^http/, 'ws') + '/cable';
    const identifier = JSON.stringify({ channel: 'RoomChannel', pubsub_token: this.pubsubToken });
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      ws.send(JSON.stringify({ command: 'subscribe', identifier }));
    };
    ws.onmessage = (ev) => {
      let data: { type?: string; message?: { event?: string; data?: RawMessage } };
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (data.type) return; // ping, welcome, confirm_subscription
      const evt = data.message?.event;
      const raw = data.message?.data;
      if (!raw || evt !== 'message.created') return;
      if (!isVisible(raw) || raw.conversation_id === undefined) return;
      this.onMessage(mapMessage(raw, raw.conversation_id));
    };
    ws.onclose = () => {
      if (this.stopped) return;
      const wait = Math.min(30000, 1000 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.connect(), wait);
    };
    ws.onerror = () => ws.close();
  }
}
