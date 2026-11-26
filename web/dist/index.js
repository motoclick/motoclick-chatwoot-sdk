// src/client.ts
var ChatwootClient = class {
  constructor(cfg2) {
    this.cfg = cfg2;
    this.user = null;
    this.contact = null;
    this.pending = null;
    const url = cfg2.chatwootUrl.replace(/\/+$/, "");
    this.base = `${url}/public/api/v1/inboxes/${encodeURIComponent(cfg2.inboxId)}`;
  }
  get pubsubToken() {
    var _a, _b;
    return (_b = (_a = this.contact) == null ? void 0 : _a.pubsubToken) != null ? _b : null;
  }
  get hasContact() {
    return this.contact !== null || this.readStored() !== null;
  }
  identify(user) {
    var _a;
    if (((_a = this.user) == null ? void 0 : _a.id) !== user.id) {
      this.contact = null;
      this.pending = null;
    }
    this.user = user;
    const stored = this.readStored();
    if (stored) {
      this.contact = stored;
      this.request("PATCH", `/contacts/${stored.sourceId}`, this.contactBody()).catch(() => {
      });
    }
  }
  reset() {
    var _a;
    const key = this.storageKey();
    if (key) (_a = safeStorage()) == null ? void 0 : _a.removeItem(key);
    this.user = null;
    this.contact = null;
    this.pending = null;
  }
  /** Crea (o reutiliza) el contacto de este usuario en Chatwoot. */
  async ensureContact() {
    if (this.contact) return this.contact;
    const stored = this.readStored();
    if (stored) return this.contact = stored;
    if (!this.pending) {
      this.pending = (async () => {
        var _a;
        const res = await this.request(
          "POST",
          "/contacts",
          this.contactBody()
        );
        const c = {
          sourceId: res.source_id,
          pubsubToken: res.pubsub_token,
          userId: this.userId()
        };
        const key = this.storageKey();
        if (key) (_a = safeStorage()) == null ? void 0 : _a.setItem(key, JSON.stringify(c));
        this.contact = c;
        return c;
      })().finally(() => {
        this.pending = null;
      });
    }
    return this.pending;
  }
  /** Crea una conversación nueva con el reporte. Devuelve el id de la conversación. */
  async report(input, globalContext) {
    var _a, _b, _c;
    const message = (_a = input.message) == null ? void 0 : _a.trim();
    if (!message) throw new Error("El mensaje del reporte est\xE1 vac\xEDo");
    const c = await this.ensureContact();
    const attrs = {
      ...cleanAttrs(globalContext),
      ...cleanAttrs((_b = input.context) != null ? _b : {})
    };
    if (input.category) attrs.categoria = input.category;
    if (this.cfg.app) attrs.app = this.cfg.app;
    if (this.cfg.appVersion) attrs.app_version = this.cfg.appVersion;
    attrs.dispositivo = deviceInfo();
    if (typeof location !== "undefined") attrs.pagina = location.href.slice(0, 250);
    const conv = await this.request(
      "POST",
      `/contacts/${c.sourceId}/conversations`,
      { custom_attributes: attrs }
    );
    const header = input.category ? `**${input.category}**
` : "";
    const contextLine = Object.entries({ ...cleanAttrs(globalContext), ...cleanAttrs((_c = input.context) != null ? _c : {}) }).map(([k, v]) => `${k}: ${v}`).join(" \xB7 ");
    const content = `${header}${message}${contextLine ? `

_${contextLine}_` : ""}`;
    await this.sendMessage(conv.id, content, input.files);
    return conv.id;
  }
  async sendMessage(conversationId, content, files) {
    const c = await this.ensureContact();
    const path = `/contacts/${c.sourceId}/conversations/${conversationId}/messages`;
    const list = files ? Array.from(files) : [];
    let raw;
    if (list.length) {
      const form = new FormData();
      form.append("content", content);
      form.append("echo_id", randomId());
      list.forEach((f) => form.append("attachments[]", f, f.name));
      raw = await this.request("POST", path, form);
    } else {
      raw = await this.request("POST", path, { content, echo_id: randomId() });
    }
    return mapMessage(raw, conversationId);
  }
  async conversations() {
    if (!this.hasContact) return [];
    const c = await this.ensureContact();
    const list = await this.request("GET", `/contacts/${c.sourceId}/conversations`);
    return list.map((r) => {
      var _a, _b, _c, _d, _e, _f;
      const msgs = ((_a = r.messages) != null ? _a : []).filter(isVisible).map((m) => mapMessage(m, r.id));
      return {
        id: r.id,
        status: r.status,
        createdAt: toDate((_d = (_b = r.created_at) != null ? _b : r.timestamp) != null ? _d : (_c = msgs[0]) == null ? void 0 : _c.createdAt),
        lastMessage: msgs[msgs.length - 1],
        attributes: withCategory((_e = r.custom_attributes) != null ? _e : {}, (_f = msgs[0]) == null ? void 0 : _f.content)
      };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async messages(conversationId) {
    const c = await this.ensureContact();
    const list = await this.request(
      "GET",
      `/contacts/${c.sourceId}/conversations/${conversationId}/messages`
    );
    return list.filter(isVisible).map((m) => mapMessage(m, conversationId));
  }
  async markSeen(conversationId) {
    const c = await this.ensureContact();
    await this.request("POST", `/contacts/${c.sourceId}/conversations/${conversationId}/update_last_seen`).catch(
      () => {
      }
    );
  }
  // ---------------------------------------------------------------
  contactBody() {
    var _a;
    const u = this.user;
    const body = { identifier: this.userId() };
    if (u == null ? void 0 : u.identifierHash) body.identifier_hash = u.identifierHash;
    if (u == null ? void 0 : u.name) body.name = u.name;
    if (u == null ? void 0 : u.email) body.email = u.email;
    if (u == null ? void 0 : u.phone) body.phone_number = normalizePhone(u.phone);
    const attrs = { ...(_a = u == null ? void 0 : u.attributes) != null ? _a : {} };
    if (this.cfg.app) attrs.app = this.cfg.app;
    body.custom_attributes = cleanAttrs(attrs);
    return body;
  }
  userId() {
    var _a;
    if ((_a = this.user) == null ? void 0 : _a.id) return String(this.user.id);
    const s = safeStorage();
    const k = `mcs:anon:${this.cfg.inboxId}`;
    let id = s == null ? void 0 : s.getItem(k);
    if (!id) {
      id = `anon_${randomId()}`;
      s == null ? void 0 : s.setItem(k, id);
    }
    return id;
  }
  storageKey() {
    return `mcs:${this.cfg.inboxId}:${this.userId()}`;
  }
  readStored() {
    var _a;
    const key = this.storageKey();
    const raw = key ? (_a = safeStorage()) == null ? void 0 : _a.getItem(key) : null;
    if (!raw) return null;
    try {
      const c = JSON.parse(raw);
      return c.sourceId && c.userId === this.userId() ? c : null;
    } catch {
      return null;
    }
  }
  async request(method, path, body, retried = false) {
    const init = { method, headers: {} };
    if (body instanceof FormData) init.body = body;
    else if (body !== void 0) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const res = await fetch(this.base + path, init);
    if (res.status === 404 && !retried && path.startsWith("/contacts/") && this.contact) {
      const old = this.contact.sourceId;
      this.reset();
      const c = await this.ensureContact();
      return this.request(method, path.replace(old, c.sourceId), body, true);
    }
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch {
      }
      throw new Error(`Chatwoot ${res.status}: ${detail.slice(0, 200)}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }
};
function isVisible(m) {
  const t = normalizeType(m.message_type);
  return !m.private && (t === 0 || t === 1 || t === 3);
}
function normalizeType(t) {
  var _a;
  if (typeof t === "number") return t;
  return (_a = { incoming: 0, outgoing: 1, activity: 2, template: 3 }[t]) != null ? _a : 2;
}
function mapMessage(m, conversationId) {
  var _a, _b, _c, _d;
  return {
    id: m.id,
    conversationId: (_a = m.conversation_id) != null ? _a : conversationId,
    content: (_b = m.content) != null ? _b : "",
    fromUser: normalizeType(m.message_type) === 0,
    createdAt: toDate(m.created_at),
    attachments: ((_c = m.attachments) != null ? _c : []).map((a) => ({ url: a.data_url, type: a.file_type })),
    senderName: (_d = m.sender) == null ? void 0 : _d.name
  };
}
function withCategory(attrs, first) {
  if (attrs.categoria || !first) return attrs;
  const m = /^\*\*(.+?)\*\*/.exec(first);
  return m ? { ...attrs, categoria: m[1] } : attrs;
}
function toDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1e3 : v);
  if (typeof v === "string") return new Date(v);
  return /* @__PURE__ */ new Date();
}
function cleanAttrs(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === null || v === void 0 || v === "") continue;
    out[k] = typeof v === "number" || typeof v === "boolean" ? v : String(v);
  }
  return out;
}
function normalizePhone(p) {
  const digits = p.replace(/[^\d+]/g, "");
  if (!digits) return void 0;
  if (digits.startsWith("+")) return digits;
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}
function deviceInfo() {
  if (typeof navigator === "undefined") return "desconocido";
  return navigator.userAgent.slice(0, 200);
}
function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function safeStorage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

// src/i18n.ts
var texts = {
  es: {
    button: "Soporte",
    title: "Soporte",
    subtitle: "Estamos para ayudarte",
    attachHint: "Puedes subir im\xE1genes, documentos o capturas",
    camera: "Tomar foto",
    remove: "Quitar",
    newReport: "Nuevo reporte",
    myReports: "Mis reportes",
    category: "Tipo de problema",
    message: "Cu\xE9ntanos qu\xE9 pas\xF3",
    messagePlaceholder: "Describe el problema con el mayor detalle posible\u2026",
    attach: "Adjuntar foto o archivo",
    send: "Enviar reporte",
    sending: "Enviando\u2026",
    sent: "\xA1Listo! Recibimos tu reporte. Te responderemos aqu\xED.",
    error: "No se pudo enviar. Revisa tu conexi\xF3n e intenta de nuevo.",
    empty: "A\xFAn no tienes reportes. Cuando env\xEDes uno, aqu\xED ver\xE1s la respuesta de soporte.",
    loading: "Cargando\u2026",
    reply: "Escribe una respuesta\u2026",
    back: "Volver",
    agent: "Soporte",
    you: "T\xFA",
    open: "Abierto",
    resolved: "Resuelto",
    pending: "Pendiente",
    close: "Cerrar",
    categories: ["Problema con una orden", "Pagos", "Problema con la app", "Cuenta", "Otro"]
  },
  en: {
    button: "Support",
    title: "Support",
    subtitle: "We are here to help",
    attachHint: "You can upload images, documents or screenshots",
    camera: "Take photo",
    remove: "Remove",
    newReport: "New report",
    myReports: "My reports",
    category: "Issue type",
    message: "Tell us what happened",
    messagePlaceholder: "Describe the problem in as much detail as possible\u2026",
    attach: "Attach photo or file",
    send: "Send report",
    sending: "Sending\u2026",
    sent: "Done! We got your report. We will reply here.",
    error: "Could not send. Check your connection and try again.",
    empty: "No reports yet. Once you send one, the support reply shows up here.",
    loading: "Loading\u2026",
    reply: "Write a reply\u2026",
    back: "Back",
    agent: "Support",
    you: "You",
    open: "Open",
    resolved: "Resolved",
    pending: "Pending",
    close: "Close",
    categories: ["Order issue", "Payments", "App issue", "Account", "Other"]
  }
};

// src/realtime.ts
var Realtime = class {
  constructor(chatwootUrl, pubsubToken, onMessage) {
    this.chatwootUrl = chatwootUrl;
    this.pubsubToken = pubsubToken;
    this.onMessage = onMessage;
    this.ws = null;
    this.retry = 0;
    this.timer = null;
    this.stopped = false;
  }
  start() {
    this.stopped = false;
    this.connect();
  }
  stop() {
    var _a;
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    (_a = this.ws) == null ? void 0 : _a.close();
    this.ws = null;
  }
  connect() {
    if (typeof WebSocket === "undefined") return;
    const url = this.chatwootUrl.replace(/\/+$/, "").replace(/^http/, "ws") + "/cable";
    const identifier = JSON.stringify({ channel: "RoomChannel", pubsub_token: this.pubsubToken });
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      ws.send(JSON.stringify({ command: "subscribe", identifier }));
    };
    ws.onmessage = (ev) => {
      var _a, _b;
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (data.type) return;
      const evt = (_a = data.message) == null ? void 0 : _a.event;
      const raw = (_b = data.message) == null ? void 0 : _b.data;
      if (!raw || evt !== "message.created") return;
      if (!isVisible(raw) || raw.conversation_id === void 0) return;
      this.onMessage(mapMessage(raw, raw.conversation_id));
    };
    ws.onclose = () => {
      if (this.stopped) return;
      const wait = Math.min(3e4, 1e3 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.connect(), wait);
    };
    ws.onerror = () => ws.close();
  }
};

// src/ui.ts
var FONT_URL = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,800&display=swap";
var SupportUI = class {
  constructor(t, categories, opts, h) {
    this.t = t;
    this.categories = categories;
    this.opts = opts;
    this.h = h;
    this.view = { name: "new" };
    this.isOpen = false;
    this.unread = 0;
    this.chatMessages = [];
    this.pending = [];
    if (opts.loadFont) loadFont();
    this.host = document.createElement("motoclick-support");
    this.root = this.host.attachShadow({ mode: "open" });
    this.root.innerHTML = `<style>${css(opts.color, opts.position)}</style>${this.shell()}`;
    document.body.appendChild(this.host);
    this.panel = this.$(".panel");
    this.body = this.$(".body");
    this.fab = this.$(".fab");
    this.badge = this.$(".badge");
    this.setButtonVisible(opts.showButton);
    this.fab.addEventListener("click", () => this.isOpen ? this.close() : this.open());
    this.$(".x").addEventListener("click", () => this.close());
    this.panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
    this.root.querySelectorAll(".tab").forEach(
      (b) => b.addEventListener("click", () => this.go(b.dataset.v === "list" ? { name: "list" } : { name: "new" }))
    );
  }
  destroy() {
    this.host.remove();
  }
  setButtonVisible(v) {
    this.fab.style.display = v ? "" : "none";
  }
  open(view) {
    this.isOpen = true;
    this.panel.classList.add("on");
    this.fab.classList.add("active");
    this.fab.setAttribute("aria-expanded", "true");
    this.go(view != null ? view : this.unread ? { name: "list" } : this.view);
    this.h.onOpen();
  }
  close() {
    this.isOpen = false;
    this.panel.classList.remove("on");
    this.fab.classList.remove("active");
    this.fab.setAttribute("aria-expanded", "false");
    this.h.onClose();
  }
  /** Mensaje nuevo en tiempo real. */
  push(m) {
    if (this.isOpen && this.view.name === "chat" && this.view.id === m.conversationId) {
      if (!this.chatMessages.some((x) => x.id === m.id)) {
        this.chatMessages.push(m);
        this.renderMessages();
        this.h.seen(m.conversationId);
      }
      return;
    }
    if (!m.fromUser) {
      this.unread++;
      this.badge.textContent = String(this.unread);
      this.badge.style.display = "";
      if (this.isOpen && this.view.name === "list") this.go({ name: "list" });
    }
  }
  // ---------------------------------------------------------------
  go(v) {
    this.view = v;
    this.root.querySelectorAll(".tab").forEach((b) => {
      const active = b.dataset.v === "list" === (v.name !== "new");
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
    });
    if (v.name === "new") this.renderNew();
    else if (v.name === "list") this.renderList();
    else this.renderChat(v.id);
  }
  renderNew(msg) {
    const t = this.t;
    this.pending = [];
    this.body.innerHTML = `
      <form class="form" novalidate>
        ${msg ? `<div class="note ${msg.ok ? "ok" : "err"}" role="status">${msg.ok ? icons.check : icons.alert}<span>${esc(msg.text)}</span></div>` : ""}
        <div class="field">
          <label class="lbl" for="mcs-cat"><span class="ibox">${icons.alert}</span>${esc(t.category)}</label>
          <div class="select">
            <select id="mcs-cat" name="category">${this.categories.map((c) => `<option>${esc(c)}</option>`).join("")}</select>
            ${icons.chevron}
          </div>
        </div>
        <div class="field">
          <label class="lbl" for="mcs-msg"><span class="ibox">${icons.bubble}</span>${esc(t.message)}</label>
          <textarea id="mcs-msg" name="message" rows="4" placeholder="${esc(t.messagePlaceholder)}"></textarea>
        </div>
        <div class="drop">
          <label class="drop-main">
            <input type="file" class="pick" multiple accept="image/*,video/*,application/pdf" />
            <span class="clip">${icons.clip}</span>
            <span class="drop-text"><strong>${esc(t.attach)}</strong><small>${esc(t.attachHint)}</small></span>
          </label>
          <label class="cam" title="${esc(t.camera)}" aria-label="${esc(t.camera)}">
            <input type="file" class="snap" accept="image/*" capture="environment" />
            ${icons.camera}
          </label>
        </div>
        <ul class="chips" hidden></ul>
        <button class="send" type="submit">${icons.plane}<span>${esc(t.send)}</span></button>
      </form>`;
    const form = this.body.querySelector("form");
    const chips = form.querySelector(".chips");
    const textarea = form.querySelector("textarea");
    const drop = form.querySelector(".drop");
    const renderChips = () => {
      chips.hidden = !this.pending.length;
      chips.innerHTML = this.pending.map((f, i) => `<li><span>${esc(f.name)}</span><button type="button" data-i="${i}" aria-label="${esc(t.remove)} ${esc(f.name)}">${icons.x}</button></li>`).join("");
      chips.querySelectorAll("button").forEach(
        (b) => b.addEventListener("click", () => {
          this.pending.splice(Number(b.dataset.i), 1);
          renderChips();
        })
      );
    };
    const add = (list) => {
      if (list) this.pending.push(...Array.from(list));
      renderChips();
    };
    form.querySelectorAll("input[type=file]").forEach(
      (inp) => inp.addEventListener("change", () => {
        add(inp.files);
        inp.value = "";
      })
    );
    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("over");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", (e) => {
      var _a, _b;
      e.preventDefault();
      drop.classList.remove("over");
      add((_b = (_a = e.dataTransfer) == null ? void 0 : _a.files) != null ? _b : null);
    });
    textarea.addEventListener("input", () => textarea.classList.remove("invalid"));
    form.addEventListener("submit", async (e) => {
      var _a, _b, _c;
      e.preventDefault();
      const fd = new FormData(form);
      const message = String((_a = fd.get("message")) != null ? _a : "").trim();
      if (!message) {
        textarea.classList.add("invalid");
        textarea.focus();
        return;
      }
      const btn = form.querySelector("button.send");
      btn.disabled = true;
      btn.querySelector("span").textContent = t.sending;
      try {
        await this.h.report({ category: String((_b = fd.get("category")) != null ? _b : ""), message, files: this.pending });
        this.renderNew({ ok: true, text: t.sent });
      } catch {
        btn.disabled = false;
        btn.querySelector("span").textContent = t.send;
        (_c = form.querySelector(".note")) == null ? void 0 : _c.remove();
        form.insertAdjacentHTML("afterbegin", `<div class="note err" role="alert">${icons.alert}<span>${esc(t.error)}</span></div>`);
      }
    });
  }
  async renderList() {
    const t = this.t;
    this.unread = 0;
    this.badge.style.display = "none";
    this.body.innerHTML = `<div class="state"><span class="spin"></span>${esc(t.loading)}</div>`;
    let list;
    try {
      list = await this.h.conversations();
    } catch {
      this.body.innerHTML = `<div class="note err" role="alert">${icons.alert}<span>${esc(t.error)}</span></div>`;
      return;
    }
    if (this.view.name !== "list") return;
    if (!list.length) {
      this.body.innerHTML = `<div class="empty"><span class="ibox big">${icons.history}</span><p>${esc(t.empty)}</p>
        <button class="ghost" type="button">${icons.bubble}<span>${esc(t.newReport)}</span></button></div>`;
      this.body.querySelector(".ghost").addEventListener("click", () => this.go({ name: "new" }));
      return;
    }
    this.body.innerHTML = `<ul class="list">${list.map((c) => {
      var _a, _b;
      const title = String((_a = c.attributes.categoria) != null ? _a : `#${c.id}`);
      const last = c.lastMessage;
      const preview = last ? `${last.fromUser ? t.you : t.agent}: ${plain(last.content)}` : "";
      const status = (_b = t[c.status]) != null ? _b : c.status;
      return `<li><button type="button" class="item" data-id="${c.id}">
          <span class="ibox">${icons.bubble}</span>
          <span class="item-main">
            <span class="row"><strong>${esc(title)}</strong><span class="st ${esc(c.status)}">${esc(String(status))}</span></span>
            <span class="pre">${esc(preview)}</span>
            <span class="date">${fmtDate(c.createdAt)}</span>
          </span>
        </button></li>`;
    }).join("")}</ul>`;
    this.body.querySelectorAll(".item").forEach(
      (b) => b.addEventListener("click", () => this.go({ name: "chat", id: Number(b.dataset.id) }))
    );
  }
  async renderChat(id) {
    const t = this.t;
    this.body.innerHTML = `
      <div class="chat">
        <button class="back" type="button">${icons.back}<span>${esc(t.myReports)}</span></button>
        <div class="msgs" aria-live="polite"><div class="state"><span class="spin"></span>${esc(t.loading)}</div></div>
        <form class="composer">
          <label class="attach" title="${esc(t.attach)}" aria-label="${esc(t.attach)}">
            <input type="file" multiple accept="image/*,video/*,application/pdf" />${icons.clip}
          </label>
          <input name="text" placeholder="${esc(t.reply)}" autocomplete="off" aria-label="${esc(t.reply)}" />
          <button class="go" type="submit" aria-label="${esc(t.send)}">${icons.plane}</button>
        </form>
      </div>`;
    this.body.querySelector(".back").addEventListener("click", () => this.go({ name: "list" }));
    const form = this.body.querySelector(".composer");
    const input = form.querySelector("input[name=text]");
    const file = form.querySelector("input[type=file]");
    const submit = async (files = []) => {
      const text = input.value.trim();
      if (!text && !files.length) return;
      input.value = "";
      try {
        const m = await this.h.send(id, text, files);
        if (!this.chatMessages.some((x) => x.id === m.id)) this.chatMessages.push(m);
        this.renderMessages();
      } catch {
        input.value = text;
      }
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submit();
    });
    file.addEventListener("change", () => {
      var _a;
      const files = Array.from((_a = file.files) != null ? _a : []);
      file.value = "";
      submit(files);
    });
    try {
      this.chatMessages = await this.h.messages(id);
    } catch {
      this.chatMessages = [];
    }
    if (this.view.name !== "chat" || this.view.id !== id) return;
    this.renderMessages();
    this.h.seen(id);
  }
  renderMessages() {
    const box = this.body.querySelector(".msgs");
    if (!box) return;
    const t = this.t;
    box.innerHTML = this.chatMessages.map(
      (m) => `<div class="msg ${m.fromUser ? "me" : "them"}">
          ${m.fromUser ? "" : `<div class="who">${icons.headset}${esc(m.senderName || t.agent)}</div>`}
          ${m.content ? `<div class="txt">${md(m.content)}</div>` : ""}
          ${m.attachments.map(
        (a) => a.type === "image" ? `<a href="${esc(a.url)}" target="_blank" rel="noopener"><img src="${esc(a.url)}" alt="" /></a>` : `<a class="att" href="${esc(a.url)}" target="_blank" rel="noopener">${icons.clip}${esc(a.type)}</a>`
      ).join("")}
          <div class="time">${fmtDate(m.createdAt)}</div>
        </div>`
    ).join("");
    box.scrollTop = box.scrollHeight;
  }
  shell() {
    const t = this.t;
    const brand = this.opts.brandName;
    return `
      <button class="fab" type="button" aria-label="${esc(t.button)}" aria-expanded="false">
        <span class="fab-icon open">${icons.bubbleSolid}</span>
        <span class="fab-icon shut">${icons.x}</span>
        <span class="badge" style="display:none"></span>
      </button>
      <section class="panel" role="dialog" aria-label="${esc(t.title)}">
        <header>
          ${brand ? `<span class="brand">${esc(brand)}</span><span class="sep" aria-hidden="true"></span>` : ""}
          <span class="head-icon">${icons.headset}</span>
          <span class="head-text"><strong>${esc(t.title)}</strong><small>${esc(t.subtitle)}</small></span>
          <button class="x" type="button" aria-label="${esc(t.close)}">${icons.x}</button>
        </header>
        <div class="sheet">
          <nav role="tablist">
            <button class="tab active" type="button" role="tab" data-v="new">${icons.bubbleSolid}<span>${esc(t.newReport)}</span></button>
            <button class="tab" type="button" role="tab" data-v="list">${icons.history}<span>${esc(t.myReports)}</span></button>
          </nav>
          <div class="body"></div>
        </div>
      </section>`;
  }
  $(sel) {
    return this.root.querySelector(sel);
  }
};
function loadFont() {
  if (document.querySelector("link[data-mcs-font]")) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = FONT_URL;
  l.dataset.mcsFont = "";
  document.head.appendChild(l);
}
var svg = (body, fill = false) => `<svg viewBox="0 0 24 24" aria-hidden="true" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${body}</svg>`;
var icons = {
  headset: svg('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.6"/><rect x="17" y="13" width="4" height="6" rx="1.6"/><path d="M19 19a4 4 0 0 1-4 3h-2"/>'),
  bubbleSolid: svg('<path d="M5 3.5h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-8.2L6 21.2V17.5H5a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Z"/><circle cx="8" cy="10.5" r="1.3" fill="#fff"/><circle cx="12" cy="10.5" r="1.3" fill="#fff"/><circle cx="16" cy="10.5" r="1.3" fill="#fff"/>', true),
  bubble: svg('<path d="M5 3.5h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-8.2L6 21.2V17.5H5a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Z"/><circle cx="8" cy="10.5" r="1.3" fill="#fff"/><circle cx="12" cy="10.5" r="1.3" fill="#fff"/><circle cx="16" cy="10.5" r="1.3" fill="#fff"/>', true),
  history: svg('<path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v4h4"/><path d="M12 7.5V12l3 2"/>'),
  alert: svg('<path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4.5"/><path d="M12 17h.01"/>'),
  clip: svg('<path d="m21 11.5-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9"/>'),
  camera: svg('<path d="M4 8h3l1.8-2.5h6.4L17 8h3a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9.5A1.5 1.5 0 0 1 4 8Z"/><circle cx="12" cy="13.5" r="3.5"/>'),
  plane: svg('<path d="M21.5 2.5 2.8 10.3a.6.6 0 0 0 0 1.1l7 2.8 2.8 7a.6.6 0 0 0 1.1 0Z" fill="currentColor" stroke="none"/><path d="m21.5 2.5-11.7 11.7" stroke="rgba(0,0,0,.18)"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  chevron: svg('<path d="m6 9 6 6 6-6"/>'),
  back: svg('<path d="M15 18 9 12l6-6"/>'),
  check: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>')
};
function esc(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function md(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|\s)_(.+?)_(?=\s|$)/g, "$1<i>$2</i>").replace(/\n/g, "<br>");
}
function plain(s) {
  return s.replace(/\*\*|_/g, "").replace(/\s+/g, " ").slice(0, 90);
}
function fmtDate(d) {
  return d.toLocaleString(void 0, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function css(color, pos) {
  return `
  :host {
    all: initial;
    --o: ${color};
    --o2: color-mix(in srgb, ${color} 62%, #ffb067);
    --o-deep: color-mix(in srgb, ${color} 85%, #b33a00);
    --tint: color-mix(in srgb, ${color} 10%, #fff);
    --ink: #1e1b3a;
    --muted: #6e6a85;
    --line: #e4e2ec;
    --field: #fbfafd;
    --chip: #f3f2f7;
    font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
  }
  * { box-sizing: border-box; font-family: inherit; margin: 0; }
  button { cursor: pointer; font: inherit; color: inherit; }
  svg { width: 20px; height: 20px; flex: none; display: block; }
  :focus-visible { outline: 3px solid color-mix(in srgb, var(--o) 45%, transparent); outline-offset: 2px; }

  /* ---------- bot\xF3n flotante ---------- */
  .fab {
    position: fixed; bottom: 22px; ${pos}: 22px; z-index: 2147483000;
    width: 60px; height: 60px; border-radius: 50%; border: 0; color: #fff;
    background: linear-gradient(145deg, var(--o2), var(--o) 55%, var(--o-deep));
    box-shadow: 0 10px 24px -6px color-mix(in srgb, var(--o) 65%, transparent), inset 0 1px 0 rgba(255,255,255,.35);
    display: grid; place-items: center; transition: transform .18s ease;
  }
  .fab:hover { transform: translateY(-2px); }
  .fab:active { transform: scale(.96); }
  .fab-icon { grid-area: 1 / 1; display: grid; transition: transform .22s ease, opacity .22s ease; }
  .fab-icon svg { width: 28px; height: 28px; }
  .fab-icon.shut { opacity: 0; transform: rotate(-90deg) scale(.6); }
  .fab.active .open { opacity: 0; transform: rotate(90deg) scale(.6); }
  .fab.active .shut { opacity: 1; transform: none; }
  .fab-icon.open svg circle { fill: var(--o); }
  .badge {
    position: absolute; top: -3px; right: -3px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px;
    background: var(--ink); color: #fff; font-size: 12px; line-height: 22px; font-weight: 700; border: 2px solid #fff;
  }

  /* ---------- panel ---------- */
  .panel {
    position: fixed; bottom: 96px; ${pos}: 22px; z-index: 2147483000;
    width: 412px; max-width: calc(100vw - 24px); height: 690px; max-height: calc(100vh - 116px);
    display: flex; flex-direction: column; border-radius: 26px; overflow: hidden;
    background: #fff;
    box-shadow: 0 30px 60px -20px rgba(30,27,58,.35), 0 0 0 1px rgba(30,27,58,.05);
    opacity: 0; visibility: hidden; transform: translateY(14px) scale(.97);
    transform-origin: bottom ${pos};
    transition: opacity .2s ease, transform .26s cubic-bezier(.2,.9,.3,1.1), visibility 0s linear .26s;
  }
  .panel.on { opacity: 1; visibility: visible; transform: none; transition-delay: 0s; }

  header {
    position: relative; display: flex; align-items: center; gap: 12px; color: #fff;
    padding: 22px 18px 44px 22px;
    background:
      linear-gradient(115deg, transparent 55%, rgba(255,255,255,.14) 55%, rgba(255,255,255,.04) 80%, transparent 80%),
      linear-gradient(120deg, var(--o-deep), var(--o) 45%, var(--o2));
  }
  .brand { font-weight: 800; font-style: italic; font-size: 23px; letter-spacing: -.02em; white-space: nowrap; }
  .sep { width: 1.5px; align-self: stretch; margin: 4px 2px; background: rgba(255,255,255,.55); border-radius: 1px; }
  .head-icon svg { width: 30px; height: 30px; stroke-width: 1.8; }
  .head-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .head-text strong { font-size: 19px; font-weight: 700; letter-spacing: -.01em; line-height: 1.2; }
  .head-text small { font-size: 13px; opacity: .9; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .x { background: none; border: 0; color: #fff; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; margin-right: -6px; }
  .x:hover { background: rgba(255,255,255,.16); }
  .x svg { width: 24px; height: 24px; stroke-width: 2.4; }

  .sheet {
    position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column;
    margin-top: -26px; background: #fff; border-radius: 24px 24px 0 0;
  }

  /* ---------- pesta\xF1as ---------- */
  nav { display: flex; margin: 16px 18px 4px; padding: 4px; gap: 4px; background: var(--field); border-radius: 16px; }
  .tab {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 9px;
    padding: 11px 8px 10px; border: 0; background: none; border-radius: 12px;
    color: var(--muted); font-size: 14.5px; font-weight: 600; position: relative;
  }
  .tab svg { width: 21px; height: 21px; }
  .tab:hover { color: var(--ink); }
  .tab.active { color: var(--o); background: var(--tint); }
  .tab.active::after { content: ""; position: absolute; left: 0; right: 0; bottom: -4px; height: 3px; border-radius: 2px; background: var(--o); }
  .tab:not(.active) svg circle { fill: var(--field); }
  .tab.active svg circle { fill: #fff; }

  .body { flex: 1; overflow: auto; padding: 18px 18px 20px; font-size: 14px; scrollbar-width: thin; }

  /* ---------- formulario ---------- */
  .form { display: flex; flex-direction: column; gap: 18px; }
  .field { display: flex; flex-direction: column; gap: 10px; }
  .lbl { display: flex; align-items: center; gap: 12px; font-size: 15px; font-weight: 700; color: var(--ink); }
  .ibox { width: 38px; height: 38px; border-radius: 12px; background: var(--tint); color: var(--o); display: grid; place-items: center; flex: none; }
  .ibox svg circle { fill: var(--tint); }
  .ibox.big { width: 56px; height: 56px; border-radius: 18px; }
  .ibox.big svg { width: 28px; height: 28px; }

  .select { position: relative; }
  .select svg { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: var(--ink); pointer-events: none; }
  select, textarea, .composer input[name=text] {
    width: 100%; font-size: 15px; font-weight: 500; color: var(--ink);
    background: #fff; border: 1.5px solid var(--line); border-radius: 16px; outline: none;
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  select { appearance: none; -webkit-appearance: none; padding: 14px 46px 14px 18px; cursor: pointer; }
  textarea { padding: 14px 18px; min-height: 112px; resize: vertical; line-height: 1.5; }
  textarea::placeholder, .composer input::placeholder { color: #8d89a3; font-weight: 400; }
  select:focus, textarea:focus, .composer input:focus { border-color: var(--o); box-shadow: 0 0 0 4px color-mix(in srgb, var(--o) 14%, transparent); }
  textarea.invalid { border-color: #e5484d; box-shadow: 0 0 0 4px rgba(229,72,77,.12); }

  .drop {
    display: flex; align-items: center; gap: 12px; padding: 14px 14px 14px 16px;
    border: 1.5px dashed #d9d6e3; border-radius: 18px; background: var(--field);
    transition: border-color .15s ease, background .15s ease;
  }
  .drop.over, .drop:hover { border-color: var(--o); background: var(--tint); }
  .drop input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .drop-main { flex: 1; display: flex; align-items: center; gap: 14px; cursor: pointer; min-width: 0; }
  .drop-main:focus-within, .cam:focus-within { outline: 3px solid color-mix(in srgb, var(--o) 45%, transparent); outline-offset: 4px; border-radius: 12px; }
  .clip { color: var(--o); }
  .clip svg { width: 28px; height: 28px; transform: rotate(-12deg); }
  .drop-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .drop-text strong { font-size: 15px; font-weight: 700; }
  .drop-text small { font-size: 12.5px; color: var(--muted); line-height: 1.35; }
  .cam { width: 48px; height: 48px; border-radius: 14px; background: #eeedf3; color: #4b4766; display: grid; place-items: center; cursor: pointer; flex: none; }
  .cam:hover { background: #e4e2ec; color: var(--ink); }
  .cam svg { width: 24px; height: 24px; }

  .chips { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; margin-top: -8px; }
  .chips li { display: flex; align-items: center; gap: 4px; max-width: 100%; padding: 5px 6px 5px 12px; border-radius: 999px; background: var(--chip); font-size: 12.5px; font-weight: 500; }
  .chips span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chips button { border: 0; background: none; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; color: var(--muted); }
  .chips button:hover { background: #e4e2ec; color: var(--ink); }
  .chips svg { width: 14px; height: 14px; }

  .send {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    padding: 17px; border: 0; border-radius: 999px; color: #fff; font-size: 17px; font-weight: 700;
    background: linear-gradient(100deg, var(--o2), var(--o) 50%, var(--o-deep));
    box-shadow: 0 12px 22px -10px color-mix(in srgb, var(--o) 80%, transparent), inset 0 1px 0 rgba(255,255,255,.3);
    transition: transform .15s ease, filter .15s ease;
  }
  .send svg { width: 24px; height: 24px; }
  .send:hover { filter: brightness(1.05); }
  .send:active { transform: scale(.985); }
  .send:disabled { opacity: .65; cursor: default; transform: none; }

  .note { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 14px; font-size: 13.5px; font-weight: 500; line-height: 1.45; }
  .note svg { width: 18px; height: 18px; margin-top: 1px; }
  .note.ok { background: #e8f6ee; color: #136c3e; }
  .note.err { background: #fdeced; color: #a7262c; }

  /* ---------- mis reportes ---------- */
  .state { display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--muted); padding: 48px 0; }
  .spin { width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid var(--line); border-top-color: var(--o); animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px; padding: 36px 20px; color: var(--muted); line-height: 1.5; }
  .empty p { max-width: 260px; }
  .ghost { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 999px; border: 1.5px solid var(--line); background: #fff; font-weight: 600; color: var(--o); }
  .ghost:hover { border-color: var(--o); }
  .ghost svg circle { fill: #fff; }

  .list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .item {
    width: 100%; display: flex; gap: 12px; align-items: flex-start; text-align: left;
    padding: 14px; border-radius: 18px; border: 1.5px solid var(--line); background: #fff;
    transition: border-color .15s ease, background .15s ease;
  }
  .item:hover { border-color: var(--o); background: var(--field); }
  .item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .row strong { font-size: 14.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pre { color: var(--muted); font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .date { color: #9a97ad; font-size: 12px; }
  .st { flex: none; font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: var(--tint); color: var(--o-deep); }
  .st.resolved { background: #e8f6ee; color: #136c3e; }
  .st.pending { background: #fff4de; color: #8a5300; }

  /* ---------- chat ---------- */
  .chat { display: flex; flex-direction: column; height: calc(100% + 38px); margin: -18px -18px -20px; }
  .back { display: flex; align-items: center; gap: 4px; align-self: flex-start; border: 0; background: none; color: var(--muted); font-weight: 600; font-size: 13.5px; padding: 12px 18px 6px 12px; }
  .back:hover { color: var(--ink); }
  .msgs { flex: 1; overflow: auto; padding: 6px 18px 14px; display: flex; flex-direction: column; gap: 10px; }
  .msg { max-width: 84%; padding: 10px 14px; border-radius: 18px; font-size: 14px; line-height: 1.45; word-wrap: break-word; }
  .msg.me { align-self: flex-end; color: #fff; background: linear-gradient(120deg, var(--o), var(--o-deep)); border-bottom-right-radius: 6px; }
  .msg.them { align-self: flex-start; background: var(--chip); border-bottom-left-radius: 6px; }
  .msg img { max-width: 100%; border-radius: 12px; margin-top: 8px; display: block; }
  .msg .att { color: inherit; display: flex; align-items: center; gap: 6px; margin-top: 6px; font-weight: 600; }
  .msg .att svg { width: 16px; height: 16px; }
  .who { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--o-deep); margin-bottom: 3px; }
  .who svg { width: 14px; height: 14px; }
  .time { font-size: 11px; opacity: .7; margin-top: 4px; text-align: right; }
  .composer { display: flex; gap: 8px; align-items: center; padding: 12px 14px; border-top: 1px solid var(--line); background: #fff; }
  .composer input[name=text] { flex: 1; padding: 12px 16px; border-radius: 999px; font-size: 14.5px; }
  .attach { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; color: var(--muted); cursor: pointer; flex: none; position: relative; }
  .attach:hover { background: var(--chip); color: var(--o); }
  .attach input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .go { width: 46px; height: 46px; border-radius: 50%; border: 0; color: #fff; display: grid; place-items: center; flex: none;
    background: linear-gradient(135deg, var(--o2), var(--o) 55%, var(--o-deep)); }

  @media (max-width: 480px) {
    .panel { inset: 0; width: 100%; max-width: none; height: 100%; max-height: none; border-radius: 0; }
    .fab.active { display: none; }
    header { gap: 10px; padding: 18px 14px 42px 18px; }
    .brand { font-size: 19px; }
    .head-icon svg { width: 26px; height: 26px; }
    .head-text strong { font-size: 17px; }
    .head-text small { font-size: 12px; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, .panel, .fab, .fab-icon { transition: none !important; animation-duration: .01ms !important; }
  }
  `;
}

// src/index.ts
var cfg = null;
var client = null;
var ui = null;
var rt = null;
var context = {};
var listeners = /* @__PURE__ */ new Map();
function emit(e, payload) {
  var _a;
  (_a = listeners.get(e)) == null ? void 0 : _a.forEach((fn) => {
    try {
      fn(payload);
    } catch (err) {
      console.error("[MotoclickSupport]", err);
    }
  });
}
function need() {
  if (!client) throw new Error("MotoclickSupport: llama a init() primero");
  return client;
}
function startRealtime() {
  const token = client == null ? void 0 : client.pubsubToken;
  if (!cfg || !token || rt) return;
  rt = new Realtime(cfg.chatwootUrl, token, (m) => {
    ui == null ? void 0 : ui.push(m);
    emit("message", m);
    if (!m.fromUser) emit("reply", m);
  });
  rt.start();
}
function stopRealtime() {
  rt == null ? void 0 : rt.stop();
  rt = null;
}
var MotoclickSupport = {
  /** Configura el SDK. Es lo único obligatorio. */
  init(config) {
    var _a, _b;
    if (!(config == null ? void 0 : config.chatwootUrl) || !(config == null ? void 0 : config.inboxId)) {
      throw new Error("MotoclickSupport.init: faltan chatwootUrl e inboxId");
    }
    this.destroy();
    cfg = { showButton: true, position: "right", color: "#ff6a13", locale: "es", ...config };
    client = new ChatwootClient(cfg);
    if (typeof document === "undefined") return;
    const t = (_b = texts[(_a = cfg.locale) != null ? _a : "es"]) != null ? _b : texts.es;
    const mount = () => {
      var _a2, _b2, _c;
      if (!cfg || !client) return;
      ui = new SupportUI(
        t,
        ((_a2 = cfg.categories) == null ? void 0 : _a2.length) ? cfg.categories : t.categories,
        {
          color: cfg.color,
          position: cfg.position,
          showButton: cfg.showButton,
          brandName: (_b2 = cfg.brandName) != null ? _b2 : "Motoclick",
          loadFont: (_c = cfg.loadFont) != null ? _c : true
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
          onOpen: () => emit("open"),
          onClose: () => emit("close")
        }
      );
      if (client.hasContact) client.ensureContact().then(startRealtime).catch(() => {
      });
    };
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount, { once: true });
  },
  /** Dice quién es el usuario (después del login). */
  identify(user) {
    const c = need();
    stopRealtime();
    c.identify(user);
    if (c.hasContact) c.ensureContact().then(startRealtime).catch(() => {
    });
  },
  /** Datos que se adjuntan a todos los reportes (ej. orden activa). Pasa null para borrar una clave. */
  setContext(data) {
    for (const [k, v] of Object.entries(data)) {
      if (v === null) delete context[k];
      else context[k] = v;
    }
  },
  /** Envía un reporte sin abrir la interfaz. Devuelve el id de la conversación en Chatwoot. */
  async report(input) {
    try {
      const id = await need().report(input, context);
      startRealtime();
      emit("reported", { conversationId: id });
      return id;
    } catch (err) {
      emit("error", err);
      throw err;
    }
  },
  conversations() {
    return need().conversations();
  },
  /** Abre el panel. view: 'new' (por defecto) o 'list'. */
  open(view = "new") {
    ui == null ? void 0 : ui.open({ name: view });
  },
  close() {
    ui == null ? void 0 : ui.close();
  },
  showButton() {
    ui == null ? void 0 : ui.setButtonVisible(true);
  },
  hideButton() {
    ui == null ? void 0 : ui.setButtonVisible(false);
  },
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, /* @__PURE__ */ new Set());
    listeners.get(event).add(fn);
    return () => {
      var _a;
      return (_a = listeners.get(event)) == null ? void 0 : _a.delete(fn);
    };
  },
  /** Llamar al cerrar sesión: olvida al usuario en este dispositivo. */
  reset() {
    stopRealtime();
    client == null ? void 0 : client.reset();
    context = {};
  },
  /** Quita el botón y desconecta todo. */
  destroy() {
    stopRealtime();
    ui == null ? void 0 : ui.destroy();
    ui = null;
    client = null;
    cfg = null;
  }
};
var index_default = MotoclickSupport;
if (typeof document !== "undefined") {
  const tag = document.currentScript;
  const d = tag == null ? void 0 : tag.dataset;
  if ((d == null ? void 0 : d.chatwootUrl) && (d == null ? void 0 : d.inboxId)) {
    MotoclickSupport.init({
      chatwootUrl: d.chatwootUrl,
      inboxId: d.inboxId,
      app: d.app,
      appVersion: d.appVersion,
      locale: d.locale || void 0,
      color: d.color,
      position: d.position || void 0
    });
  }
}
export {
  MotoclickSupport,
  index_default as default
};
