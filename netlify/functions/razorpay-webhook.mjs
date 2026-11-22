// POST /api/razorpay-webhook — backup confirmation straight from Razorpay (works even if the buyer closed the tab).
import { db, hmac, safeEqual, markPaid, json, fail } from "../lib/shop.mjs";

export default async (req) => {
  if (req.method !== "POST") return fail(405, "method-not-allowed");
  const raw = await req.text();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  if (!secret || !safeEqual(hmac(raw, secret), req.headers.get("x-razorpay-signature"))) return fail(401, "bad-signature");
  let ev; try { ev = JSON.parse(raw); } catch { return fail(400, "bad-request"); }
  const pay = ev.payload && ev.payload.payment && ev.payload.payment.entity;
  const rzpOrderId = (pay && pay.order_id) || (ev.payload && ev.payload.order && ev.payload.order.entity.id);
  const idx = rzpOrderId && (await db.getIndex("rzp/" + rzpOrderId));
  if (!idx) return json({ ok: true, ignored: true });
  const order = await db.getOrder(idx.orderId);
  if (!order) return json({ ok: true, ignored: true });
  if ((ev.event === "payment.captured" || ev.event === "order.paid") && pay && pay.status === "captured") {
    if (Number(pay.amount) !== order.amountMinor || pay.currency !== "INR") { console.error("amount mismatch", order.id); return json({ ok: false, error: "amount-mismatch" }); }
    await markPaid(order, pay, "webhook", req);
  } else if (ev.event === "payment.failed" && order.status === "created") {
    order.lastError = (pay && pay.error_description) || "Payment failed"; await db.saveOrder(order);
  } else if (ev.event === "refund.processed" || ev.event === "refund.created") {
    order.status = "refunded"; await db.saveOrder(order);
  }
  return json({ ok: true });
};
export const config = { path: "/api/razorpay-webhook" };
