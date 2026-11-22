/* ===========================================================
   backend.js — shared live features for every page.
   - submitRequest(): emails a form via FormSubmit and (if Firebase is on)
     stores it in Firestore for the Owner dashboard.
   - Payments: UPI QR / payment links / pay-at-property.
   - Comments + likes (Firebase), with an email fallback.
   - Lightbox, toast, validation helpers.
   Settings live in js/config.js.
   =========================================================== */
(function () {
  const C = window.SITE_CONFIG || {};
  const BASE = (document.currentScript && document.currentScript.src || "").replace(/[^/]*$/, "");
  const VS = (window.VS = {});
  VS.cfg = C;

  /* ---------------- small helpers ---------------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  VS.esc = esc;
  VS.initials = (name) => (String(name || "?").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2) || "?").toUpperCase();
  VS.inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
  const ms = (t) => (t && t.toMillis ? t.toMillis() : t && t.seconds ? t.seconds * 1000 : Date.now());
  VS.ms = ms;
  VS.timeAgo = (t) => {
    const s = Math.max(1, Math.round((Date.now() - ms(t)) / 1000));
    if (s < 60) return "just now";
    const m = Math.round(s / 60); if (m < 60) return m + " min ago";
    const h = Math.round(m / 60); if (h < 24) return h + " h ago";
    const d = Math.round(h / 24); if (d < 7) return d + (d === 1 ? " day ago" : " days ago");
    return new Date(ms(t)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };
  VS.store = {
    get(k) { try { return localStorage.getItem("vs_" + k) || ""; } catch (e) { return ""; } },
    set(k, v) { try { localStorage.setItem("vs_" + k, v); } catch (e) {} },
  };
  VS.key = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
  VS.makeRef = (prefix) => (prefix || "VS") + "-" + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 4).toUpperCase();

  let toastT;
  VS.toast = (msg) => {
    let t = document.querySelector(".vs-toast");
    if (!t) { t = document.createElement("div"); t.className = "vs-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200);
  };

  VS.waLink = (text) => "https://wa.me/" + (C.whatsapp || "") + "?text=" + encodeURIComponent(text);
  VS.mailLink = (subject, body) => "mailto:" + (C.ownerEmail || "") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

  /* ---------------- validation ---------------- */
  // rules: [{el, req:true, type:'email'|'phone'|'text', label:'Email'}]
  VS.validate = (rules) => {
    let first = null;
    rules.forEach((r) => {
      const el = r.el; if (!el) return;
      const v = (el.value || "").trim();
      let bad = "";
      if (r.req && !v) bad = (r.label || "This field") + " is required.";
      else if (v && r.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) bad = "Please enter a valid email address.";
      else if (v && r.type === "phone" && v.replace(/\D/g, "").length < 10) bad = "Please enter a valid phone number (10+ digits).";
      el.classList.toggle("is-invalid", !!bad);
      if (bad && !first) { first = bad; el.focus(); }
      if (!el._vsBound) { el._vsBound = 1; el.addEventListener("input", () => el.classList.remove("is-invalid")); }
    });
    return first;
  };

  /* ---------------- Firebase (lazy) ---------------- */
  VS.fbOn = () => !!(C.firebase && C.firebase.apiKey);
  let fbP = null;
  VS.fb = () => {
    if (!VS.fbOn()) return Promise.resolve(null);
    if (!fbP) {
      fbP = import(BASE + "vendor/firebase.js").then((m) => {
        const app = m.initializeApp(C.firebase);
        const auth = m.getAuth(app);
        const db = m.getFirestore(app);
        if (C.useEmulator) {
          m.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
          m.connectFirestoreEmulator(db, "127.0.0.1", 8080);
        }
        return { m, app, auth, db };
      }).catch((e) => { console.error("Firebase failed to load", e); fbP = null; return null; });
    }
    return fbP;
  };
  VS.isAdmin = (u) => !!(u && !u.isAnonymous && u.emailVerified &&
    (C.adminEmails || []).map((s) => s.toLowerCase()).includes(String(u.email || "").toLowerCase()));
  // Resolve the signed-in user, signing in anonymously if nobody is (for comments/likes/requests).
  VS.ensureUser = async () => {
    const f = await VS.fb(); if (!f) return null;
    await f.auth.authStateReady();
    if (!f.auth.currentUser) await f.m.signInAnonymously(f.auth);
    return f.auth.currentUser;
  };

  /* ---------------- requests (forms) ---------------- */
  const TYPE_LABEL = { contact: "Contact message", stay: "Pandora City stay booking", passes: "Forever FYRE pass booking", prebook: "Book pre-booking", payment: "Payment confirmation", comment: "Comment", talk2me: "Talk2Me message" };

  async function emailIt(type, ref, fields, opts) {
    if (!C.formEndpoint) throw new Error("no endpoint");
    const body = Object.assign({
      _subject: opts.subject || (TYPE_LABEL[type] || "Website message") + " — " + ref,
      _template: "table",
      _captcha: "false",
      Reference: ref,
      Type: TYPE_LABEL[type] || type,
    }, fields, { Page: location.pathname.split("/").pop() || "index.html" });
    if (opts.autoresponse && fields.email) body._autoresponse = opts.autoresponse;
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(C.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || String(j.success) !== "true") throw new Error(j.message || "Email service error " + r.status);
      return true;
    } finally { clearTimeout(tm); }
  }

  async function storeIt(type, ref, fields) {
    const f = await VS.fb(); if (!f) throw new Error("firebase off");
    const u = await VS.ensureUser();
    await f.m.addDoc(f.m.collection(f.db, "requests"), {
      type, ref, status: "new", data: fields, uid: u ? u.uid : null,
      page: location.pathname.split("/").pop() || "index.html", at: f.m.serverTimestamp(),
    });
    return true;
  }

  // Returns {ref, emailed, stored, ok}
  VS.submitRequest = async (type, fields, opts) => {
    opts = opts || {};
    const ref = opts.ref || VS.makeRef(opts.prefix);
    if (fields._honey) return { ref, ok: true, emailed: false, stored: false }; // bot trap
    delete fields._honey;
    const clean = {};
    Object.keys(fields).forEach((k) => { if (fields[k] !== "" && fields[k] != null) clean[k] = String(fields[k]).slice(0, 4000); });
    const [e, s] = await Promise.allSettled([
      opts.noEmail ? Promise.reject(new Error("skip")) : emailIt(type, ref, clean, opts),
      opts.noStore ? Promise.reject(new Error("skip")) : storeIt(type, ref, clean),
    ]);
    if (e.status === "rejected" && !opts.noEmail) console.warn("Email delivery failed:", e.reason && e.reason.message);
    if (s.status === "rejected" && VS.fbOn()) console.warn("Storage failed:", s.reason && s.reason.message);
    if (clean.name) VS.store.set("name", clean.name);
    if (clean.email) VS.store.set("email", clean.email);
    if (clean.phone) VS.store.set("phone", clean.phone);
    return { ref, emailed: e.status === "fulfilled", stored: s.status === "fulfilled", ok: e.status === "fulfilled" || s.status === "fulfilled" };
  };

  // Prefill name/email/phone inputs from a previous submission (per-visitor convenience)
  VS.prefill = (map) => Object.keys(map).forEach((k) => { const el = map[k]; if (el && !el.value) el.value = VS.store.get(k); });

  /* ---------------- payments ---------------- */
  let qrP = null;
  const loadQR = () => qrP || (qrP = new Promise((res, rej) => { const s = document.createElement("script"); s.src = BASE + "vendor/qrcode.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); }));

  VS.paymentBlock = async (box, p) => {
    // p: {kind:'stay'|'passes'|'books', amount, method:'upi'|'card'|'netbanking'|'property', ref, name, email, phone}
    const amt = VS.inr(p.amount);
    const link = (C.paymentLinks || {})[p.kind];
    const wrap = document.createElement("div");
    if (p.method === "property") {
      wrap.innerHTML = `<p>You chose <b>pay at property</b> — settle ${amt} on arrival. We'll confirm availability by email/WhatsApp.</p>`;
    } else if (p.method === "upi" && C.upiId) {
      const url = `upi://pay?pa=${encodeURIComponent(C.upiId)}&pn=${encodeURIComponent(C.upiPayeeName || C.ownerName || "")}&am=${Number(p.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(p.ref)}`;
      wrap.innerHTML = `<p><b>Pay ${amt} by UPI</b> to complete your booking.</p>
        <div class="pay-box"><div class="qr" aria-label="UPI QR code"></div>
        <div><p style="margin:0 0 10px;">Scan with GPay, PhonePe, Paytm or any UPI app — or on your phone tap the button. UPI ID: <span class="ref-code">${esc(C.upiId)}</span></p>
        <div class="notice-actions" style="margin-top:0;"><a class="btn btn-solid" href="${url}">Open UPI app</a><button type="button" class="btn" data-paid>I've paid</button></div>
        <div data-utr hidden style="margin-top:12px;"><input class="vs-input" placeholder="UPI transaction / UTR number (optional)" maxlength="40" style="margin-bottom:8px;"><button type="button" class="btn btn-accent" data-utr-send>Confirm payment</button></div>
        </div></div>`;
      try { await loadQR(); const qr = window.qrcode(0, "M"); qr.addData(url); qr.make(); wrap.querySelector(".qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
      catch (e) { wrap.querySelector(".qr").remove(); }
      wrap.querySelector("[data-paid]").addEventListener("click", () => { wrap.querySelector("[data-utr]").hidden = false; });
      wrap.querySelector("[data-utr-send]").addEventListener("click", async (ev) => {
        const b = ev.currentTarget; b.disabled = true; b.textContent = "Sending…";
        const utr = wrap.querySelector("[data-utr] input").value.trim();
        await VS.submitRequest("payment", { name: p.name, email: p.email, phone: p.phone, booking_ref: p.ref, amount: amt, method: "UPI", utr }, { ref: p.ref + "-P", subject: "Payment made — " + p.ref + " (" + amt + ")" });
        wrap.querySelector("[data-utr]").innerHTML = `<p>✓ Thank you — payment noted against <span class="ref-code">${esc(p.ref)}</span>. We'll verify it and confirm by email.</p>`;
      });
    } else if ((p.method === "card" || p.method === "netbanking" || p.method === "upi") && link) {
      wrap.innerHTML = `<p><b>Pay ${amt} securely online.</b> Please enter the amount and your reference <span class="ref-code">${esc(p.ref)}</span> on the payment page.</p>
        <div class="notice-actions"><a class="btn btn-solid" href="${esc(link)}" target="_blank" rel="noopener">Pay ${amt} now →</a></div>`;
    } else {
      wrap.innerHTML = `<p>We'll send you a secure payment link for <b>${amt}</b> by email/WhatsApp within 24 hours. Nothing is charged until you pay through that link.</p>`;
    }
    box.appendChild(wrap);
  };

  // Render the standard result notice under a form.
  VS.showResult = (box, res, o) => {
    // o: {okTitle, okText, summary (plain text for WhatsApp/email fallback), subject, payment}
    box.style.display = "block";
    box.className = "notice " + (res.ok ? "ok" : "err");
    if (res.ok) {
      box.innerHTML = `<p><b>✓ ${esc(o.okTitle || "Received")}</b> — your reference is <span class="ref-code">${esc(res.ref)}</span>. ${o.okText || ""}</p>`;
      if (o.payment) { const pay = document.createElement("div"); box.appendChild(pay); VS.paymentBlock(pay, Object.assign({ ref: res.ref }, o.payment)); }
      const act = document.createElement("div"); act.className = "notice-actions";
      act.innerHTML = `<a class="btn" href="${VS.waLink(o.summary + "\nRef: " + res.ref)}" target="_blank" rel="noopener">Questions? WhatsApp us</a>`;
      box.appendChild(act);
    } else {
      box.innerHTML = `<p><b>We couldn't send this automatically.</b> Please send it on WhatsApp or by email instead — your details are already filled in.</p>
        <div class="notice-actions"><a class="btn btn-solid" href="${VS.waLink(o.summary)}" target="_blank" rel="noopener">Send on WhatsApp</a><a class="btn" href="${VS.mailLink(o.subject || "Website enquiry", o.summary)}">Send by email</a></div>`;
    }
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // Disable a button while a promise runs.
  VS.busy = async (btn, label, fn) => {
    const old = btn.textContent; btn.disabled = true; btn.textContent = label || "Sending…";
    try { return await fn(); } finally { btn.disabled = false; btn.textContent = old; }
  };

  /* ---------------- comments ---------------- */
  // el: container (emptied). key: unique thread id. opts: {placeholder, compact}
  VS.mountComments = (el, key, opts) => {
    opts = opts || {};
    key = VS.key(key);
    if (el._vsMounted) return; el._vsMounted = true;
    el.classList.add("cm");
    const live = VS.fbOn();
    el.innerHTML = `${live ? '<div class="cm-list" aria-live="polite"><div class="cm-empty">Loading comments…</div></div>' : ""}
      <form class="cm-form" novalidate>
        <input class="vs-input" name="name" placeholder="Your name" maxlength="60" autocomplete="name">
        <textarea class="vs-input" name="text" placeholder="${esc(opts.placeholder || "Share your thoughts…")}" maxlength="1000"></textarea>
        <input class="hp-field" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button class="btn btn-accent" type="submit">Post</button>
      </form>
      <div class="cm-msg">${live ? "" : "Your comment goes straight to Vishal by email."}</div>`;
    const form = el.querySelector("form"), msg = el.querySelector(".cm-msg"), list = el.querySelector(".cm-list");
    form.name.value = VS.store.get("name");
    const refill = () => { if (!form.name.value) form.name.value = VS.store.get("name"); };
    form.text.addEventListener("focus", refill);
    let me = null, admin = false;

    if (live) {
      VS.fb().then(async (f) => {
        if (!f) { list.innerHTML = '<div class="cm-empty">Comments are unavailable right now.</div>'; return; }
        f.m.onAuthStateChanged(f.auth, (u) => { me = u; admin = VS.isAdmin(u); if (u && !u.isAnonymous && u.displayName && !form.name.value) form.name.value = u.displayName; render(); });
        const q = f.m.query(f.m.collection(f.db, "comments"), f.m.where("thread", "==", key), f.m.limit(300));
        f.m.onSnapshot(q, (snap) => { el._items = snap.docs.map((d) => Object.assign({ id: d.id }, d.data())).sort((a, b) => ms(a.at) - ms(b.at)); render(); },
          (err) => { console.warn(err); list.innerHTML = '<div class="cm-empty">Comments are unavailable right now.</div>'; });
        list.addEventListener("click", async (e) => {
          const b = e.target.closest(".cm-del"); if (!b) return;
          if (!confirmDel(b)) return;
          try { await f.m.deleteDoc(f.m.doc(f.db, "comments", b.dataset.id)); VS.toast("Comment removed"); } catch (err) { VS.toast("Couldn't remove that comment"); }
        });
      });
    }
    function confirmDel(b) { if (b.dataset.armed) return true; b.dataset.armed = 1; b.textContent = "Delete?"; setTimeout(() => { delete b.dataset.armed; b.textContent = "✕"; }, 2500); return false; }
    function render() {
      if (!list || !el._items) return;
      const items = el._items;
      list.innerHTML = items.length ? items.map((c) => `<div class="cm-item${c.byOwner ? " owner" : ""}">
          <div class="cm-av">${esc(VS.initials(c.name))}</div>
          <div style="flex:1; min-width:0;"><div class="cm-head"><b>${esc(c.name)}</b>${c.byOwner ? '<span class="cm-badge">Author</span>' : ""}<span class="when">${VS.timeAgo(c.at)}</span>
          ${(admin || (me && c.uid === me.uid)) ? `<button class="cm-del" data-id="${c.id}" title="Delete" aria-label="Delete comment">✕</button>` : ""}</div>
          <div class="cm-text">${esc(c.text)}</div></div></div>`).join("") : '<div class="cm-empty">No comments yet — be the first.</div>';
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form._honey.value) return;
      refill();
      const err = VS.validate([{ el: form.name, req: true, label: "Your name" }, { el: form.text, req: true, label: "Comment" }]);
      if (err) { msg.textContent = err; return; }
      const name = form.name.value.trim().slice(0, 60), text = form.text.value.trim().slice(0, 1000);
      const btn = form.querySelector("button");
      await VS.busy(btn, "Posting…", async () => {
        if (live) {
          try {
            const f = await VS.fb(); const u = await VS.ensureUser();
            await f.m.addDoc(f.m.collection(f.db, "comments"), { thread: key, page: location.pathname.split("/").pop() || "index.html", name, text, uid: u.uid, byOwner: VS.isAdmin(u), at: f.m.serverTimestamp() });
            VS.store.set("name", name); form.text.value = ""; msg.textContent = "";
          } catch (er) { console.warn(er); msg.textContent = "Couldn't post just now — please try again."; }
        } else {
          const r = await VS.submitRequest("comment", { name, comment: text, on: opts.label || key }, { subject: "New comment on " + (opts.label || key) });
          msg.textContent = r.ok ? "✓ Thanks — your comment was sent to Vishal." : "Couldn't send just now — please try again.";
          if (r.ok) form.text.value = "";
        }
      });
    });
  };

  /* ---------------- likes ---------------- */
  // btn: element; key: unique id; label(count, liked) -> html
  VS.mountLike = (btn, key, label) => {
    key = VS.key(key);
    if (!VS.fbOn()) { btn.hidden = true; btn.style.display = "none"; return; }
    btn.classList.add("like-btn"); btn.setAttribute("role", "button"); btn.tabIndex = 0;
    let count = 0, liked = false, busy = false, f, u;
    const paint = () => { btn.innerHTML = label(count, liked); btn.classList.toggle("liked", liked); btn.setAttribute("aria-pressed", liked ? "true" : "false"); };
    paint();
    (async () => {
      f = await VS.fb(); if (!f) { btn.style.display = "none"; return; }
      try {
        const c = await f.m.getCountFromServer(f.m.query(f.m.collection(f.db, "likes"), f.m.where("item", "==", key)));
        count = c.data().count;
        await f.auth.authStateReady();
        if (f.auth.currentUser) { const d = await f.m.getDoc(f.m.doc(f.db, "likes", key + "__" + f.auth.currentUser.uid)); liked = d.exists(); }
        paint();
      } catch (e) { console.warn(e); }
    })();
    const toggle = async () => {
      if (busy || !f) return; busy = true;
      try {
        u = await VS.ensureUser();
        const ref = f.m.doc(f.db, "likes", key + "__" + u.uid);
        if (liked) { await f.m.deleteDoc(ref); liked = false; count = Math.max(0, count - 1); }
        else { await f.m.setDoc(ref, { item: key, uid: u.uid, at: f.m.serverTimestamp() }); liked = true; count++; }
        paint();
      } catch (e) { console.warn(e); VS.toast("Couldn't save that — try again"); }
      busy = false;
    };
    btn.addEventListener("click", toggle);
    btn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  };

  /* ---------------- lightbox ---------------- */
  VS.lightbox = (imgs) => {
    imgs = Array.from(imgs); if (!imgs.length) return;
    let lb = document.querySelector(".vs-lightbox"), i = 0, set = imgs;
    if (!lb) {
      lb = document.createElement("div"); lb.className = "vs-lightbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Image viewer");
      lb.innerHTML = '<button class="lb-close" aria-label="Close">✕</button><button class="lb-prev" aria-label="Previous">‹</button><img alt=""><div class="cap"></div><button class="lb-next" aria-label="Next">›</button>';
      document.body.appendChild(lb);
      lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lb-close")) close(); });
      lb.querySelector(".lb-prev").addEventListener("click", () => show(i - 1));
      lb.querySelector(".lb-next").addEventListener("click", () => show(i + 1));
      document.addEventListener("keydown", (e) => { if (!lb.classList.contains("open")) return; if (e.key === "Escape") close(); if (e.key === "ArrowLeft") show(i - 1); if (e.key === "ArrowRight") show(i + 1); });
    }
    function visible() { return set.filter((im) => im.offsetParent !== null); }
    function show(n) { const v = visible(); if (!v.length) return; i = (n + v.length) % v.length; const im = v[i]; lb.querySelector("img").src = im.dataset.full || im.currentSrc || im.src; lb.querySelector("img").alt = im.alt; lb.querySelector(".cap").textContent = im.alt; }
    function close() { lb.classList.remove("open"); document.body.style.overflow = ""; }
    imgs.forEach((im) => { im.classList.add("zoomable"); im.addEventListener("click", () => { set = imgs; const v = visible(); show(v.indexOf(im)); lb.classList.add("open"); document.body.style.overflow = "hidden"; }); });
  };
})();
