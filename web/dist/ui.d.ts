import type { Texts } from './i18n';
import type { ReportInput, SupportConversation, SupportMessage } from './types';
export interface UIHandlers {
    report(input: ReportInput): Promise<number>;
    conversations(): Promise<SupportConversation[]>;
    messages(id: number): Promise<SupportMessage[]>;
    send(id: number, text: string, files?: File[]): Promise<SupportMessage>;
    seen(id: number): void;
    onOpen(): void;
    onClose(): void;
}
export interface UIOptions {
    color: string;
    position: 'right' | 'left';
    showButton: boolean;
    brandName: string;
    loadFont: boolean;
}
type View = {
    name: 'new';
} | {
    name: 'list';
} | {
    name: 'chat';
    id: number;
};
/** Botón flotante + panel, aislado con Shadow DOM para no chocar con los estilos de la página. */
export declare class SupportUI {
    private t;
    private categories;
    private opts;
    private h;
    private host;
    private root;
    private panel;
    private body;
    private fab;
    private badge;
    private view;
    private isOpen;
    private unread;
    private chatMessages;
    private pending;
    constructor(t: Texts, categories: string[], opts: UIOptions, h: UIHandlers);
    destroy(): void;
    setButtonVisible(v: boolean): void;
    open(view?: View): void;
    close(): void;
    /** Mensaje nuevo en tiempo real. */
    push(m: SupportMessage): void;
    private go;
    private renderNew;
    private renderList;
    private renderChat;
    private renderMessages;
    private shell;
    private $;
}
export {};
