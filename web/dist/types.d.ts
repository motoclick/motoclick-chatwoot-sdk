export interface SupportConfig {
    /** URL de Chatwoot, ej. https://chatwoot.motoclickapp.com */
    chatwootUrl: string;
    /** Identificador público del inbox API de Chatwoot (Configuración → Inboxes → API) */
    inboxId: string;
    /** Nombre de la app que reporta, ej. "panel-comercios" o "driver" */
    app?: string;
    /** Versión de la app, se adjunta a cada reporte */
    appVersion?: string;
    /** Idioma de los textos del botón y formulario */
    locale?: 'es' | 'en';
    /** Mostrar el botón flotante al iniciar (true por defecto) */
    showButton?: boolean;
    /** Lado de la pantalla del botón */
    position?: 'right' | 'left';
    /** Color principal (hex) */
    color?: string;
    /** Tipos de problema que se ofrecen en el formulario */
    categories?: string[];
    /** Marca que se muestra en el encabezado ("Motoclick" por defecto). Pasa '' para ocultarla */
    brandName?: string;
    /** Cargar la fuente Plus Jakarta Sans desde Google Fonts (true por defecto) */
    loadFont?: boolean;
}
export interface SupportUser {
    /** Id estable del usuario en tu sistema, ej. "driver_76871" */
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    /** Datos extra del contacto (zona, ciudad, plan...) */
    attributes?: Record<string, string | number | boolean>;
    /** Solo si activas la verificación de identidad (HMAC) en el inbox */
    identifierHash?: string;
}
export interface ReportInput {
    category?: string;
    message: string;
    files?: File[] | FileList;
    /** Datos de esta pantalla (orden, pedido...). Se suman al contexto global */
    context?: Record<string, string | number | boolean>;
}
export interface Attachment {
    url: string;
    type: string;
}
export interface SupportMessage {
    id: number;
    conversationId: number;
    content: string;
    /** true = lo escribió el usuario; false = respuesta del agente */
    fromUser: boolean;
    createdAt: Date;
    attachments: Attachment[];
    senderName?: string;
}
export interface SupportConversation {
    id: number;
    status: string;
    createdAt: Date;
    lastMessage?: SupportMessage;
    attributes: Record<string, unknown>;
}
export type SupportEvent = 'reply' | 'message' | 'error' | 'open' | 'close' | 'reported';
