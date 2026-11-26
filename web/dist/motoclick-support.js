"use strict";var __mcs=(()=>{var q=Object.defineProperty;var V=Object.getOwnPropertyDescriptor;var j=Object.getOwnPropertyNames;var F=Object.prototype.hasOwnProperty;var J=(r,e)=>{for(var n in e)q(r,n,{get:e[n],enumerable:!0})},W=(r,e,n,t)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of j(e))!F.call(r,s)&&s!==n&&q(r,s,{get:()=>e[s],enumerable:!(t=V(e,s))||t.enumerable});return r};var K=r=>W(q({},"__esModule",{value:!0}),r);var se={};J(se,{MotoclickSupport:()=>U,default:()=>re});var C=class{constructor(e){this.cfg=e;this.user=null;this.contact=null;this.pending=null;let n=e.chatwootUrl.replace(/\/+$/,"");this.base=`${n}/public/api/v1/inboxes/${encodeURIComponent(e.inboxId)}`}get pubsubToken(){var e,n;return(n=(e=this.contact)==null?void 0:e.pubsubToken)!=null?n:null}get hasContact(){return this.contact!==null||this.readStored()!==null}identify(e){var t;((t=this.user)==null?void 0:t.id)!==e.id&&(this.contact=null,this.pending=null),this.user=e;let n=this.readStored();n&&(this.contact=n,this.request("PATCH",`/contacts/${n.sourceId}`,this.contactBody()).catch(()=>{}))}reset(){var n;let e=this.storageKey();e&&((n=T())==null||n.removeItem(e)),this.user=null,this.contact=null,this.pending=null}async ensureContact(){if(this.contact)return this.contact;let e=this.readStored();return e?this.contact=e:(this.pending||(this.pending=(async()=>{var o;let n=await this.request("POST","/contacts",this.contactBody()),t={sourceId:n.source_id,pubsubToken:n.pubsub_token,userId:this.userId()},s=this.storageKey();return s&&((o=T())==null||o.setItem(s,JSON.stringify(t))),this.contact=t,t})().finally(()=>{this.pending=null})),this.pending)}async report(e,n){var h,m,x;let t=(h=e.message)==null?void 0:h.trim();if(!t)throw new Error("El mensaje del reporte est\xE1 vac\xEDo");let s=await this.ensureContact(),o={...k(n),...k((m=e.context)!=null?m:{})};e.category&&(o.categoria=e.category),this.cfg.app&&(o.app=this.cfg.app),this.cfg.appVersion&&(o.app_version=this.cfg.appVersion),o.dispositivo=G(),typeof location!="undefined"&&(o.pagina=location.href.slice(0,250));let l=await this.request("POST",`/contacts/${s.sourceId}/conversations`,{custom_attributes:o}),c=e.category?`**${e.category}**
`:"",p=Object.entries({...k(n),...k((x=e.context)!=null?x:{})}).map(([M,L])=>`${M}: ${L}`).join(" \xB7 "),a=`${c}${t}${p?`

_${p}_`:""}`;return await this.sendMessage(l.id,a,e.files),l.id}async sendMessage(e,n,t){let o=`/contacts/${(await this.ensureContact()).sourceId}/conversations/${e}/messages`,l=t?Array.from(t):[],c;if(l.length){let p=new FormData;p.append("content",n),p.append("echo_id",P()),l.forEach(a=>p.append("attachments[]",a,a.name)),c=await this.request("POST",o,p)}else c=await this.request("POST",o,{content:n,echo_id:P()});return $(c,e)}async conversations(){if(!this.hasContact)return[];let e=await this.ensureContact();return(await this.request("GET",`/contacts/${e.sourceId}/conversations`)).map(t=>{var o,l,c,p,a,h;let s=((o=t.messages)!=null?o:[]).filter(E).map(m=>$(m,t.id));return{id:t.id,status:t.status,createdAt:N((p=(l=t.created_at)!=null?l:t.timestamp)!=null?p:(c=s[0])==null?void 0:c.createdAt),lastMessage:s[s.length-1],attributes:Y((a=t.custom_attributes)!=null?a:{},(h=s[0])==null?void 0:h.content)}}).sort((t,s)=>s.createdAt.getTime()-t.createdAt.getTime())}async messages(e){let n=await this.ensureContact();return(await this.request("GET",`/contacts/${n.sourceId}/conversations/${e}/messages`)).filter(E).map(s=>$(s,e))}async markSeen(e){let n=await this.ensureContact();await this.request("POST",`/contacts/${n.sourceId}/conversations/${e}/update_last_seen`).catch(()=>{})}contactBody(){var s;let e=this.user,n={identifier:this.userId()};e!=null&&e.identifierHash&&(n.identifier_hash=e.identifierHash),e!=null&&e.name&&(n.name=e.name),e!=null&&e.email&&(n.email=e.email),e!=null&&e.phone&&(n.phone_number=Z(e.phone));let t={...(s=e==null?void 0:e.attributes)!=null?s:{}};return this.cfg.app&&(t.app=this.cfg.app),n.custom_attributes=k(t),n}userId(){var s;if((s=this.user)!=null&&s.id)return String(this.user.id);let e=T(),n=`mcs:anon:${this.cfg.inboxId}`,t=e==null?void 0:e.getItem(n);return t||(t=`anon_${P()}`,e==null||e.setItem(n,t)),t}storageKey(){return`mcs:${this.cfg.inboxId}:${this.userId()}`}readStored(){var t;let e=this.storageKey(),n=e?(t=T())==null?void 0:t.getItem(e):null;if(!n)return null;try{let s=JSON.parse(n);return s.sourceId&&s.userId===this.userId()?s:null}catch{return null}}async request(e,n,t,s=!1){let o={method:e,headers:{}};t instanceof FormData?o.body=t:t!==void 0&&(o.headers["Content-Type"]="application/json",o.body=JSON.stringify(t));let l=await fetch(this.base+n,o);if(l.status===404&&!s&&n.startsWith("/contacts/")&&this.contact){let p=this.contact.sourceId;this.reset();let a=await this.ensureContact();return this.request(e,n.replace(p,a.sourceId),t,!0)}if(!l.ok){let p="";try{p=await l.text()}catch{}throw new Error(`Chatwoot ${l.status}: ${p.slice(0,200)}`)}let c=await l.text();return c?JSON.parse(c):{}}};function E(r){let e=B(r.message_type);return!r.private&&(e===0||e===1||e===3)}function B(r){var e;return typeof r=="number"?r:(e={incoming:0,outgoing:1,activity:2,template:3}[r])!=null?e:2}function $(r,e){var n,t,s,o;return{id:r.id,conversationId:(n=r.conversation_id)!=null?n:e,content:(t=r.content)!=null?t:"",fromUser:B(r.message_type)===0,createdAt:N(r.created_at),attachments:((s=r.attachments)!=null?s:[]).map(l=>({url:l.data_url,type:l.file_type})),senderName:(o=r.sender)==null?void 0:o.name}}function Y(r,e){if(r.categoria||!e)return r;let n=/^\*\*(.+?)\*\*/.exec(e);return n?{...r,categoria:n[1]}:r}function N(r){return r instanceof Date?r:typeof r=="number"?new Date(r<1e12?r*1e3:r):typeof r=="string"?new Date(r):new Date}function k(r){let e={};for(let[n,t]of Object.entries(r))t==null||t===""||(e[n]=typeof t=="number"||typeof t=="boolean"?t:String(t));return e}function Z(r){let e=r.replace(/[^\d+]/g,"");if(e)return e.startsWith("+")?e:e.length===10?`+1${e}`:`+${e}`}function G(){return typeof navigator=="undefined"?"desconocido":navigator.userAgent.slice(0,200)}function P(){return typeof crypto!="undefined"&&"randomUUID"in crypto?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36)}function T(){try{return typeof localStorage!="undefined"?localStorage:null}catch{return null}}var A={es:{button:"Soporte",title:"Soporte",subtitle:"Estamos para ayudarte",attachHint:"Puedes subir im\xE1genes, documentos o capturas",camera:"Tomar foto",remove:"Quitar",newReport:"Nuevo reporte",myReports:"Mis reportes",category:"Tipo de problema",message:"Cu\xE9ntanos qu\xE9 pas\xF3",messagePlaceholder:"Describe el problema con el mayor detalle posible\u2026",attach:"Adjuntar foto o archivo",send:"Enviar reporte",sending:"Enviando\u2026",sent:"\xA1Listo! Recibimos tu reporte. Te responderemos aqu\xED.",error:"No se pudo enviar. Revisa tu conexi\xF3n e intenta de nuevo.",empty:"A\xFAn no tienes reportes. Cuando env\xEDes uno, aqu\xED ver\xE1s la respuesta de soporte.",loading:"Cargando\u2026",reply:"Escribe una respuesta\u2026",back:"Volver",agent:"Soporte",you:"T\xFA",open:"Abierto",resolved:"Resuelto",pending:"Pendiente",close:"Cerrar",categories:["Problema con una orden","Pagos","Problema con la app","Cuenta","Otro"]},en:{button:"Support",title:"Support",subtitle:"We are here to help",attachHint:"You can upload images, documents or screenshots",camera:"Take photo",remove:"Remove",newReport:"New report",myReports:"My reports",category:"Issue type",message:"Tell us what happened",messagePlaceholder:"Describe the problem in as much detail as possible\u2026",attach:"Attach photo or file",send:"Send report",sending:"Sending\u2026",sent:"Done! We got your report. We will reply here.",error:"Could not send. Check your connection and try again.",empty:"No reports yet. Once you send one, the support reply shows up here.",loading:"Loading\u2026",reply:"Write a reply\u2026",back:"Back",agent:"Support",you:"You",open:"Open",resolved:"Resolved",pending:"Pending",close:"Close",categories:["Order issue","Payments","App issue","Account","Other"]}};var I=class{constructor(e,n,t){this.chatwootUrl=e;this.pubsubToken=n;this.onMessage=t;this.ws=null;this.retry=0;this.timer=null;this.stopped=!1}start(){this.stopped=!1,this.connect()}stop(){var e;this.stopped=!0,this.timer&&clearTimeout(this.timer),(e=this.ws)==null||e.close(),this.ws=null}connect(){if(typeof WebSocket=="undefined")return;let e=this.chatwootUrl.replace(/\/+$/,"").replace(/^http/,"ws")+"/cable",n=JSON.stringify({channel:"RoomChannel",pubsub_token:this.pubsubToken}),t=new WebSocket(e);this.ws=t,t.onopen=()=>{this.retry=0,t.send(JSON.stringify({command:"subscribe",identifier:n}))},t.onmessage=s=>{var p,a;let o;try{o=JSON.parse(s.data)}catch{return}if(o.type)return;let l=(p=o.message)==null?void 0:p.event,c=(a=o.message)==null?void 0:a.data;!c||l!=="message.created"||!E(c)||c.conversation_id===void 0||this.onMessage($(c,c.conversation_id))},t.onclose=()=>{if(this.stopped)return;let s=Math.min(3e4,1e3*2**this.retry++);this.timer=setTimeout(()=>this.connect(),s)},t.onerror=()=>t.close()}};var Q="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,800&display=swap",R=class{constructor(e,n,t,s){this.t=e;this.categories=n;this.opts=t;this.h=s;this.view={name:"new"};this.isOpen=!1;this.unread=0;this.chatMessages=[];this.pending=[];t.loadFont&&X(),this.host=document.createElement("motoclick-support"),this.root=this.host.attachShadow({mode:"open"}),this.root.innerHTML=`<style>${ne(t.color,t.position)}</style>${this.shell()}`,document.body.appendChild(this.host),this.panel=this.$(".panel"),this.body=this.$(".body"),this.fab=this.$(".fab"),this.badge=this.$(".badge"),this.setButtonVisible(t.showButton),this.fab.addEventListener("click",()=>this.isOpen?this.close():this.open()),this.$(".x").addEventListener("click",()=>this.close()),this.panel.addEventListener("keydown",o=>{o.key==="Escape"&&this.close()}),this.root.querySelectorAll(".tab").forEach(o=>o.addEventListener("click",()=>this.go(o.dataset.v==="list"?{name:"list"}:{name:"new"})))}destroy(){this.host.remove()}setButtonVisible(e){this.fab.style.display=e?"":"none"}open(e){this.isOpen=!0,this.panel.classList.add("on"),this.fab.classList.add("active"),this.fab.setAttribute("aria-expanded","true"),this.go(e!=null?e:this.unread?{name:"list"}:this.view),this.h.onOpen()}close(){this.isOpen=!1,this.panel.classList.remove("on"),this.fab.classList.remove("active"),this.fab.setAttribute("aria-expanded","false"),this.h.onClose()}push(e){if(this.isOpen&&this.view.name==="chat"&&this.view.id===e.conversationId){this.chatMessages.some(n=>n.id===e.id)||(this.chatMessages.push(e),this.renderMessages(),this.h.seen(e.conversationId));return}e.fromUser||(this.unread++,this.badge.textContent=String(this.unread),this.badge.style.display="",this.isOpen&&this.view.name==="list"&&this.go({name:"list"}))}go(e){this.view=e,this.root.querySelectorAll(".tab").forEach(n=>{let t=n.dataset.v==="list"==(e.name!=="new");n.classList.toggle("active",t),n.setAttribute("aria-selected",String(t))}),e.name==="new"?this.renderNew():e.name==="list"?this.renderList():this.renderChat(e.id)}renderNew(e){let n=this.t;this.pending=[],this.body.innerHTML=`
      <form class="form" novalidate>
        ${e?`<div class="note ${e.ok?"ok":"err"}" role="status">${e.ok?d.check:d.alert}<span>${i(e.text)}</span></div>`:""}
        <div class="field">
          <label class="lbl" for="mcs-cat"><span class="ibox">${d.alert}</span>${i(n.category)}</label>
          <div class="select">
            <select id="mcs-cat" name="category">${this.categories.map(a=>`<option>${i(a)}</option>`).join("")}</select>
            ${d.chevron}
          </div>
        </div>
        <div class="field">
          <label class="lbl" for="mcs-msg"><span class="ibox">${d.bubble}</span>${i(n.message)}</label>
          <textarea id="mcs-msg" name="message" rows="4" placeholder="${i(n.messagePlaceholder)}"></textarea>
        </div>
        <div class="drop">
          <label class="drop-main">
            <input type="file" class="pick" multiple accept="image/*,video/*,application/pdf" />
            <span class="clip">${d.clip}</span>
            <span class="drop-text"><strong>${i(n.attach)}</strong><small>${i(n.attachHint)}</small></span>
          </label>
          <label class="cam" title="${i(n.camera)}" aria-label="${i(n.camera)}">
            <input type="file" class="snap" accept="image/*" capture="environment" />
            ${d.camera}
          </label>
        </div>
        <ul class="chips" hidden></ul>
        <button class="send" type="submit">${d.plane}<span>${i(n.send)}</span></button>
      </form>`;let t=this.body.querySelector("form"),s=t.querySelector(".chips"),o=t.querySelector("textarea"),l=t.querySelector(".drop"),c=()=>{s.hidden=!this.pending.length,s.innerHTML=this.pending.map((a,h)=>`<li><span>${i(a.name)}</span><button type="button" data-i="${h}" aria-label="${i(n.remove)} ${i(a.name)}">${d.x}</button></li>`).join(""),s.querySelectorAll("button").forEach(a=>a.addEventListener("click",()=>{this.pending.splice(Number(a.dataset.i),1),c()}))},p=a=>{a&&this.pending.push(...Array.from(a)),c()};t.querySelectorAll("input[type=file]").forEach(a=>a.addEventListener("change",()=>{p(a.files),a.value=""})),l.addEventListener("dragover",a=>{a.preventDefault(),l.classList.add("over")}),l.addEventListener("dragleave",()=>l.classList.remove("over")),l.addEventListener("drop",a=>{var h,m;a.preventDefault(),l.classList.remove("over"),p((m=(h=a.dataTransfer)==null?void 0:h.files)!=null?m:null)}),o.addEventListener("input",()=>o.classList.remove("invalid")),t.addEventListener("submit",async a=>{var M,L,z;a.preventDefault();let h=new FormData(t),m=String((M=h.get("message"))!=null?M:"").trim();if(!m){o.classList.add("invalid"),o.focus();return}let x=t.querySelector("button.send");x.disabled=!0,x.querySelector("span").textContent=n.sending;try{await this.h.report({category:String((L=h.get("category"))!=null?L:""),message:m,files:this.pending}),this.renderNew({ok:!0,text:n.sent})}catch{x.disabled=!1,x.querySelector("span").textContent=n.send,(z=t.querySelector(".note"))==null||z.remove(),t.insertAdjacentHTML("afterbegin",`<div class="note err" role="alert">${d.alert}<span>${i(n.error)}</span></div>`)}})}async renderList(){let e=this.t;this.unread=0,this.badge.style.display="none",this.body.innerHTML=`<div class="state"><span class="spin"></span>${i(e.loading)}</div>`;let n;try{n=await this.h.conversations()}catch{this.body.innerHTML=`<div class="note err" role="alert">${d.alert}<span>${i(e.error)}</span></div>`;return}if(this.view.name==="list"){if(!n.length){this.body.innerHTML=`<div class="empty"><span class="ibox big">${d.history}</span><p>${i(e.empty)}</p>
        <button class="ghost" type="button">${d.bubble}<span>${i(e.newReport)}</span></button></div>`,this.body.querySelector(".ghost").addEventListener("click",()=>this.go({name:"new"}));return}this.body.innerHTML=`<ul class="list">${n.map(t=>{var p,a;let s=String((p=t.attributes.categoria)!=null?p:`#${t.id}`),o=t.lastMessage,l=o?`${o.fromUser?e.you:e.agent}: ${te(o.content)}`:"",c=(a=e[t.status])!=null?a:t.status;return`<li><button type="button" class="item" data-id="${t.id}">
          <span class="ibox">${d.bubble}</span>
          <span class="item-main">
            <span class="row"><strong>${i(s)}</strong><span class="st ${i(t.status)}">${i(String(c))}</span></span>
            <span class="pre">${i(l)}</span>
            <span class="date">${D(t.createdAt)}</span>
          </span>
        </button></li>`}).join("")}</ul>`,this.body.querySelectorAll(".item").forEach(t=>t.addEventListener("click",()=>this.go({name:"chat",id:Number(t.dataset.id)})))}}async renderChat(e){let n=this.t;this.body.innerHTML=`
      <div class="chat">
        <button class="back" type="button">${d.back}<span>${i(n.myReports)}</span></button>
        <div class="msgs" aria-live="polite"><div class="state"><span class="spin"></span>${i(n.loading)}</div></div>
        <form class="composer">
          <label class="attach" title="${i(n.attach)}" aria-label="${i(n.attach)}">
            <input type="file" multiple accept="image/*,video/*,application/pdf" />${d.clip}
          </label>
          <input name="text" placeholder="${i(n.reply)}" autocomplete="off" aria-label="${i(n.reply)}" />
          <button class="go" type="submit" aria-label="${i(n.send)}">${d.plane}</button>
        </form>
      </div>`,this.body.querySelector(".back").addEventListener("click",()=>this.go({name:"list"}));let t=this.body.querySelector(".composer"),s=t.querySelector("input[name=text]"),o=t.querySelector("input[type=file]"),l=async(c=[])=>{let p=s.value.trim();if(!(!p&&!c.length)){s.value="";try{let a=await this.h.send(e,p,c);this.chatMessages.some(h=>h.id===a.id)||this.chatMessages.push(a),this.renderMessages()}catch{s.value=p}}};t.addEventListener("submit",c=>{c.preventDefault(),l()}),o.addEventListener("change",()=>{var p;let c=Array.from((p=o.files)!=null?p:[]);o.value="",l(c)});try{this.chatMessages=await this.h.messages(e)}catch{this.chatMessages=[]}this.view.name!=="chat"||this.view.id!==e||(this.renderMessages(),this.h.seen(e))}renderMessages(){let e=this.body.querySelector(".msgs");if(!e)return;let n=this.t;e.innerHTML=this.chatMessages.map(t=>`<div class="msg ${t.fromUser?"me":"them"}">
          ${t.fromUser?"":`<div class="who">${d.headset}${i(t.senderName||n.agent)}</div>`}
          ${t.content?`<div class="txt">${ee(t.content)}</div>`:""}
          ${t.attachments.map(s=>s.type==="image"?`<a href="${i(s.url)}" target="_blank" rel="noopener"><img src="${i(s.url)}" alt="" /></a>`:`<a class="att" href="${i(s.url)}" target="_blank" rel="noopener">${d.clip}${i(s.type)}</a>`).join("")}
          <div class="time">${D(t.createdAt)}</div>
        </div>`).join(""),e.scrollTop=e.scrollHeight}shell(){let e=this.t,n=this.opts.brandName;return`
      <button class="fab" type="button" aria-label="${i(e.button)}" aria-expanded="false">
        <span class="fab-icon open">${d.bubbleSolid}</span>
        <span class="fab-icon shut">${d.x}</span>
        <span class="badge" style="display:none"></span>
      </button>
      <section class="panel" role="dialog" aria-label="${i(e.title)}">
        <header>
          ${n?`<span class="brand">${i(n)}</span><span class="sep" aria-hidden="true"></span>`:""}
          <span class="head-icon">${d.headset}</span>
          <span class="head-text"><strong>${i(e.title)}</strong><small>${i(e.subtitle)}</small></span>
          <button class="x" type="button" aria-label="${i(e.close)}">${d.x}</button>
        </header>
        <div class="sheet">
          <nav role="tablist">
            <button class="tab active" type="button" role="tab" data-v="new">${d.bubbleSolid}<span>${i(e.newReport)}</span></button>
            <button class="tab" type="button" role="tab" data-v="list">${d.history}<span>${i(e.myReports)}</span></button>
          </nav>
          <div class="body"></div>
        </div>
      </section>`}$(e){return this.root.querySelector(e)}};function X(){if(document.querySelector("link[data-mcs-font]"))return;let r=document.createElement("link");r.rel="stylesheet",r.href=Q,r.dataset.mcsFont="",document.head.appendChild(r)}var b=(r,e=!1)=>`<svg viewBox="0 0 24 24" aria-hidden="true" ${e?'fill="currentColor"':'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${r}</svg>`,d={headset:b('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.6"/><rect x="17" y="13" width="4" height="6" rx="1.6"/><path d="M19 19a4 4 0 0 1-4 3h-2"/>'),bubbleSolid:b('<path d="M5 3.5h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-8.2L6 21.2V17.5H5a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Z"/><circle cx="8" cy="10.5" r="1.3" fill="#fff"/><circle cx="12" cy="10.5" r="1.3" fill="#fff"/><circle cx="16" cy="10.5" r="1.3" fill="#fff"/>',!0),bubble:b('<path d="M5 3.5h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-8.2L6 21.2V17.5H5a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Z"/><circle cx="8" cy="10.5" r="1.3" fill="#fff"/><circle cx="12" cy="10.5" r="1.3" fill="#fff"/><circle cx="16" cy="10.5" r="1.3" fill="#fff"/>',!0),history:b('<path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v4h4"/><path d="M12 7.5V12l3 2"/>'),alert:b('<path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4.5"/><path d="M12 17h.01"/>'),clip:b('<path d="m21 11.5-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9"/>'),camera:b('<path d="M4 8h3l1.8-2.5h6.4L17 8h3a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9.5A1.5 1.5 0 0 1 4 8Z"/><circle cx="12" cy="13.5" r="3.5"/>'),plane:b('<path d="M21.5 2.5 2.8 10.3a.6.6 0 0 0 0 1.1l7 2.8 2.8 7a.6.6 0 0 0 1.1 0Z" fill="currentColor" stroke="none"/><path d="m21.5 2.5-11.7 11.7" stroke="rgba(0,0,0,.18)"/>'),x:b('<path d="M6 6l12 12M18 6 6 18"/>'),chevron:b('<path d="m6 9 6 6 6-6"/>'),back:b('<path d="M15 18 9 12l6-6"/>'),check:b('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>')};function i(r){return r.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function ee(r){return i(r).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/(^|\s)_(.+?)_(?=\s|$)/g,"$1<i>$2</i>").replace(/\n/g,"<br>")}function te(r){return r.replace(/\*\*|_/g,"").replace(/\s+/g," ").slice(0,90)}function D(r){return r.toLocaleString(void 0,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}function ne(r,e){return`
  :host {
    all: initial;
    --o: ${r};
    --o2: color-mix(in srgb, ${r} 62%, #ffb067);
    --o-deep: color-mix(in srgb, ${r} 85%, #b33a00);
    --tint: color-mix(in srgb, ${r} 10%, #fff);
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
    position: fixed; bottom: 22px; ${e}: 22px; z-index: 2147483000;
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
    position: fixed; bottom: 96px; ${e}: 22px; z-index: 2147483000;
    width: 412px; max-width: calc(100vw - 24px); height: 690px; max-height: calc(100vh - 116px);
    display: flex; flex-direction: column; border-radius: 26px; overflow: hidden;
    background: #fff;
    box-shadow: 0 30px 60px -20px rgba(30,27,58,.35), 0 0 0 1px rgba(30,27,58,.05);
    opacity: 0; visibility: hidden; transform: translateY(14px) scale(.97);
    transform-origin: bottom ${e};
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
  `}var g=null,f=null,u=null,v=null,H={},S=new Map;function w(r,e){var n;(n=S.get(r))==null||n.forEach(t=>{try{t(e)}catch(s){console.error("[MotoclickSupport]",s)}})}function y(){if(!f)throw new Error("MotoclickSupport: llama a init() primero");return f}function _(){let r=f==null?void 0:f.pubsubToken;!g||!r||v||(v=new I(g.chatwootUrl,r,e=>{u==null||u.push(e),w("message",e),e.fromUser||w("reply",e)}),v.start())}function O(){v==null||v.stop(),v=null}var U={init(r){var t,s;if(!(r!=null&&r.chatwootUrl)||!(r!=null&&r.inboxId))throw new Error("MotoclickSupport.init: faltan chatwootUrl e inboxId");if(this.destroy(),g={showButton:!0,position:"right",color:"#ff6a13",locale:"es",...r},f=new C(g),typeof document=="undefined")return;let e=(s=A[(t=g.locale)!=null?t:"es"])!=null?s:A.es,n=()=>{var o,l,c;!g||!f||(u=new R(e,(o=g.categories)!=null&&o.length?g.categories:e.categories,{color:g.color,position:g.position,showButton:g.showButton,brandName:(l=g.brandName)!=null?l:"Motoclick",loadFont:(c=g.loadFont)!=null?c:!0},{report:p=>this.report(p),conversations:()=>this.conversations(),messages:p=>y().messages(p),send:async(p,a,h)=>{let m=await y().sendMessage(p,a,h);return _(),m},seen:p=>void y().markSeen(p),onOpen:()=>w("open"),onClose:()=>w("close")}),f.hasContact&&f.ensureContact().then(_).catch(()=>{}))};document.body?n():document.addEventListener("DOMContentLoaded",n,{once:!0})},identify(r){let e=y();O(),e.identify(r),e.hasContact&&e.ensureContact().then(_).catch(()=>{})},setContext(r){for(let[e,n]of Object.entries(r))n===null?delete H[e]:H[e]=n},async report(r){try{let e=await y().report(r,H);return _(),w("reported",{conversationId:e}),e}catch(e){throw w("error",e),e}},conversations(){return y().conversations()},open(r="new"){u==null||u.open({name:r})},close(){u==null||u.close()},showButton(){u==null||u.setButtonVisible(!0)},hideButton(){u==null||u.setButtonVisible(!1)},on(r,e){return S.has(r)||S.set(r,new Set),S.get(r).add(e),()=>{var n;return(n=S.get(r))==null?void 0:n.delete(e)}},reset(){O(),f==null||f.reset(),H={}},destroy(){O(),u==null||u.destroy(),u=null,f=null,g=null}},re=U;if(typeof document!="undefined"){let r=document.currentScript,e=r==null?void 0:r.dataset;e!=null&&e.chatwootUrl&&(e!=null&&e.inboxId)&&U.init({chatwootUrl:e.chatwootUrl,inboxId:e.inboxId,app:e.app,appVersion:e.appVersion,locale:e.locale||void 0,color:e.color,position:e.position||void 0})}return K(se);})();
window.MotoclickSupport = __mcs.MotoclickSupport;
