// POST /api/create-order — prices the cart on the server and opens a Razorpay order.
import { quote, cleanCustomer, cleanAddress, newOrderId, token, db, razorpay, rzpConfigured, json, fail } from "../lib/shop.mjs";

export default async (req) => {
  if (req.method !== "POST") return fail(405, "method-not-allowed");
  if (!rzpConfigured()) return fail(503, "not-configured", "Online payment isn't switched on yet.");
  let body; try { body = await req.json(); } catch { return fail(400, "bad-request"); }
  if (body.website) return fail(400, "bad-request"); // honeypot
  let q, customer, address = null;
  try {
    q = quote(body.items);
    customer = cleanCustomer(body.customer);
    if (q.hasPrint) address = cleanAddress(body.address);
  } catch (e) { return e.closed ? fail(503, "shop-closed", e.message) : fail(400, "invalid", e.message); }

  const id = newOrderId();
  let rz;
  try {
    rz = await razorpay("POST", "/orders", { amount: q.amountMinor, currency: "INR", receipt: id, notes: { order: id, email: customer.email, items: q.lines.map((l) => `${l.qty}x ${l.bookId}:${l.format}`).join(", ").slice(0, 250) } });
  } catch (e) { console.error("razorpay order failed", e.message); return fail(502, "gateway", "Couldn't reach the payment gateway. Please try again in a minute."); }

  const order = { id, key: token(18), rzpOrderId: rz.id, status: "created", currency: "INR", items: q.lines, subtotal: q.subtotal, shipping: q.shipping, total: q.total, amountMinor: q.amountMinor, customer, address, createdAt: new Date().toISOString() };
  await db.saveOrder(order);
  await db.setIndex("rzp/" + rz.id, { orderId: id });
  return json({ orderId: id, key: order.key, razorpayOrderId: rz.id, keyId: process.env.RAZORPAY_KEY_ID, amount: q.amountMinor, currency: "INR", total: q.total, subtotal: q.subtotal, shipping: q.shipping, lines: q.lines });
};
export const config = { path: "/api/create-order" };
