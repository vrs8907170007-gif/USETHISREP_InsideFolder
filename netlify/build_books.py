#!/usr/bin/env python3
"""Regenerate book content from catalog.json (runs on every Netlify deploy; run locally after editing catalog.json).

1. js/catalog-data.js  - a copy of catalog.json as JavaScript, so the Bookstore also works
                          when a page is opened straight from disk (file://), where browsers
                          block reading catalog.json.
2. contribution.html    - the Featured rows between <!-- BOOKS:START --> and <!-- BOOKS:END -->,
                          written as plain HTML (published A-Z, then coming soon A-Z).
Usage:  python3 netlify/build_books.py
"""
import html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cat = json.load(open(os.path.join(ROOT, "catalog.json"), encoding="utf-8"))
esc = lambda s: html.escape(str(s or ""), quote=True)

# ---- 1. catalog-data.js
with open(os.path.join(ROOT, "js", "catalog-data.js"), "w", encoding="utf-8") as f:
    f.write("/* Generated from catalog.json by netlify/build_books.py - do not edit by hand. */\n")
    f.write("window.SHOP_CATALOG = " + json.dumps(cat, ensure_ascii=False) + ";\n")

# ---- 2. Featured rows
HUES = ["#7A4FE0", "#D4AF6A", "#2E8B6E", "#E0562F", "#4F7AE0"]

def type_cover(b):
    h = 0
    for ch in b["id"]:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    m = re.match(r"^(.*?)\s*(?:—\s*)?((?:Vol(?:ume)?\.?|खंड)\s*\d+)$", b["title"])
    title, vol = (m.group(1), m.group(2)) if m else (b["title"], "")
    return (f'<div class="type-cover" style="--c:{HUES[h % len(HUES)]}" role="img" aria-label="{esc(b["title"])} — cover">'
            f'<span class="tc-top">Vishal Singh</span><span class="tc-title">{esc(title)}</span>'
            + (f'<span class="tc-vol">{esc(vol)}</span>' if vol else "") + '<span class="tc-rule"></span></div>')

def cover(b):
    src = ((b.get("formats") or {}).get("ebook") or {}).get("cover") or b.get("cover")
    if src:
        return f'<img loading="lazy" decoding="async" src="{esc(src)}" alt="{esc(b["title"])} — Kindle cover">'
    return type_cover(b)

def sort_key(b):
    k = (b["title"] + " " + (b.get("subtitle") or "")).lower().replace("$", "s")
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", k)]

def row(b):
    pub = b.get("status") == "sale"
    c = cover(b)
    if b.get("teaser"):
        cov = (f'<a class="book-cover-link" href="#" data-teaser="{esc(b["teaser"])}" data-title="{esc(b["title"])}" '
               f'data-status="{"sale" if pub else "soon"}" aria-label="Play teaser for {esc(b["title"])}">{c}'
               '<div class="cover-play-overlay"><div class="cover-play-btn">▶</div></div><div class="cover-teaser-label">Watch teaser</div></a>')
    else:
        cov = f'<div class="book-cover-link static">{c}</div>'
    if pub:
        f = [x for x in b["formats"].values() if x.get("status") != "off"]
        inr = min(x["price"]["INR"] for x in f); usd = min(x["price"]["USD"] for x in f)
        note = (f'from ₹{inr:,} in India or ${usd:.2f} on Amazon' if cat.get('shopOpen') else f'on Amazon from ${usd:.2f}')
        amz = (b.get("amazon") or {}).get("kindle") or ""
        if cat.get('shopOpen') or not amz:
            btn = f'<a class="prebook-btn" href="bookstore.html#book-{b["id"]}" style="display:inline-flex; text-decoration:none;">📖 Buy in the Bookstore</a>'
        else:  # website selling switched off: send readers straight to the Amazon buy page (other formats are on the same page)
            btn = (f'<a class="prebook-btn" href="{esc(amz)}" target="_blank" rel="noopener" style="display:inline-flex; text-decoration:none;">🛒 Buy on Amazon</a>'
                   f' <a href="bookstore.html#book-{b["id"]}" style="margin-left:14px; font-size:13px; color:var(--violet); font-weight:600;">All formats →</a>')
        price = (f'<div class="price-row"><span class="price-tag">Out now</span><span class="price-note">E-book, paperback &amp; hardcover · {note}</span></div>\n'
                 f'        {btn}')
    else:
        price = ('<div class="price-row"><span class="price-tag">Coming soon</span><span class="price-note">Get one email the day it launches</span></div>\n'
                 f'        <form class="notify-form fl-notify" data-book="{esc(b["title"])}" novalidate><input class="vs-input" type="email" placeholder="you@email.com" '
                 'aria-label="Your email for launch news" autocomplete="email"><button class="btn btn-accent" type="submit">Notify me</button></form><div class="notice" style="display:none;"></div>')
    parts = [f'    <div class="book-row reveal" id="featured-{b["id"]}">', f'      {cov}', '      <div>',
             f'        <h4>{esc(b["title"])}</h4>']
    if b.get("subtitle"): parts.append(f'        <div class="fl-sub">{esc(b["subtitle"])}</div>')
    if b.get("author"): parts.append(f'        <div class="by">by {esc(b["author"])}</div>')
    if b.get("blurb"): parts.append(f'        <p class="fl-blurb">{esc(b["blurb"])}</p>')
    if b.get("quote"): parts.append(f'        <p class="feeling">"{esc(b["quote"])}"</p>')
    parts += [f'        {price}',
              f'        <div class="book-actions"><div class="react-btn" data-like="book-{b["id"]}"></div><div class="react-btn" data-vp-toggle>💬 Share your viewpoint</div></div>',
              f'        <div class="viewpoints" data-comments="book-{b["id"]}" data-label="{esc(b["title"])}"></div>',
              '      </div>', '    </div>']
    return "\n".join(parts)

pub = sorted([b for b in cat["books"] if b.get("status") == "sale"], key=sort_key)
soon = sorted([b for b in cat["books"] if b.get("status") != "sale"], key=sort_key)
block = ("<!-- BOOKS:START (generated from catalog.json by netlify/build_books.py) -->\n"
         f'    <h3 class="fl-head">Out now <small>{len(pub)} books</small></h3>\n' + "\n".join(row(b) for b in pub) + "\n"
         f'    <h3 class="fl-head">Coming soon <small>{len(soon)} books</small></h3>\n' + "\n".join(row(b) for b in soon) +
         "\n    <!-- BOOKS:END -->")
p = os.path.join(ROOT, "contribution.html")
page = open(p, encoding="utf-8").read()
new, n = re.subn(r"<!-- BOOKS:START.*?<!-- BOOKS:END -->", lambda m: block, page, flags=re.S)
if n != 1:
    raise SystemExit("contribution.html: BOOKS markers not found")
open(p, "w", encoding="utf-8").write(new)
print(f"build_books: {len(pub)} published + {len(soon)} coming soon -> contribution.html; js/catalog-data.js written")
