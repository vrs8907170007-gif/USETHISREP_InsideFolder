/* Talk2Me — live member chat (Firebase Auth + Firestore). */
(function () {
  const VS = window.VS, C = VS.cfg, esc = VS.esc;
  const $ = (id) => document.getElementById(id);
  const TOPICS = [
    ["topic_consciousness", "Consciousness", "◎"],
    ["topic_faith", "Faith & doubt", "✦"],
    ["topic_pandora", "Building Pandora City", "PC"],
    ["topic_fyre", "Forever FYRE culture", "FF"],
    ["topic_writing", "Writing & publishing", "✎"],
    ["topic_hello", "Just saying hello", "👋"],
  ];
  const GRAD = { topic_pandora: "var(--emerald)", topic_fyre: "var(--flame)" };

  function show(id) { document.querySelectorAll("#room .view").forEach((v) => v.classList.toggle("on", v.id === id)); }

  // topic chips below the room
  $("topicStrip").innerHTML = TOPICS.map(([id, t]) => `<button type="button" class="topic-chip" data-topic="${id}">${esc(t)}</button>`).join("");

  /* -------- Not configured: email fallback -------- */
  function initOffline() {
    show("vOffline");
    $("heroCta").textContent = "Send me a message";
    VS.prefill({ name: $("offName"), email: $("offEmail") });
    document.querySelectorAll(".topic-chip").forEach((c) => c.addEventListener("click", () => { $("offMsg").value = "Topic: " + c.textContent + "\n\n" + $("offMsg").value.replace(/^Topic: .*\n\n/, ""); $("room").scrollIntoView({ behavior: "smooth" }); $("offMsg").focus(); }));
    $("offForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = VS.validate([{ el: $("offName"), req: true, label: "Your name" }, { el: $("offEmail"), req: true, type: "email", label: "Email" }, { el: $("offMsg"), req: true, label: "Message" }]);
      const box = $("offResult");
      if (err) { box.style.display = "block"; box.className = "notice err"; box.textContent = err; return; }
      const f = { name: $("offName").value.trim(), email: $("offEmail").value.trim(), message: $("offMsg").value.trim(), _honey: $("offHoney").value };
      const btn = e.submitter || $("offForm").querySelector("button");
      const res = await VS.busy(btn, "Sending…", () => VS.submitRequest("talk2me", f, { prefix: "T2M", subject: "Talk2Me message from " + f.name, autoresponse: "Thank you for writing to me on Talk2Me. I read every message myself and will reply to this email soon. — Vishal Singh" }));
      VS.showResult(box, res, { okTitle: "Message sent", okText: "I'll reply to your email soon.", summary: `Talk2Me message\nName: ${f.name}\nEmail: ${f.email}\n\n${f.message}`, subject: "Talk2Me message" });
      if (res.ok) $("offMsg").value = "";
    });
  }
  if (!VS.fbOn()) { initOffline(); return; }

  /* -------- Live mode -------- */
  show("vLoading");
  let F, me = null, admin = false, current = null, unsubMsgs = null, unsubSide = [], profileName = "";
  const AUTH_ERR = {
    "auth/email-already-in-use": "An account with this email already exists — try signing in instead.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found": "No account found with this email.",
    "auth/weak-password": "Please choose a password of at least 8 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts — please wait a few minutes and try again.",
    "auth/network-request-failed": "Network problem — check your connection and try again.",
    "auth/operation-not-allowed": "Sign-up isn't switched on yet. Please try again later.",
    "auth/admin-restricted-operation": "This sign-in method isn't switched on yet.",
  };
  const authErr = (e) => AUTH_ERR[e && e.code] || "Something went wrong — please try again.";
  const note = (box, cls, html) => { box.style.display = "block"; box.className = "notice " + cls; box.innerHTML = html; };

  /* auth form */
  let mode = "signup";
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".auth-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.mode === m));
    document.querySelectorAll("#authForm [data-only]").forEach((el) => (el.style.display = el.dataset.only === m ? "" : "none"));
    $("authBtn").textContent = m === "signup" ? "Create my account" : "Sign in";
    $("aPass").autocomplete = m === "signup" ? "new-password" : "current-password";
    $("authMsg").style.display = "none";
  }
  document.querySelectorAll(".auth-tabs button").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  setMode("signup");
  VS.prefill({ name: $("aName"), email: $("aEmail") });

  $("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const rules = [{ el: $("aEmail"), req: true, type: "email", label: "Email" }, { el: $("aPass"), req: true, label: "Password" }];
    if (mode === "signup") rules.unshift({ el: $("aName"), req: true, label: "Your name" });
    const err = VS.validate(rules);
    if (err) return note($("authMsg"), "err", esc(err));
    if (mode === "signup" && $("aPass").value.length < 8) { $("aPass").classList.add("is-invalid"); return note($("authMsg"), "err", "Please choose a password of at least 8 characters."); }
    const email = $("aEmail").value.trim(), pass = $("aPass").value;
    await VS.busy($("authBtn"), mode === "signup" ? "Creating…" : "Signing in…", async () => {
      try {
        if (mode === "signup") {
          const name = $("aName").value.trim().slice(0, 80);
          profileName = name;
          const cred = await F.m.createUserWithEmailAndPassword(F.auth, email, pass);
          await F.m.updateProfile(cred.user, { displayName: name });
          await F.m.setDoc(F.m.doc(F.db, "users", cred.user.uid), { name, email, about: $("aAbout").value.trim().slice(0, 500), createdAt: F.m.serverTimestamp() });
          try { await F.m.sendEmailVerification(cred.user); } catch (er) { console.warn(er); }
          VS.store.set("name", name); VS.store.set("email", email);
          route(cred.user);
          VS.submitRequest("talk2me", { name, email, note: "New Talk2Me member signed up", about: $("aAbout").value.trim() }, { noStore: true, subject: "New Talk2Me member: " + name });
        } else {
          const cred = await F.m.signInWithEmailAndPassword(F.auth, email, pass);
          route(cred.user);
        }
      } catch (er) { console.warn(er); note($("authMsg"), "err", esc(authErr(er))); }
    });
  });
  $("forgotBtn").addEventListener("click", async () => {
    const err = VS.validate([{ el: $("aEmail"), req: true, type: "email", label: "Email" }]);
    if (err) return note($("authMsg"), "err", "Enter your email above first, then tap “Forgot password?”.");
    try { await F.m.sendPasswordResetEmail(F.auth, $("aEmail").value.trim()); note($("authMsg"), "ok", "If an account exists for that email, a reset link is on its way."); }
    catch (er) { note($("authMsg"), "err", esc(authErr(er))); }
  });

  /* verify view */
  $("verifiedBtn").addEventListener("click", () => VS.busy($("verifiedBtn"), "Checking…", async () => {
    await F.m.reload(F.auth.currentUser);
    if (F.auth.currentUser.emailVerified) { await F.auth.currentUser.getIdToken(true); route(F.auth.currentUser); }
    else note($("verifyMsg"), "err", "Not confirmed yet — open the link in the email we sent, then try again.");
  }));
  $("resendBtn").addEventListener("click", () => VS.busy($("resendBtn"), "Sending…", async () => {
    try { await F.m.sendEmailVerification(F.auth.currentUser); note($("verifyMsg"), "ok", "Sent again — check your inbox and spam folder."); }
    catch (er) { note($("verifyMsg"), "err", esc(authErr(er))); }
  }));
  const doSignOut = async () => { stopAll(); await F.m.signOut(F.auth); };
  $("vSignOut").addEventListener("click", doSignOut);
  $("signOutBtn").addEventListener("click", doSignOut);

  /* -------- routing -------- */
  function stopAll() { if (unsubMsgs) unsubMsgs(); unsubMsgs = null; unsubSide.forEach((u) => u()); unsubSide = []; current = null; }
  function route(u) {
    if (!u || u.isAnonymous) { stopAll(); me = null; show("vGate"); $("heroCta").textContent = "Join the room"; return; }
    if (!u.emailVerified) { stopAll(); me = u; $("vEmail").textContent = u.email; show("vVerify"); return; }
    if (me && me.uid === u.uid && $("vRoom").classList.contains("on")) return;
    stopAll(); me = u; admin = VS.isAdmin(u);
    $("meName").textContent = u.displayName || profileName || u.email;
    $("meRole").textContent = admin ? "· Owner" : "";
    $("adminLink").hidden = !admin;
    $("heroCta").textContent = "Open the room";
    show("vRoom");
    buildSidebar();
    const want = (location.hash.match(/#(topic_[a-z]+)/) || [])[1];
    if (want) open(want); else if (!admin) open("dm_" + u.uid); else showEmpty("Pick a conversation from your inbox, or open a room.");
  }

  /* -------- sidebar -------- */
  const state = { dms: [], topics: {}, myDm: null };
  function buildSidebar() {
    // topic previews
    TOPICS.forEach(([id]) => unsubSide.push(F.m.onSnapshot(F.m.doc(F.db, "threads", id), (d) => { state.topics[id] = d.exists() ? d.data() : null; renderSidebar(); }, () => {})));
    if (admin) {
      unsubSide.push(F.m.onSnapshot(F.m.query(F.m.collection(F.db, "threads"), F.m.where("type", "==", "dm")), (snap) => {
        state.dms = snap.docs.map((d) => Object.assign({ id: d.id }, d.data())).sort((a, b) => VS.ms(b.lastAt) - VS.ms(a.lastAt));
        renderSidebar();
      }, (e) => console.warn(e)));
    } else {
      unsubSide.push(F.m.onSnapshot(F.m.doc(F.db, "threads", "dm_" + me.uid), (d) => { state.myDm = d.exists() ? d.data() : null; renderSidebar(); }, () => {}));
    }
    renderSidebar();
  }
  function item(id, name, preview, tav, unread, grad) {
    return `<div class="thread${current === id ? " active" : ""}" data-id="${id}" role="button" tabindex="0">
      <div class="tav"${grad ? ` style="background:linear-gradient(135deg,${grad},var(--gold));"` : ""}>${esc(tav)}</div>
      <div class="meta"><div class="thread-name">${esc(name)}</div><div class="thread-preview">${esc(preview || "")}</div></div>${unread ? '<span class="unread" title="Unread"></span>' : ""}</div>`;
  }
  function renderSidebar() {
    let h = "";
    if (admin) {
      h += `<div class="sidebar-head">Inbox · ${state.dms.length}</div>`;
      h += state.dms.length ? state.dms.map((t) => item(t.id, t.ownerName || "Member", t.lastText, VS.initials(t.ownerName), t.unreadAdmin)).join("") : '<div class="thread-preview" style="padding:0 20px 10px;">No private messages yet.</div>';
    } else {
      h += `<div class="sidebar-head">Private</div>`;
      h += item("dm_" + me.uid, C.ownerName || "Vishal Singh", state.myDm ? state.myDm.lastText : "Start a private conversation", "VS", state.myDm && state.myDm.unreadOwner);
    }
    h += `<div class="sidebar-head" style="margin-top:18px;">Open rooms</div>`;
    h += TOPICS.map(([id, name, tav]) => item(id, name, state.topics[id] ? state.topics[id].lastText : "Be the first to post", tav, false, GRAD[id] || "#555")).join("");
    $("sidebar").innerHTML = h;
  }
  $("sidebar").addEventListener("click", (e) => { const t = e.target.closest(".thread"); if (t) open(t.dataset.id); });
  $("sidebar").addEventListener("keydown", (e) => { const t = e.target.closest(".thread"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(t.dataset.id); } });
  document.querySelectorAll(".topic-chip").forEach((c) => c.addEventListener("click", () => {
    if (me && me.emailVerified) { open(c.dataset.topic); $("room").scrollIntoView({ behavior: "smooth" }); }
    else { location.hash = c.dataset.topic; $("room").scrollIntoView({ behavior: "smooth" }); VS.toast("Create an account or sign in to join this room"); }
  }));

  /* -------- conversation -------- */
  function showEmpty(text) { $("log").innerHTML = `<div class="chat-empty">${esc(text)}</div>`; $("msgInput").disabled = true; $("sendBtn").disabled = true; }
  function headerFor(id) {
    const topic = TOPICS.find((t) => t[0] === id);
    if (topic) return { tav: topic[2], name: topic[1], sub: "Open room · visible to all members", tag: "Open room", grad: GRAD[id] || "#555" };
    if (admin) { const t = state.dms.find((d) => d.id === id) || {}; return { tav: VS.initials(t.ownerName), name: t.ownerName || "Member", sub: t.ownerEmail || "", tag: "Private" }; }
    return { tav: "VS", name: C.ownerName || "Vishal Singh", sub: "● Usually replies within a day", tag: "Private" };
  }
  function open(id) {
    if (!me) return;
    current = id;
    const hd = headerFor(id);
    $("chTav").textContent = hd.tav; $("chTav").style.background = hd.grad ? `linear-gradient(135deg,${hd.grad},var(--gold))` : "";
    $("chName").textContent = hd.name; $("chSub").textContent = hd.sub; $("chTag").textContent = hd.tag;
    $("msgInput").disabled = false; $("sendBtn").disabled = false;
    $("msgInput").placeholder = id.startsWith("dm_") && !admin ? "Write to Vishal…" : "Write a message…";
    renderSidebar();
    if (unsubMsgs) unsubMsgs();
    $("log").innerHTML = '<div class="chat-empty">Loading…</div>';
    const q = F.m.query(F.m.collection(F.db, "threads", id, "messages"), F.m.orderBy("at", "desc"), F.m.limit(200));
    unsubMsgs = F.m.onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => Object.assign({ id: d.id }, d.data({ serverTimestamps: "estimate" }))).reverse();
      renderMsgs(id, msgs);
    }, (e) => { console.warn(e); $("log").innerHTML = '<div class="chat-empty">Couldn\'t open this conversation. Please refresh and try again.</div>'; });
    markRead(id);
  }
  function markRead(id) {
    if (!id.startsWith("dm_")) return;
    const field = admin ? "unreadAdmin" : "unreadOwner";
    const t = admin ? state.dms.find((d) => d.id === id) : state.myDm;
    if (t && t[field]) F.m.setDoc(F.m.doc(F.db, "threads", id), { [field]: false }, { merge: true }).catch(() => {});
  }
  function renderMsgs(id, msgs) {
    if (id !== current) return;
    const log = $("log");
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    if (!msgs.length) {
      log.innerHTML = `<div class="chat-empty">${id.startsWith("dm_") ? (admin ? "No messages in this conversation." : "This is your private thread with Vishal. Say hello — he reads every message himself.") : "No one has posted in this room yet. Start the conversation."}</div>`;
      return;
    }
    let lastDay = "", h = "";
    msgs.forEach((m) => {
      const d = new Date(VS.ms(m.at));
      const day = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      if (day !== lastDay) { h += `<div class="day-sep">${day}</div>`; lastDay = day; }
      const mine = m.uid === me.uid;
      const showName = !mine && (id.startsWith("topic_") || m.byOwner);
      const t = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
      h += `<div class="bubble ${mine ? "me" : "them"}">${showName ? `<span class="who">${esc(m.byOwner ? (C.ownerName || "Vishal") + " · Author" : m.name)}</span>` : ""}${esc(m.text)}<span class="t">${mine ? "You" : esc(m.byOwner ? "Vishal" : m.name)} · ${t}</span>${(admin || mine) ? `<button class="del" data-mid="${m.id}" title="Delete" aria-label="Delete message">✕</button>` : ""}</div>`;
    });
    log.innerHTML = h;
    if (atBottom || log._first !== id) { log.scrollTop = log.scrollHeight; log._first = id; }
    markRead(id);
  }
  $("log").addEventListener("click", async (e) => {
    const b = e.target.closest(".del"); if (!b || !current) return;
    if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Delete?"; b.style.opacity = 1; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "✕"; } }, 2500); return; }
    try { await F.m.deleteDoc(F.m.doc(F.db, "threads", current, "messages", b.dataset.mid)); } catch (er) { VS.toast("Couldn't delete that message"); }
  });

  async function send() {
    const input = $("msgInput"); const text = input.value.trim();
    if (!text || !current || !me) return;
    const id = current, isDm = id.startsWith("dm_");
    const name = (me.displayName || profileName || me.email.split("@")[0]).slice(0, 80);
    input.value = ""; input.style.height = "";
    try {
      await F.m.addDoc(F.m.collection(F.db, "threads", id, "messages"), { uid: me.uid, name, text: text.slice(0, 2000), byOwner: admin, at: F.m.serverTimestamp() });
      const meta = { lastText: text.slice(0, 120), lastAt: F.m.serverTimestamp(), lastBy: name };
      if (isDm) {
        if (admin) Object.assign(meta, { unreadOwner: true, unreadAdmin: false });
        else {
          const wasUnread = state.myDm && state.myDm.unreadAdmin;
          Object.assign(meta, { type: "dm", ownerUid: me.uid, ownerName: name, ownerEmail: me.email, unreadAdmin: true, unreadOwner: false });
          // email Vishal when a new unread conversation starts (not for every message)
          if (!wasUnread) VS.submitRequest("talk2me", { name, email: me.email, message: text }, { noStore: true, subject: "New Talk2Me message from " + name });
        }
      } else Object.assign(meta, { type: "topic", title: (TOPICS.find((t) => t[0] === id) || [])[1] || id });
      await F.m.setDoc(F.m.doc(F.db, "threads", id), meta, { merge: true });
    } catch (er) {
      console.warn(er); input.value = text;
      VS.toast(er && er.code === "permission-denied" ? "Please confirm your email first, then try again" : "Message not sent — check your connection");
    }
  }
  $("sendForm").addEventListener("submit", (e) => { e.preventDefault(); send(); });
  $("msgInput").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
  $("msgInput").addEventListener("input", (e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(140, e.target.scrollHeight) + "px"; });

  /* -------- boot -------- */
  VS.fb().then((f) => {
    if (!f) { initOffline(); return; }
    F = f;
    F.m.onAuthStateChanged(F.auth, (u) => route(u));
  });
})();
