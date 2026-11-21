// /api/admin-orders — owner only (Authorization: Bearer <ADMIN_PASSWORD>).
import { db, safeEqual, releaseEbooks, emailBuyer, publicOrder, json, fail } from "../lib/shop.mjs";

export default async (req) => {
  const pw = process.env.ADMIN_PASSWORD || "";
  const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (pw.length < 8 || !safeEqual(pw, given)) { await new Promise((r) => setTimeout(r, 800)); return fail(401, "unauthorized", "Wrong password."); }
  if (req.method === "GET") {
    const orders = (await db.listOrders()).map((o) => Object.assign(publicOrder(o, req), { customer: o.customer, payment: o.payment || null, note: o.note || "", lastError: o.lastError || "" }));
    return json({ orders });
  }
  if (req.method !== "POST") return fail(405, "method-not-allowed");
  let b; try { b = await req.json(); } catch { return fail(400, "bad-request"); }
  if (b.action === "release") return json({ ok: true, emailed: await releaseEbooks(String(b.bookId || ""), req) });
  const o = await db.getOrder(String(b.id || ""));
  if (!o) return fail(404, "not-found");
  if (b.action === "ship") {
    if (o.status !== "paid") return fail(400, "not-paid", "Only paid orders can be shipped.");
    o.shipment = { courier: String(b.courier || "").slice(0, 60), tracking: String(b.tracking || "").slice(0, 80), shippedAt: new Date().toISOString() };
    o.items.forEach((it) => { if (it.format !== "ebook") it.state = "shipped"; });
    await db.saveOrder(o); await emailBuyer(o, "shipped", req);
  } else if (b.action === "delivered") { o.items.forEach((it) => { if (it.format !== "ebook") it.state = "delivered"; }); await db.saveOrder(o); }
  else if (b.action === "refunded") { o.status = "refunded"; await db.saveOrder(o); }
  else if (b.action === "note") { o.note = String(b.note || "").slice(0, 500); await db.saveOrder(o); }
  else if (b.action === "resend") { await emailBuyer(o, "paid", req); }
  else return fail(400, "unknown-action");
  return json({ ok: true });
};
export const config = { path: "/api/admin-orders" };
