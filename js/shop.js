/* shop.js — book store helpers: catalogue, region (India ₹ checkout / overseas Amazon $), cart. */
(function () {
  const SHOP = (window.SHOP = {});
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  SHOP.esc = esc;
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  let catP = null;
  // Live site: read catalog.json. Opened from disk (file://), browsers block that, so fall back to js/catalog-data.js.
  SHOP.catalog = () => catP || (catP = fetch("catalog.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error("catalog " + r.status); return r.json(); })
    .catch((e) => { if (window.SHOP_CATALOG) return window.SHOP_CATALOG; throw e; }));
  SHOP.book = (cat, id) => cat.books.find((b) => b.id === id);
  SHOP.inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
  SHOP.usd = (n) => "$" + Number(n).toFixed(2);

  /* region: India buys here in ₹; elsewhere sees $ and Amazon links */
  SHOP.region = () => {
    const saved = ls.get("vs_region", null);
    if (saved === "IN" || saved === "INTL") return saved;
    let tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    return /Asia\/(Kolkata|Calcutta)/.test(tz) ? "IN" : "INTL";
  };
  SHOP.setRegion = (r) => { ls.set("vs_region", r); document.dispatchEvent(new CustomEvent("vs-region", { detail: r })); };

  /* cart: [{id, format, qty}] */
  SHOP.cart = () => ls.get("vs_cart", []).filter((x) => x && x.id && x.format);
  SHOP.saveCart = (c) => { ls.set("vs_cart", c); document.dispatchEvent(new CustomEvent("vs-cart")); };
  SHOP.count = () => SHOP.cart().reduce((s, x) => s + (x.qty || 1), 0);
  SHOP.add = (id, format, qty) => {
    const c = SHOP.cart(); const ex = c.find((x) => x.id === id && x.format === format);
    if (format === "ebook") qty = 1;
    if (ex) ex.qty = format === "ebook" ? 1 : Math.min(10, (ex.qty || 1) + (qty || 1)); else c.push({ id, format, qty: qty || 1 });
    SHOP.saveCart(c);
  };
  SHOP.setQty = (id, format, qty) => { const c = SHOP.cart(); const ex = c.find((x) => x.id === id && x.format === format); if (ex) ex.qty = Math.max(1, Math.min(10, qty)); SHOP.saveCart(c); };
  SHOP.remove = (id, format) => SHOP.saveCart(SHOP.cart().filter((x) => !(x.id === id && x.format === format)));
  SHOP.clear = () => SHOP.saveCart([]);

  /* priced lines for display (the server re-prices everything at checkout) */
  SHOP.lines = (cat) => SHOP.cart().map((x) => {
    const b = SHOP.book(cat, x.id); const f = b && b.status === "sale" && b.formats[x.format];
    if (!f || f.status === "off") return null;
    const qty = x.format === "ebook" ? 1 : x.qty || 1;
    return { id: b.id, format: x.format, title: b.title, cover: b.cover, label: f.label, availability: f.status, qty, unit: f.price.INR, line: f.price.INR * qty };
  }).filter(Boolean);
  SHOP.totals = (cat, lines) => {
    const subtotal = lines.reduce((s, l) => s + l.line, 0); const hasPrint = lines.some((l) => l.format !== "ebook");
    const sh = cat.shipping || {}; const shipping = hasPrint && !(sh.freeAbove && subtotal >= sh.freeAbove) ? sh.flat || 0 : 0;
    return { subtotal, shipping, total: subtotal + shipping, hasPrint };
  };

  /* cover art: real image, or a typographic cover in the site style */
  const HUES = ["#7A4FE0", "#D4AF6A", "#2E8B6E", "#E0562F", "#4F7AE0"];
  // Each format can have its own cover (formats.<fmt>.cover); falls back to the book's main cover.
  SHOP.coverSrc = (b, fmt) => (fmt && b.formats && b.formats[fmt] && b.formats[fmt].cover) || b.cover || "";
  SHOP.cover = (b, cls, fmt) => {
    const src = SHOP.coverSrc(b, fmt);
    const label = fmt && b.formats && b.formats[fmt] ? " (" + (b.formats[fmt].label || fmt) + ")" : "";
    if (src) return `<img class="${cls || ""}" src="${esc(src)}" alt="${esc(b.title)} — cover${esc(label)}" loading="lazy" decoding="async">`;
    let h = 0; for (const ch of b.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const c = HUES[h % HUES.length];
    const m = b.title.match(/^(.*?)\s*(?:—\s*)?((?:Vol(?:ume)?\.?|खंड)\s*\d+)$/);
    return `<div class="type-cover ${cls || ""}" style="--c:${c}" role="img" aria-label="${esc(b.title)} — cover"><span class="tc-top">Vishal Singh</span><span class="tc-title">${esc(m ? m[1] : b.title)}</span>${m ? `<span class="tc-vol">${esc(m[2])}</span>` : ""}<span class="tc-rule"></span></div>`;
  };
})();
