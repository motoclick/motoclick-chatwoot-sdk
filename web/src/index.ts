import { ChatwootClient } from './client';
import { texts } from './i18n';
import { Realtime } from './realtime';
import { SupportUI } from './ui';
import type {
  ReportInput,
  SupportConfig,
  SupportConversation,
  SupportEvent,
  SupportMessage,
  SupportUser,
} from './types';

export type * from './types';

type Listener = (payload: unknown) => void;

let cfg: SupportConfig | null = null;
let client: ChatwootClient | null = null;
let ui: SupportUI | null = null;
let rt: Realtime | null = null;
let context: Record<string, string | number | boolean> = {};
const listeners = new Map<SupportEvent, Set<Listener>>();

function emit(e: SupportEvent, payload?: unknown) {
  listeners.get(e)?.forEach((fn) => {
    try {
      fn(payload);
    } catch (err) {
      console.error('[MotoclickSupport]', err);
    }
  });
}

function need(): ChatwootClient {
  if (!client) throw new Error('MotoclickSupport: llama a init() primero');
  return client;
}

function startRealtime() {
  const token = client?.pubsubToken;
  if (!cfg || !token || rt) return;
  rt = new Realtime(cfg.chatwootUrl, token, (m) => {
    ui?.push(m);
    emit('message', m);
    if (!m.fromUser) emit('reply', m);
  });
  rt.start();
}

function stopRealtime() {
  rt?.stop();
  rt = null;
}

export const MotoclickSupport = {
  /** Configura el SDK. Es lo único obligatorio. */
  init(config: SupportConfig): void {
    if (!config?.chatwootUrl || !config?.inboxId) {
      throw new Error('MotoclickSupport.init: faltan chatwootUrl e inboxId');
    }
    this.destroy();
    cfg = { showButton: true, position: 'right', color: '#ff6a13', locale: 'es', ...config };
    client = new ChatwootClient(cfg);
    if (typeof document === 'undefined') return; // SSR: sin interfaz
    const t = texts[cfg.locale ?? 'es'] ?? texts.es;
    const mount = () => {
      if (!cfg || !client) return;
      ui = new SupportUI(
        t,
        cfg.categories?.length ? cfg.categories : t.categories,
        {
          color: cfg.color!,
          position: cfg.position!,
          showButton: cfg.showButton!,
          brandName: cfg.brandName ?? 'Motoclick',
          loadFont: cfg.loadFont ?? true,
        },
        {
          report: (input) => this.report(input),
          conversations: () => this.conversations(),
          messages: (id) => need().messages(id),
          send: async (id, text, files) => {
            const m = await need().sendMessage(id, text, files);
            startRealtime();
            return m;
          },
          seen: (id) => void need().markSeen(id),
          onOpen: () => emit('open'),
          onClose: () => emit('close'),
        },
      );
      if (client.hasContact) client.ensureContact().then(startRealtime).catch(() => {});
    };
    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount, { once: true });
  },

  /** Dice quién es el usuario (después del login). */
  identify(user: SupportUser): void {
    const c = need();
    stopRealtime();
    c.identify(user);
    if (c.hasContact) c.ensureContact().then(startRealtime).catch(() => {});
  },

  /** Datos que se adjuntan a todos los reportes (ej. orden activa). Pasa null para borrar una clave. */
  setContext(data: Record<string, string | number | boolean | null>): void {
    for (const [k, v] of Object.entries(data)) {
      if (v === null) delete context[k];
      else context[k] = v;
    }
  },

  /** Envía un reporte sin abrir la interfaz. Devuelve el id de la conversación en Chatwoot. */
  async report(input: ReportInput): Promise<number> {
    try {
      const id = await need().report(input, context);
      startRealtime();
      emit('reported', { conversationId: id });
      return id;
    } catch (err) {
      emit('error', err);
      throw err;
    }
  },

  conversations(): Promise<SupportConversation[]> {
    return need().conversations();
  },

  /** Abre el panel. view: 'new' (por defecto) o 'list'. */
  open(view: 'new' | 'list' = 'new'): void {
    ui?.open({ name: view });
  },

  close(): void {
    ui?.close();
  },

  showButton(): void {
    ui?.setButtonVisible(true);
  },

  hideButton(): void {
    ui?.setButtonVisible(false);
  },

  on(event: SupportEvent, fn: (payload: any) => void): () => void {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(fn);
    return () => listeners.get(event)?.delete(fn);
  },

  /** Llamar al cerrar sesión: olvida al usuario en este dispositivo. */
  reset(): void {
    stopRealtime();
    client?.reset();
    context = {};
  },

  /** Quita el botón y desconecta todo. */
  destroy(): void {
    stopRealtime();
    ui?.destroy();
    ui = null;
    client = null;
    cfg = null;
  },
};

export type { SupportMessage };
export default MotoclickSupport;

// Uso con <script>: lee data-chatwoot-url y data-inbox-id del propio tag.
if (typeof document !== 'undefined') {
  const tag = document.currentScript as HTMLScriptElement | null;
  const d = tag?.dataset;
  if (d?.chatwootUrl && d?.inboxId) {
    MotoclickSupport.init({
      chatwootUrl: d.chatwootUrl,
      inboxId: d.inboxId,
      app: d.app,
      appVersion: d.appVersion,
      locale: (d.locale as 'es' | 'en') || undefined,
      color: d.color,
      position: (d.position as 'right' | 'left') || undefined,
    });
  }
}
