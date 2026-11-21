// POST /api/verify-payment — checks Razorpay's signature AND re-reads the payment from Razorpay before marking paid.
import { db, hmac, safeEqual, razorpay, markPaid, publicOrder, json, fail } from "../lib/shop.mjs";

export default async (req) => {
  if (req.method !== "POST") return fail(405, "method-not-allowed");
  let b; try { b = await req.json(); } catch { return fail(400, "bad-request"); }
  const order = await db.getOrder(String(b.orderId || ""));
  if (!order || !safeEqual(order.key, b.key)) return fail(404, "not-found", "Order not found.");
  if (order.status === "paid") return json({ ok: true, order: publicOrder(order, req) });
  if (b.razorpay_order_id !== order.rzpOrderId) return fail(400, "mismatch", "Payment doesn't match this order.");
  const expected = hmac(order.rzpOrderId + "|" + b.razorpay_payment_id, process.env.RAZORPAY_KEY_SECRET || "");
  if (!safeEqual(expected, b.razorpay_signature)) return fail(400, "bad-signature", "We couldn't verify this payment. If money was deducted, it will be refunded automatically — or contact us.");
  let pay;
  try {
    pay = await razorpay("GET", "/payments/" + encodeURIComponent(b.razorpay_payment_id));
    if (pay.order_id !== order.rzpOrderId || Number(pay.amount) !== order.amountMinor || pay.currency !== "INR") return fail(400, "mismatch", "Payment amount doesn't match this order.");
    if (pay.status === "authorized") pay = await razorpay("POST", "/payments/" + encodeURIComponent(pay.id) + "/capture", { amount: order.amountMinor, currency: "INR" });
    if (pay.status !== "captured") return fail(402, "not-captured", "Payment isn't complete yet (" + pay.status + ").");
  } catch (e) { console.error("verify failed", e.message); return fail(502, "gateway", "Payment received, but we couldn't confirm it just now. Don't pay again — we'll confirm by email shortly."); }
  const { order: o } = await markPaid(order, pay, "checkout", req);
  return json({ ok: true, order: publicOrder(o, req) });
};
export const config = { path: "/api/verify-payment" };
