// GET /api/download?t=TOKEN&f=epub|pdf — streams a purchased e-book, only for a verified, paid order.
import { db, ebookStream, ebookFiles, getBook, catalog } from "../lib/shop.mjs";

const page = (status, title, msg) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="background:#0B0D12;color:#F5F1E8;font-family:Arial,sans-serif;display:flex;min-height:90vh;align-items:center;justify-content:center;text-align:center;padding:20px"><div><h2 style="font-family:Georgia,serif">${title}</h2><p style="color:#B9B6AC;max-width:44ch">${msg}</p><p><a href="/contact.html" style="color:#D4AF6A">Contact us</a> · <a href="/contribution.html" style="color:#D4AF6A">Books</a></p></div>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

export default async (req) => {
  const t = new URL(req.url).searchParams.get("t") || "";
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(t)) return page(404, "Link not valid", "This download link isn't valid. Please use the link from your order email or order page.");
  const idx = await db.getIndex("dl/" + t);
  const order = idx && (await db.getOrder(idx.orderId));
  const it = order && order.items[idx.idx];
  if (!it || it.token !== t || order.status !== "paid") return page(404, "Link not valid", "This download link isn't valid or the order was refunded.");
  const limit = catalog.downloadLimit || 5;
  if ((it.downloads || 0) >= limit) return page(410, "Download limit reached", `This link has been used ${limit} times. If you need it again, reply to your order email and we'll help.`);
  if (catalog.shopOpen !== true) return page(503, "Downloads open soon", "E-book downloads on this website open soon. Please check back shortly.");
  const files = ebookFiles(it.bookId);
  const want = (new URL(req.url).searchParams.get("f") || files[0] || "").toLowerCase();
  const got = files.includes(want) ? await ebookStream(it.bookId, want) : null;
  if (!got) return page(503, "Almost ready", "Your e-book file is being prepared. Please try again a little later — we'll also email you.");
  it.downloads = (it.downloads || 0) + 1; it.lastDownload = new Date().toISOString();
  await db.saveOrder(order);
  const b = getBook(it.bookId);
  const ascii = (b ? b.title : "").replace(/[^A-Za-z0-9 .&$-]+/g, "").replace(/\s+/g, " ").trim();
  const name = (ascii.length >= 3 ? ascii : it.bookId) + "." + want;
  const headers = { "Content-Type": want === "epub" ? "application/epub+zip" : "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  if (got.size) headers["Content-Length"] = String(got.size);
  return new Response(got.body, { status: 200, headers });
};
export const config = { path: "/api/download" };
