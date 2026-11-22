# Vishal Singh — Website Project Guide

Read this first before any change. Baseline imported 8 Nov 2026 from `vishal-singh-site-updated.zip`. Version 2 is from the same day.

## What the site is
A static, multi-page personal and venture site for Vishal Singh (Founder & Managing Director, V Hospitality Pvt. Ltd.).
It's plain HTML/CSS/JS with no build step. Live features use FormSubmit (email) and Firebase (accounts, chat, comments, likes, dashboard), switched on from `js/config.js`. See **SETUP-BACKEND.md**.

## Structure
| File | Purpose | Accent |
|---|---|---|
| index.html | Home: hero + 9 photo cards linking each page | gold |
| about.html | Biography in 14 chapters + career table | gold |
| accomplishments.html | Venture cards with filter chips | gold |
| pandora-city.html | 65-acre agri-tourism project: Overview / 5 Sub-Farms / Request a Stay / Blog (comments) | emerald |
| forever-fyre.html | 10-day festival: Overview / **Proposed** Lineup & Zones / Reserve Passes / Blog (comments), P&L | flame |
| experience.html | Portfolio of executed work, with filters | gold |
| talk2me.html + js/talk2me.js | Live member room: sign-up with email confirmation, private chat with Vishal, 6 open topic rooms, owner inbox | violet |
| gallery.html | 11 folders, 207 photos (thumbnails + full-size lightbox), comments per photo | gold |
| contribution.html | **Bookstore** (52 titles in 10 series from catalog.json — 14 out now, 38 coming soon; India: e-book/paperback/hardcover + cart; abroad: USD + Amazon links) + featured books with teasers, likes, viewpoints; 3 "Coming soon" books with Notify me | violet |
| bookstore.html | Bookstore: 52 titles in 10 series, India ₹ checkout / overseas Amazon $, filters | violet |
| checkout.html | Cart, buyer details, India delivery address, Razorpay payment | violet |
| order.html | Buyer's private order page (status, e-book downloads, tracking) — `?id=&k=` | violet |
| admin-orders.html | Owner: book orders, mark shipped, release pre-order e-books, CSV (password = ADMIN_PASSWORD) | violet |
| terms / privacy / refund-policy / shipping-policy .html | Policy pages required by Razorpay (footer links) | gold |
| library.html | Free resources (official/government links) + venture & channel links | gold |
| contact.html | Email, phones, WhatsApp, LinkedIn, live contact form (`?reason=forever` preselects a reason) | gold |
| admin.html | Owner Dashboard (noindex): requests with status, comments moderation, CSV export | gold |

Shared code:
- `js/config.js` — **the only settings file**: owner email, WhatsApp, form endpoint, UPI ID, payment links, Firebase config.
- `js/backend.js` — `VS.*` helpers: `submitRequest` (email + Firestore), `showResult`, `paymentBlock` (UPI QR, links), `mountComments`, `mountLike`, `lightbox`, `validate`, `toast`.
- `js/shell.js` — injects the header nav (`NAV`, with Story/Ventures dropdowns), the venture dock (hidden on phones), the footer and social links (`SOCIAL_LINKS`), and the scroll-reveal. **Edit nav/footer/social links here only.**
- `js/vendor/firebase.js` — the Firebase SDK v10.14.1 bundled locally (loaded only when Firebase is configured). `js/vendor/qrcode.js` — QR generator.
- `css/base.css` — design system "The Stage" plus V3 components (nav groups, notices, comments, payment box, lightbox).
- **Shop:** `catalog.json` (all book prices/status/Amazon links — single source of truth, read by both store and server), `js/shop.js` (cart, region, covers), `netlify/functions/*.mjs` (create-order, verify-payment, razorpay-webhook, order-status, download, admin-orders), `netlify/lib/shop.mjs` (pricing, Razorpay, storage in Netlify Blobs, e-book tokens, Brevo emails), `private/ebooks/` (PDFs, never public), `netlify.toml`, `package.json`. Setup: **SHOP-SETUP.md**.
- `firestore.rules` — database security rules (paste into Firebase). `firebase.json` — optional Firebase Hosting deploy.

Script order on interactive pages: `config.js` → `backend.js` → `shell.js` → page script.

Assets: `assets/<section>/...`, kebab-case with year. Large PNGs were converted to `.webp` (max 1800px). Gallery previews live in `assets/thumbs/` (720px WebP), and each gallery `<img>` has `data-full` pointing to the original. When adding a gallery photo, create its thumb too (any 720px WebP) or just use the original as `src`.

## Design system (keep consistent)
- Colours: `--stage #0B0D12` (bg), `--ivory #F5F1E8` (text), `--ivory-dim #B9B6AC`. Accents: `--gold #D4AF6A`, `--emerald #2E8B6E` (Pandora City), `--flame #E0562F` (Forever FYRE), `--violet #7A4FE0` (Talk2Me / Contribution).
- Type: Fraunces (headings, italics for emphasis) and Inter (body/UI), loaded by `<link>` in each page head.
- Patterns: `.eyebrow` label, blurred `.glow` in heroes, pill buttons (`.btn`, `.btn-solid`, `.btn-accent`), `.card`, `.reveal` fade-up, and `.notice ok/err/info` for form results.
- Paragraphs are justified on wide screens and left-aligned below 900px.

## Facts — source of truth
- Title: Founder & Managing Director, V Hospitality Pvt. Ltd.
- Company spelled **VRU Entertainment Pvt. Ltd.** (per the 2008 appointment letter). Vishal was CEO, Events Division.
- Event career began at 16 under the mentorship of **Showbiz** (1996–2007). The pre-2008 Filmfare / Miss India / Gold Expressions work is legitimate and stays as is.
- **Jacqueline Fernandez**, **Arijit Singh**, **St. Andrew's College**.
- Book prices: see catalog.json (USD = owner's Kindle/paperback list of 8 Nov 2026).
- Book series: **An Autobiography of God — The Trilogy** (as on the published covers; author credit on covers: Sanatani V). Vol. 1 is *I AM GOD*. Author credits follow each cover: "Sanatan Vishal Singh" (I AM GOD, Numerology Cheat Code), "Sanatan Guru Vishal Singh" (The Divine Code).
- "Bhayank" (the danger number) is spelled intentionally, as on the cover.
- Pandora City: 65 acres, **5 sub-farms** (Fruit Farm Retreat, Goat Farm, Dairy Farm, Adventure Park, Fish Farm Retreat). Forever FYRE runs across the Pandora City grounds, around the 20-acre orchard.
- ₹16L: "gross profit / month" for V Services, "monthly collections" for V Hospitality.
- Forever FYRE lineup = **proposed**, not confirmed.
- Contact: vsnonchalant@gmail.com · +91 83695 78225 · +91 91365 40798 · WhatsApp 918369578225.

## Open items
0. **Shop go-live:** Razorpay account + KYC, deploy on Netlify via GitHub, env vars, webhook (SHOP-SETUP.md). Add Amazon links per book in catalog.json. Upload e-book PDFs. Confirm proposed INR prices (USD final; INR from tier map) and which books/formats are "available" vs "preorder" (all set to preorder now). Book covers needed for 9 new titles (typographic covers shown meanwhile). GST on e-books — check with CA.
1. **Finances** (Pandora sub-farm models, FYRE P&L) are left as is, on the owner's instruction, for a later review. Known issues: Goat Farm profit (₹14.94 Cr) is higher than revenue (₹7.40 Cr); Fish Farm "~₹15 Cr" doesn't match 500 guests × ₹5,000 × 12 = ₹3.6 Cr.
2. Go live: host the site, activate FormSubmit, add UPI ID, connect Firebase (SETUP-BACKEND.md).
3. After the domain is known: make `og:image` an absolute URL in each page head.
4. Confirm the two Pandora City blog posts (12 Aug & 3 Jul 2026) reflect real events. Their images are concept layouts.
5. Privacy to consider: full date of birth (About), scanned marksheets (Gallery), parents named as landholders (Pandora City).
6. Talk2Me and Library hero cards on Home use an icon. Swap in photos when available.
7. Unused assets kept: 5 VRU birthday photos (`assets/experience/vru-birthday/*`), `portrait-passport.jpg`.

## Change log
- **2026-11-22 v17 — More languages and "add another".** Report language: choose up to two of English, Hindi, Marathi, Gujarati, Bengali, Punjabi, Tamil, Telugu, Kannada (call language English or Hindi). Relationship status: Married, Engaged / in a relationship, Unmarried, Divorced, Separated, Widowed, Prefer not to say; partner details only for the first two. Mobiles, homes/property (flat, building, floor) and vehicles (registration, type) have "+ Add another". Report engine: fonts and labels for all nine languages; handles several homes, vehicles and mobiles. Fixed: hidden form rows (call details, partner) were showing.
- **2026-11-22 v16 — Relationship status.** Life Blueprint and the couple add-on now ask for relationship status; partner details are asked (and required) only for Married, Engaged or In a relationship. Report engine reads mobile and vehicle numbers separated by spaces, ignores "Divorced"/"Single" typed as a partner, and the playbook covers single, divorced and widowed clients.
- **2026-11-22 v15 — Complete bookings, review step, report agent, email change, AutoSync v2.**
  - All site email now goes to **vsnonchalant@gmail.com** (forms, contact page, policies, shop settings). FormSubmit sends a one-time "Activate form" email to the new address — click it once.
  - Numerology booking form: extra fields (Both languages, questions, name-correction details, co-founders, baby gender and parents). After "Review my details" the visitor sees everything, can go back to edit, and only "Confirm and send" sends it. The email (and the WhatsApp/email fallback) carries every detail plus a "Booking data (for the report agent)" JSON block.
  - `numerology-engine/` (not published on the site): numerology calculator (`engine/numerology.py`), report renderer (`engine/render.py`, PDF with cover, contents and summary card, English and Hindi), arithmetic checker (`engine/check.py`) and the agent's instructions (`PLAYBOOK.md`). A scheduled Claude task reads new bookings in vsnonchalant@gmail.com, writes the report for the package booked, checks it and emails the PDF to vsnonchalant@gmail.com for Vishal to share after payment.
  - AutoSync v2 (in the Vishalsinghofficial folder): starts with Windows, retries failed uploads every minute, merges GitHub changes, and unpacks zips dropped into `Drop-Updates`.
- **2026-11-22 v14 — Numerology readings page.**
  - New `numerology.html` (menu: Numerology, after Bookstore): The Divine Code Numerology brand, free calculator (Moolank, Bhagyank, Chaldean name number, Personal Year 2027), "Which number are you?" grid.
  - 6 packages from the price list (Snapshot ₹499, Complete Life Report ₹1,499, Name Correction ₹2,499, 1:1 Consultation ₹3,100, Business & Brand ₹5,100, Life Blueprint ₹6,999 vs ₹7,897) and 4 add-ons (mobile ₹299, house/vehicle ₹499, couple ₹1,999, baby name ₹1,999). Prices, items and samples live in the `PKGS`, `ADDONS` and `SAMPLES` lists at the bottom of the page.
  - Launch offer 20% (first 50 clients) applied in the total, except Life Blueprint. Switch off with `const OFFER = 0` in numerology.html.
  - "Sample report" pop-up for every package (fictional client Priya Sharma, from the Life Blueprint template) and a 12-section "What's inside each reading" table.
  - Booking form follows the Life Blueprint intake form, with extra sections shown only when needed (partner, mobiles, house/vehicle, business, baby). Requests are emailed via FormSubmit with reference NM-…; payment link sent manually (or set `paymentLinks.consult` / `upiId` in js/config.js).
  - WhatsApp on this page uses `numerologyWhatsapp` (+91 91365 40798) from js/config.js.
  - Menu collapses into the Menu button below 1180px wide (10 items no longer fit).
- **2026-11-21 v13 — Vercel hosting.**
  - The live site is vsofficial.vercel.app (printed on the book covers), auto-deployed from the GitHub repo psvishal-afk/vishalsingh.com.
  - Added `vercel.json` (security headers; /private and /netlify blocked), `.vercelignore` (private/, netlify/, *.md, config files are never uploaded or served), `.gitignore` (e-book files are never committed) and `404.html`.
  - og:image is now an absolute URL. Two zips: **for-vercel** (no e-books — upload this to GitHub) and **master** (with e-books — keep private).
  - Note: the payment server (netlify/functions) runs on Netlify. On Vercel, the shop stays off until it is ported to Vercel Functions + Vercel Blob, or the site moves to Netlify.
- **2026-11-21 v12** — Website selling switched **off** until the payment gateway is set up: `"shopOpen": false` in catalog.json. While off, the Bookstore shows Amazon buttons only (Kindle on Amazon.in for India) with "Buying on this website opens soon", checkout is closed, and the server refuses orders and downloads. Contribution rows have "Buy on Amazon" (Kindle page) plus an "All formats" link. To switch on: set it to true and redeploy (SHOP-SETUP.md, Step 6).
- **2026-11-21 v11 — Bookstore gets its own page.**
  - bookstore.html holds the store (menu: Contribution → Bookstore). contribution.html is the reading room again: all 52 books in the original row style, published first (A–Z), then coming soon.
  - Contribution rows are plain HTML generated from catalog.json by `netlify/build_books.py`, which also writes `js/catalog-data.js` so the Bookstore works when opened from disk. Run the script after editing catalog.json; Netlify runs it on every deploy.
  - Links that pointed to the old store (Accomplishments, Library, checkout) now go to bookstore.html.
- **2026-11-21 v10** — Autobiography of God Vol. 2 EPUB corrected: its title (metadata, title page, contents, cover page) said "Volume I: I AM GOD" and now says "Volume II: Living with Yin & Yang". Nothing else changed; it passes EPUBCheck 5.1.0 with 0 errors and 0 warnings. The corrected copy was given to the owner for re-upload to KDP.
- **2026-11-21 v9 — Featured section covers every book.**
  - "Featured · teasers & reader viewpoints" is now generated from catalog.json: all 52 titles, published first (A–Z), then coming soon (A–Z).
  - Each row shows the Kindle cover, title, author (from the EPUB metadata), a description taken from the back cover, buy/notify, likes and reader viewpoints.
  - The 4 teaser videos play in one shared player. Likes and viewpoints load as rows scroll into view.
  - Comment and like keys are unchanged (`book-<id>`), so existing viewpoints carry over.
- **2026-11-21 v8 — Real books installed** (from the owner's PublishedBooks archive).
  - Covers: 42, one per format for each of the 14 published titles. Kindle covers taken as supplied; paperback and hardcover fronts cut from the KDP full-wrap PDFs. Stored in assets/covers/.
  - E-books: 28 files in private/ebooks/ (Kindle EPUB, plus the paperback interior as PDF), declared in `formats.ebook.files`.
  - Storage: files are uploaded to Netlify's private blob storage at deploy (build command in netlify.toml), not bundled into the function (50 MB function limit).
  - Featured rows, Home, Accomplishments and About now use the published covers and the "An Autobiography of God — The Trilogy" wording.
- **2026-11-21 v7** — Per-format covers (`formats.<fmt>.cover`, images in assets/covers/). The card cover follows the chosen format; abroad, it follows the hovered Amazon button. E-books accepted as PDF or EPUB; download filename falls back to the book id for Hindi titles. Payment lock re-tested: unpaid / closed / forged / guessed / refunded all get no file; no book files are public.
- **2026-11-21 v6 — Full book catalogue (52 titles).**
  - 14 titles published on Amazon KDP (from the owner's collection report): live Amazon buttons built from each ASIN (amazon.com/dp/ASIN), USD prices exactly as on KDP, and website checkout for India.
  - 36 new titles marked Coming soon, with Notify me. The 2 earlier coming-soon titles (Numerology Cheat Code, Black Book of Truth) are kept.
  - Store grouped into 10 series, with Out now / Coming soon and series filters.
  - Hindi titles reconstructed from a garbled copy, shown with a Devanagari font. Featured I AM GOD now "Out now".
  - New INR tiers: $9.99→₹449, $24.99→₹999.
  - To confirm: book 10 (Autobiography of God Vol. 2) ASIN order, the Hindi titles, and the INR prices.
- **2026-11-08 v5** — Final prices locked (owner's Amazon Kindle/paperback/hardcover rates); titles updated to "The Divine Code Masterbook" and "CSN-Numerology Vol. 1–5"; INR prices from one tier map (see catalog.json).
- **2026-11-08 v4** — Hardcover added for all 10 books.
  - On the site (India): proposed price = paperback + ₹400. Ships like a paperback.
  - Abroad (Amazon): proposed price = paperback + $9, with a hardcover Amazon button.
  - Amazon buttons for Kindle, paperback and hardcover show "coming to Amazon" until links are pasted into catalog.json.
- **2026-11-08 v3 — Bookstore & payments.**
  - Catalogue:
    - 10 books with your USD Kindle/paperback prices.
    - Proposed INR prices: e-books ₹199–499, paperbacks ₹499–1,299.
  - Buying:
    - India checkout via Razorpay (server-side pricing, signature check plus payment look-up, webhook backup).
    - E-books delivered through private 5-use links; paperbacks shipped within India (₹80, free from ₹999).
    - Pre-orders, with release to buyers on launch day.
    - Overseas visitors sent to Amazon.
  - Owner and policies:
    - Owner Book Orders screen.
    - Terms, Privacy, Refund and Shipping pages.
  - Contribution page:
    - Pre-book forms replaced with Buy / Notify me.
- **2026-11-08 v2** —
  - Content and facts:
    - Fixed facts and spellings: Fernandez, Arijit, VRU Entertainment, St. Andrew's, title.
    - Added the Showbiz mentorship to About (Chapter 7 and the career table) and the Experience intro.
    - Pandora count aligned to 5 sub-farms. Triseries naming aligned to the book cover.
    - Removed fake comments, likes and the sample chat.
    - Hid 199 empty gallery notes and the two empty folders. Filled the Library with real resources.
    - Replaced all image placeholders with real photos or typographic panels.
    - Book descriptions written from the covers. FYRE lineup marked proposed.
  - Live features:
    - Every form is live (email + database).
    - UPI and payment-link payments.
    - Real Talk2Me with accounts and chat.
    - Live comments and likes.
    - Owner Dashboard.
  - Navigation and design:
    - Nav grouped into Story and Ventures dropdowns.
    - Dock hidden on phones. Readable left-aligned text on mobile.
    - Home preview frames now photo cards (no fake videos or alerts).
  - Speed and sharing:
    - Images 74 MB → 35 MB; gallery loads about 8 MB of previews lazily.
    - Teaser videos 43 MB → 12 MB.
    - Added SEO description, social preview image and favicon to every page.
- 2026-11-08 v1 — Baseline imported. No changes.
