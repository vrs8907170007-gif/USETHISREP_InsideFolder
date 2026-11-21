// GET /api/order-status?id=...&k=... — buyer's private order page data.
import { db, safeEqual, publicOrder, json, fail } from "../lib/shop.mjs";
export default async (req) => {
  const u = new URL(req.url);
  const o = await db.getOrder(String(u.searchParams.get("id") || ""));
  if (!o || !safeEqual(o.key, u.searchParams.get("k"))) return fail(404, "not-found", "Order not found.");
  return json({ order: publicOrder(o, req) });
};
export const config = { path: "/api/order-status" };
