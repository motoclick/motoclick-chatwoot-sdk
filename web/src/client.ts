import type {
  ReportInput,
  SupportConfig,
  SupportConversation,
  SupportMessage,
  SupportUser,
} from './types';

interface StoredContact {
  sourceId: string;
  pubsubToken: string;
  userId: string;
}

/**
 * Habla con la Client API pública de Chatwoot (/public/api/v1/inboxes/...).
 * No usa ninguna clave secreta: solo el identificador público del inbox.
 */
export class ChatwootClient {
  private base: string;
  private user: SupportUser | null = null;
  private contact: StoredContact | null = null;
  private pending: Promise<StoredContact> | null = null;

  constructor(private cfg: SupportConfig) {
    const url = cfg.chatwootUrl.replace(/\/+$/, '');
    this.base = `${url}/public/api/v1/inboxes/${encodeURIComponent(cfg.inboxId)}`;
  }

  get pubsubToken(): string | null {
    return this.contact?.pubsubToken ?? null;
  }

  get hasContact(): boolean {
    return this.contact !== null || this.readStored() !== null;
  }

  identify(user: SupportUser): void {
    if (this.user?.id !== user.id) {
      this.contact = null;
      this.pending = null;
    }
    this.user = user;
    // Si ya existe el contacto, actualizamos sus datos sin bloquear.
    const stored = this.readStored();
    if (stored) {
      this.contact = stored;
      this.request('PATCH', `/contacts/${stored.sourceId}`, this.contactBody()).catch(() => {});
    }
  }

  reset(): void {
    const key = this.storageKey();
    if (key) safeStorage()?.removeItem(key);
    this.user = null;
    this.contact = null;
    this.pending = null;
  }

  /** Crea (o reutiliza) el contacto de este usuario en Chatwoot. */
  async ensureContact(): Promise<StoredContact> {
    if (this.contact) return this.contact;
    const stored = this.readStored();
    if (stored) return (this.contact = stored);
    if (!this.pending) {
      this.pending = (async () => {
        const res = await this.request<{ source_id: string; pubsub_token: string }>(
          'POST',
          '/contacts',
          this.contactBody(),
        );
        const c: StoredContact = {
          sourceId: res.source_id,
          pubsubToken: res.pubsub_token,
          userId: this.userId(),
        };
        const key = this.storageKey();
        if (key) safeStorage()?.setItem(key, JSON.stringify(c));
        this.contact = c;
        return c;
      })().finally(() => {
        this.pending = null;
      });
    }
    return this.pending;
  }

  /** Crea una conversación nueva con el reporte. Devuelve el id de la conversación. */
  async report(input: ReportInput, globalContext: Record<string, unknown>): Promise<number> {
    const message = input.message?.trim();
    if (!message) throw new Error('El mensaje del reporte está vacío');
    const c = await this.ensureContact();

    const attrs: Record<string, unknown> = {
      ...cleanAttrs(globalContext),
      ...cleanAttrs(input.context ?? {}),
    };
    if (input.category) attrs.categoria = input.category;
    if (this.cfg.app) attrs.app = this.cfg.app;
    if (this.cfg.appVersion) attrs.app_version = this.cfg.appVersion;
    attrs.dispositivo = deviceInfo();
    if (typeof location !== 'undefined') attrs.pagina = location.href.slice(0, 250);

    const conv = await this.request<{ id: number }>(
      'POST',
      `/contacts/${c.sourceId}/conversations`,
      { custom_attributes: attrs },
    );

    const header = input.category ? `**${input.category}**\n` : '';
    const contextLine = Object.entries({ ...cleanAttrs(globalContext), ...cleanAttrs(input.context ?? {}) })
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
    const content = `${header}${message}${contextLine ? `\n\n_${contextLine}_` : ''}`;
    await this.sendMessage(conv.id, content, input.files);
    return conv.id;
  }

  async sendMessage(conversationId: number, content: string, files?: File[] | FileList): Promise<SupportMessage> {
    const c = await this.ensureContact();
    const path = `/contacts/${c.sourceId}/conversations/${conversationId}/messages`;
    const list = files ? Array.from(files) : [];
    let raw: RawMessage;
    if (list.length) {
      const form = new FormData();
      form.append('content', content);
      form.append('echo_id', randomId());
      list.forEach((f) => form.append('attachments[]', f, f.name));
      raw = await this.request<RawMessage>('POST', path, form);
    } else {
      raw = await this.request<RawMessage>('POST', path, { content, echo_id: randomId() });
    }
    return mapMessage(raw, conversationId);
  }

  async conversations(): Promise<SupportConversation[]> {
    if (!this.hasContact) return [];
    const c = await this.ensureContact();
    const list = await this.request<RawConversation[]>('GET', `/contacts/${c.sourceId}/conversations`);
    return list
      .map((r) => {
        const msgs = (r.messages ?? []).filter(isVisible).map((m) => mapMessage(m, r.id));
        return {
          id: r.id,
          status: r.status,
          createdAt: toDate(r.created_at ?? r.timestamp ?? msgs[0]?.createdAt),
          lastMessage: msgs[msgs.length - 1],
          attributes: withCategory(r.custom_attributes ?? {}, msgs[0]?.content),
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async messages(conversationId: number): Promise<SupportMessage[]> {
    const c = await this.ensureContact();
    const list = await this.request<RawMessage[]>(
      'GET',
      `/contacts/${c.sourceId}/conversations/${conversationId}/messages`,
    );
    return list.filter(isVisible).map((m) => mapMessage(m, conversationId));
  }

  async markSeen(conversationId: number): Promise<void> {
    const c = await this.ensureContact();
    await this.request('POST', `/contacts/${c.sourceId}/conversations/${conversationId}/update_last_seen`).catch(
      () => {},
    );
  }

  // ---------------------------------------------------------------

  private contactBody() {
    const u = this.user;
    const body: Record<string, unknown> = { identifier: this.userId() };
    if (u?.identifierHash) body.identifier_hash = u.identifierHash;
    if (u?.name) body.name = u.name;
    if (u?.email) body.email = u.email;
    if (u?.phone) body.phone_number = normalizePhone(u.phone);
    const attrs = { ...(u?.attributes ?? {}) } as Record<string, unknown>;
    if (this.cfg.app) attrs.app = this.cfg.app;
    body.custom_attributes = cleanAttrs(attrs);
    return body;
  }

  private userId(): string {
    if (this.user?.id) return String(this.user.id);
    // Usuario sin identificar: id anónimo estable en este navegador.
    const s = safeStorage();
    const k = `mcs:anon:${this.cfg.inboxId}`;
    let id = s?.getItem(k);
    if (!id) {
      id = `anon_${randomId()}`;
      s?.setItem(k, id);
    }
    return id;
  }

  private storageKey(): string | null {
    return `mcs:${this.cfg.inboxId}:${this.userId()}`;
  }

  private readStored(): StoredContact | null {
    const key = this.storageKey();
    const raw = key ? safeStorage()?.getItem(key) : null;
    if (!raw) return null;
    try {
      const c = JSON.parse(raw) as StoredContact;
      return c.sourceId && c.userId === this.userId() ? c : null;
    } catch {
      return null;
    }
  }

  private async request<T = unknown>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
    const init: RequestInit = { method, headers: {} };
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) {
      (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const res = await fetch(this.base + path, init);
    if (res.status === 404 && !retried && path.startsWith('/contacts/') && this.contact) {
      // El contacto guardado ya no existe en Chatwoot: lo recreamos una vez.
      const old = this.contact.sourceId;
      this.reset();
      const c = await this.ensureContact();
      return this.request<T>(method, path.replace(old, c.sourceId), body, true);
    }
    if (!res.ok) {
      let detail = '';
      try {
        detail = await res.text();
      } catch {
        /* nada */
      }
      throw new Error(`Chatwoot ${res.status}: ${detail.slice(0, 200)}`);
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
  }
}

// ---------------------------------------------------------------

export interface RawMessage {
  id: number;
  content: string | null;
  message_type: number | string;
  created_at: number | string;
  conversation_id?: number;
  private?: boolean;
  content_type?: string;
  attachments?: { data_url: string; file_type: string }[];
  sender?: { name?: string; type?: string } | null;
}

interface RawConversation {
  id: number;
  status: string;
  created_at?: number;
  timestamp?: number;
  messages?: RawMessage[];
  custom_attributes?: Record<string, unknown>;
}

export function isVisible(m: RawMessage): boolean {
  const t = normalizeType(m.message_type);
  return !m.private && (t === 0 || t === 1 || t === 3);
}

function normalizeType(t: number | string): number {
  if (typeof t === 'number') return t;
  return { incoming: 0, outgoing: 1, activity: 2, template: 3 }[t] ?? 2;
}

export function mapMessage(m: RawMessage, conversationId: number): SupportMessage {
  return {
    id: m.id,
    conversationId: m.conversation_id ?? conversationId,
    content: m.content ?? '',
    fromUser: normalizeType(m.message_type) === 0,
    createdAt: toDate(m.created_at),
    attachments: (m.attachments ?? []).map((a) => ({ url: a.data_url, type: a.file_type })),
    senderName: m.sender?.name,
  };
}

/** La API pública no siempre devuelve los atributos: la categoría va en negrita al inicio del primer mensaje. */
function withCategory(attrs: Record<string, unknown>, first?: string): Record<string, unknown> {
  if (attrs.categoria || !first) return attrs;
  const m = /^\*\*(.+?)\*\*/.exec(first);
  return m ? { ...attrs, categoria: m[1] } : attrs;
}

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v);
  if (typeof v === 'string') return new Date(v);
  return new Date();
}

function cleanAttrs(o: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === null || v === undefined || v === '') continue;
    out[k] = typeof v === 'number' || typeof v === 'boolean' ? v : String(v);
  }
  return out;
}

function normalizePhone(p: string): string | undefined {
  const digits = p.replace(/[^\d+]/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('+')) return digits;
  // Chatwoot exige formato E.164. 10 dígitos = EE. UU.
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

function deviceInfo(): string {
  if (typeof navigator === 'undefined') return 'desconocido';
  return navigator.userAgent.slice(0, 200);
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}
