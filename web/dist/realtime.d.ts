import type { SupportMessage } from './types';
/**
 * Conexión en tiempo real con Chatwoot (ActionCable en /cable).
 * Avisa cuando un agente responde en cualquier conversación del contacto.
 */
export declare class Realtime {
    private chatwootUrl;
    private pubsubToken;
    private onMessage;
    private ws;
    private retry;
    private timer;
    private stopped;
    constructor(chatwootUrl: string, pubsubToken: string, onMessage: (m: SupportMessage) => void);
    start(): void;
    stop(): void;
    private connect;
}
