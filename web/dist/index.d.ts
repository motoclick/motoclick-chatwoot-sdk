import type { ReportInput, SupportConfig, SupportConversation, SupportEvent, SupportMessage, SupportUser } from './types';
export type * from './types';
export declare const MotoclickSupport: {
    /** Configura el SDK. Es lo único obligatorio. */
    init(config: SupportConfig): void;
    /** Dice quién es el usuario (después del login). */
    identify(user: SupportUser): void;
    /** Datos que se adjuntan a todos los reportes (ej. orden activa). Pasa null para borrar una clave. */
    setContext(data: Record<string, string | number | boolean | null>): void;
    /** Envía un reporte sin abrir la interfaz. Devuelve el id de la conversación en Chatwoot. */
    report(input: ReportInput): Promise<number>;
    conversations(): Promise<SupportConversation[]>;
    /** Abre el panel. view: 'new' (por defecto) o 'list'. */
    open(view?: "new" | "list"): void;
    close(): void;
    showButton(): void;
    hideButton(): void;
    on(event: SupportEvent, fn: (payload: any) => void): () => void;
    /** Llamar al cerrar sesión: olvida al usuario en este dispositivo. */
    reset(): void;
    /** Quita el botón y desconecta todo. */
    destroy(): void;
};
export type { SupportMessage };
export default MotoclickSupport;
