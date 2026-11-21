// Shared server logic for book sales (Netlify Functions, Node 18+).
// Secrets live in Netlify environment variables — never in the website files:
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, ADMIN_PASSWORD
//   optional: BREVO_API_KEY + EMAIL_FROM (buyer emails), OWNER_EMAIL, SITE_URL
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import catalog from "../../catalog.json" with { type: "json" };

export { catalog };
const env = (k, d = "") => (process.env[k] || d).trim();
export const OWNER_EMAIL = () => env("OWNER_EMAIL", "p.svishal@gmail.com");

/* ---------------- responses ---------------- */
export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: Object.assign({ "Content-Type": "application/json", "Cache-Control": "no-store" }, headers) });
export const fail = (status, error, message) => json({ error, message: message || error }, status);

/* ---------------- money ---------------- */
export const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const book = (id) => catalog.books.find((b) => b.id === id);
export const getBook = book;

// Server-side price calculation. The browser only says WHAT it wants; prices come from catalog.json.
export function quote(items) {
  if (catalog.shopOpen !== true) { const e = new Error("Buying on this website opens soon."); e.closed = true; throw e; }
  if (!Array.isArray(items) || !items.length || items.length > 30) throw new Error("Your cart is empty.");
  const lines = [], seen = new Set();
  for (const it of items) {
    const b = book(String(it.id || "")); const fmtKey = String(it.format || "");
    const f = b && b.status === "sale" && b.formats && b.formats[fmtKey];
    if (!f || !["available", "preorder"].includes(f.status)) throw new Error("One of the books in your cart isn't available any more. Please refresh the page.");
    const k = b.id + ":" + fmtKey; if (seen.has(k)) continue; seen.add(k);
    let qty = Math.floor(Number(it.qty) || 1);
    if (fmtKey === "ebook") qty = 1;
    if (qty < 1 || qty > (catalog.maxQtyPerItem || 10)) throw new Error("Quantity must be between 1 and " + (catalog.maxQtyPerItem || 10) + ".");
    const unit = Number(f.price.INR);
    if (!(unit > 0)) throw new Error("Price missing for " + b.title);
    lines.push({ bookId: b.id, title: b.title, format: fmtKey, formatLabel: f.label, availability: f.status, qty, unit, line: unit * qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.line, 0);
  const hasPrint = lines.some((l) => l.format !== "ebook"); // paperback or hardcover
  const sh = catalog.shipping || {};
  const shipping = hasPrint && !(sh.freeAbove && subtotal >= sh.freeAbove) ? Number(sh.flat || 0) : 0;
  const total = subtotal + shipping;
  return { lines, subtotal, shipping, total, hasPrint, amountMinor: Math.round(total * 100), currency: "INR" };
}

/* ---------------- validation ---------------- */
const clip = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
export function cleanCustomer(c) {
  c = c || {};
  const out = { name: clip(c.name, 80), email: clip(c.email, 120).toLowerCase(), phone: clip(c.phone, 20) };
  if (!out.name) throw new Error("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(out.email)) throw new Error("Please enter a valid email address.");
  if (out.phone.replace(/\D/g, "").length < 10) throw new Error("Please enter a valid 10-digit mobile number.");
  return out;
}
export function cleanAddress(a) {
  a = a || {};
  const out = { line1: clip(a.line1, 120), line2: clip(a.line2, 120), city: clip(a.city, 60), state: clip(a.state, 60), pincode: clip(a.pincode, 6), country: "India" };
  if (!out.line1 || !out.city || !out.state) throw new Error("Please complete your delivery address.");
  if (!/^[1-9]\d{5}$/.test(out.pincode)) throw new Error("Please enter a valid 6-digit PIN code.");
  return out;
}

/* ---------------- crypto ---------------- */
export const token = (bytes = 24) => crypto.randomBytes(bytes).toString("base64url");
export const hmac = (data, secret) => crypto.createHmac("sha256", secret).update(data).digest("hex");
export function safeEqual(a, b) {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export const newOrderId = () => "VS" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();

/* ---------------- storage (Netlify Blobs; local folder for testing) ---------------- */
let _store = null;
async function store() {
  if (_store) return _store;
  const dir = env("LOCAL_STORE_DIR");
  if (dir) {
    fs.mkdirSync(dir, { recursive: true });
    const f = (k) => path.join(dir, encodeURIComponent(k) + ".json");
    _store = {
      get: async (k) => (fs.existsSync(f(k)) ? JSON.parse(fs.readFileSync(f(k), "utf8")) : null),
      set: async (k, v) => fs.writeFileSync(f(k), JSON.stringify(v)),
      list: async (prefix) => fs.readdirSync(dir).map((n) => decodeURIComponent(n.replace(/\.json$/, ""))).filter((k) => k.startsWith(prefix)),
    };
  } else {
    const { getStore } = await import("@netlify/blobs");
    const s = getStore({ name: "book-orders", consistency: "strong" });
    _store = {
      get: (k) => s.get(k, { type: "json" }),
      set: (k, v) => s.setJSON(k, v),
      list: async (prefix) => (await s.list({ prefix })).blobs.map((b) => b.key),
    };
  }
  return _store;
}
export const db = {
  getOrder: async (id) => (await store()).get("order/" + id),
  saveOrder: async (o) => { o.updatedAt = new Date().toISOString(); return (await store()).set("order/" + o.id, o); },
  setIndex: async (k, v) => (await store()).set(k, v),
  getIndex: async (k) => (await store()).get(k),
  listOrders: async () => {
    const s = await store(); const keys = await s.list("order/");
    const all = await Promise.all(keys.map((k) => s.get(k)));
    return all.filter(Boolean).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  },
};

/* ---------------- Razorpay ---------------- */
export const rzpConfigured = () => !!(env("RAZORPAY_KEY_ID") && env("RAZORPAY_KEY_SECRET"));
export async function razorpay(method, p, body) {
  const base = env("RAZORPAY_API_BASE", "https://api.razorpay.com");
  const auth = Buffer.from(env("RAZORPAY_KEY_ID") + ":" + env("RAZORPAY_KEY_SECRET")).toString("base64");
  const r = await fetch(base + "/v1" + p, { method, headers: { Authorization: "Basic " + auth, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.description) || "Razorpay error " + r.status); e.status = r.status; throw e; }
  return j;
}

/* ---------------- e-books ---------------- */
// Which files a book's e-book has is declared in catalog.json: formats.ebook.files = ["epub", "pdf"].
// On Netlify the files are uploaded at deploy time from private/ebooks into private blob storage
// (see netlify.toml build command); locally they're read from private/ebooks.
export const ebookFiles = (bookId) => { const b = book(bookId); const f = b && b.formats && b.formats.ebook; return f && f.status === "available" && Array.isArray(f.files) ? f.files.filter((x) => x === "epub" || x === "pdf") : []; };
const ebookReady = (bookId) => ebookFiles(bookId).length > 0;
export function ebookPath(bookId, ext) {
  if (!/^[a-z0-9-]+$/.test(bookId)) return null;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const roots = [process.cwd(), process.env.LAMBDA_TASK_ROOT || "", path.resolve(here, "../.."), path.resolve(here, "..")].filter(Boolean);
  for (const r of roots) for (const x of ext ? ["." + ext] : [".epub", ".pdf"]) { const p = path.join(r, "private", "ebooks", bookId + x); if (fs.existsSync(p)) return p; }
  return null;
}
// Returns { body: ReadableStream, size? } or null.
export async function ebookStream(bookId, ext) {
  if (!/^[a-z0-9-]+$/.test(bookId) || !["epub", "pdf"].includes(ext)) return null;
  if (!env("LOCAL_STORE_DIR")) {
    try {
      const { getDeployStore } = await import("@netlify/blobs");
      for (const [store, key] of [[getDeployStore(), "ebooks/" + bookId + "." + ext], [getDeployStore("ebooks"), bookId + "." + ext]]) {
        const s = await store.get(key, { type: "stream" });
        if (s) return { body: s };
      }
    } catch (e) { console.error("blob read failed", e.message); }
  }
  const p = ebookPath(bookId, ext);
  if (!p) return null;
  const { Readable } = await import("node:stream");
  return { body: Readable.toWeb(fs.createReadStream(p)), size: fs.statSync(p).size };
}

/* ---------------- fulfilment ---------------- */
export const siteUrl = (req) => env("SITE_URL") || (req ? new URL(req.url).origin : "");

async function issueDownload(order, idx) {
  const it = order.items[idx];
  if (it.format !== "ebook" || it.token || !ebookReady(it.bookId)) return false;
  // Deterministic per order item, so concurrent confirmations (browser + webhook) produce the same link.
  const secret = env("DOWNLOAD_SECRET") || env("RAZORPAY_KEY_SECRET") || "dev-secret";
  it.token = Buffer.from(hmac(order.id + "|" + idx + "|" + it.bookId, secret), "hex").toString("base64url").slice(0, 32);
  it.downloads = 0; it.state = "ready";
  await db.setIndex("dl/" + it.token, { orderId: order.id, idx });
  return true;
}

// Idempotent: safe to call from both the browser verification and the webhook.
export async function markPaid(order, payment, source, req) {
  if (order.status === "paid") return { order, changed: false };
  order.status = "paid"; order.paidAt = new Date().toISOString();
  order.payment = { id: payment.id, method: payment.method || "", source };
  for (let i = 0; i < order.items.length; i++) {
    const it = order.items[i];
    if (it.format === "ebook") { if (!(await issueDownload(order, i))) it.state = "awaiting-launch"; }
    else it.state = it.availability === "preorder" ? "preorder" : "to-ship";
  }
  await db.saveOrder(order);
  await Promise.allSettled([emailBuyer(order, "paid", req), emailOwner(order, req)]);
  return { order, changed: true };
}

// After a book launches (status set to "available" + PDF added), send pending downloads.
export async function releaseEbooks(bookId, req) {
  let sent = 0;
  for (const o of await db.listOrders()) {
    if (o.status !== "paid") continue;
    let changed = false;
    for (let i = 0; i < o.items.length; i++) if (o.items[i].bookId === bookId && o.items[i].state === "awaiting-launch" && (await issueDownload(o, i))) changed = true;
    if (changed) { await db.saveOrder(o); await emailBuyer(o, "released", req); sent++; }
  }
  return sent;
}

export function publicOrder(o, req) {
  const base = siteUrl(req);
  return {
    id: o.id, status: o.status, createdAt: o.createdAt, paidAt: o.paidAt || null,
    customer: { name: o.customer.name, email: o.customer.email },
    address: o.address, subtotal: o.subtotal, shipping: o.shipping, total: o.total, currency: o.currency,
    shipment: o.shipment || null,
    items: o.items.map((it) => ({
      title: it.title, format: it.format, formatLabel: it.formatLabel, qty: it.qty, unit: it.unit, line: it.line, state: it.state || null,
      download: it.token ? base + "/api/download?t=" + it.token : null,
      files: it.token ? ebookFiles(it.bookId).map((x) => ({ type: x.toUpperCase(), url: base + "/api/download?t=" + it.token + "&f=" + x })) : [],
      downloadsLeft: it.token ? Math.max(0, (catalog.downloadLimit || 5) - (it.downloads || 0)) : null,
    })),
  };
}

/* ---------------- email (Brevo, optional) ---------------- */
async function sendEmail(to, subject, html) {
  const key = env("BREVO_API_KEY"), from = env("EMAIL_FROM");
  if (!key || !from) return false;
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST", headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sender: { email: from, name: env("EMAIL_FROM_NAME", "Vishal Singh") }, to: [{ email: to }], replyTo: { email: OWNER_EMAIL() }, subject, htmlContent: html }),
  });
  return r.ok;
}
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function itemsTable(o, req) {
  const p = publicOrder(o, req);
  return `<table cellpadding="8" style="border-collapse:collapse;width:100%;font-size:14px">${p.items.map((it) => `<tr style="border-bottom:1px solid #eee"><td><b>${esc(it.title)}</b><br><span style="color:#666">${esc(it.formatLabel)} × ${it.qty}</span>${it.files.length ? `<br>${it.files.map((f) => `<a href="${f.url}" style="color:#7A4FE0;font-weight:bold">Download ${f.type}</a>`).join(" &nbsp;·&nbsp; ")} <span style="color:#888">(${it.downloadsLeft} downloads left)</span>` : it.state === "awaiting-launch" ? '<br><span style="color:#888">E-book pre-order — download link emailed at launch</span>' : it.state === "preorder" ? '<br><span style="color:#888">Printed book pre-order — ships at launch</span>' : ""}</td><td align="right">${inr(it.line)}</td></tr>`).join("")}
  ${o.shipping ? `<tr><td>Shipping</td><td align="right">${inr(o.shipping)}</td></tr>` : ""}<tr><td><b>Total paid</b></td><td align="right"><b>${inr(o.total)}</b></td></tr></table>`;
}
export async function emailBuyer(o, kind, req) {
  const link = siteUrl(req) + "/order.html?id=" + encodeURIComponent(o.id) + "&k=" + encodeURIComponent(o.key);
  const head = { paid: "Thank you for your order", released: "Your e-book is ready to download", shipped: "Your books are on the way" }[kind] || "Order update";
  const extra = kind === "shipped" && o.shipment ? `<p>Courier: <b>${esc(o.shipment.courier)}</b><br>Tracking number: <b>${esc(o.shipment.tracking)}</b></p>` : "";
  return sendEmail(o.customer.email, `${head} — order ${o.id}`, `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222"><h2 style="font-family:Georgia,serif">${head}</h2><p>Hi ${esc(o.customer.name)},</p>${extra}${itemsTable(o, req)}<p><a href="${link}" style="color:#7A4FE0;font-weight:bold">View your order</a> any time.</p><p style="color:#666;font-size:13px">Questions? Just reply to this email.<br>— Vishal Singh</p></div>`);
}
async function emailOwner(o, req) {
  const addr = o.address ? `<p><b>Ship to:</b><br>${esc(o.customer.name)}, ${esc(o.customer.phone)}<br>${esc(o.address.line1)} ${esc(o.address.line2)}<br>${esc(o.address.city)}, ${esc(o.address.state)} ${esc(o.address.pincode)}</p>` : "";
  return sendEmail(OWNER_EMAIL(), `New book order ${o.id} — ${inr(o.total)}`, `<div style="font-family:Arial,sans-serif"><h3>New paid order ${o.id}</h3><p>${esc(o.customer.name)} · ${esc(o.customer.email)} · ${esc(o.customer.phone)}</p>${addr}${itemsTable(o, req)}<p><a href="${siteUrl(req)}/admin-orders.html">Open book orders</a></p></div>`);
}
