import type { ReportInput, SupportConfig, SupportConversation, SupportMessage, SupportUser } from './types';
interface StoredContact {
    sourceId: string;
    pubsubToken: string;
    userId: string;
}
/**
 * Habla con la Client API pública de Chatwoot (/public/api/v1/inboxes/...).
 * No usa ninguna clave secreta: solo el identificador público del inbox.
 */
export declare class ChatwootClient {
    private cfg;
    private base;
    private user;
    private contact;
    private pending;
    constructor(cfg: SupportConfig);
    get pubsubToken(): string | null;
    get hasContact(): boolean;
    identify(user: SupportUser): void;
    reset(): void;
    /** Crea (o reutiliza) el contacto de este usuario en Chatwoot. */
    ensureContact(): Promise<StoredContact>;
    /** Crea una conversación nueva con el reporte. Devuelve el id de la conversación. */
    report(input: ReportInput, globalContext: Record<string, unknown>): Promise<number>;
    sendMessage(conversationId: number, content: string, files?: File[] | FileList): Promise<SupportMessage>;
    conversations(): Promise<SupportConversation[]>;
    messages(conversationId: number): Promise<SupportMessage[]>;
    markSeen(conversationId: number): Promise<void>;
    private contactBody;
    private userId;
    private storageKey;
    private readStored;
    private request;
}
export interface RawMessage {
    id: number;
    content: string | null;
    message_type: number | string;
    created_at: number | string;
    conversation_id?: number;
    private?: boolean;
    content_type?: string;
    attachments?: {
        data_url: string;
        file_type: string;
    }[];
    sender?: {
        name?: string;
        type?: string;
    } | null;
}
export declare function isVisible(m: RawMessage): boolean;
export declare function mapMessage(m: RawMessage, conversationId: number): SupportMessage;
export {};
