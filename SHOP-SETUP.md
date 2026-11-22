# Selling books on your website — setup guide

The shop is built in, tested, and comes with Terms, Privacy, Refund and Shipping pages. Three accounts switch it on: **Razorpay** (payments), **Netlify** (hosting plus the small private server), and optionally **Brevo** (receipt emails).

## How it works (and why it's safe)
- **Buyers in India** pay on your site in ₹ through **Razorpay**: UPI, cards, net banking or wallets. Card and UPI details are entered in Razorpay's own secure window. Your site never sees them.
- **Prices are set on the server** from `catalog.json`. A visitor who edits the page can't change what they're charged.
- **An order counts as paid only after two checks with Razorpay:** a cryptographic signature check, and a direct look-up of the payment (amount and currency must match). A backup notice from Razorpay (the "webhook") confirms the order even if the buyer closes the tab.
- **E-books** are kept in `private/ebooks/`, which can't be opened publicly. Each buyer gets a private download link that works 5 times.
- **Buyers outside India** see USD prices and **Buy on Amazon** buttons for Kindle, paperback and hardcover.

---

## Step 1 — Razorpay account (free to open)
1. Sign up at **razorpay.com**. Choose **Individual / Sole proprietor** if you sell in your own name. You'll need your PAN, bank account and website address.
2. Razorpay reviews your website before activating your account (usually 1–3 working days). Your site already has what they look for: product pages with prices, Contact, Terms, Privacy, Refund & Cancellation, and Shipping & Delivery pages (linked in the footer).
3. While you wait, use **Test mode**. Go to **Settings → API Keys → Generate Key** and copy the **Key ID** (`rzp_test_…`) and **Key Secret**.

## Step 2 — Put the site on Netlify
The shop needs Netlify's server functions, so deploy with Git or the command line. Drag-and-drop doesn't include functions.

**Easiest: GitHub + Netlify.** This also gives you a permanent, versioned copy of the site for future changes.
1. Create a free GitHub account and a **private** repository (it must be private — it contains your e-book files). Upload this whole folder to it.
2. On **app.netlify.com**, go to **Add new site → Import an existing project → GitHub**, pick the repo and deploy. No build settings are needed (`netlify.toml` already has them).
3. Connect your domain under **Domain management**.

## Step 3 — Secret settings in Netlify
Go to **Site configuration → Environment variables** and add:

| Name | Value |
|---|---|
| `RAZORPAY_KEY_ID` | Key ID from Razorpay |
| `RAZORPAY_KEY_SECRET` | Key Secret from Razorpay |
| `RAZORPAY_WEBHOOK_SECRET` | A long random password you make up (also used in Step 4) |
| `ADMIN_PASSWORD` | Your owner password for the Book Orders screen (12+ characters) |
| `SITE_URL` | Your full address, e.g. `https://vishalsingh.in` |
| `OWNER_EMAIL` | `vsnonchalant@gmail.com` (where order alerts go) |
| `BREVO_API_KEY`, `EMAIL_FROM` | *Optional* — see Step 5 |

Then go to **Deploys → Trigger deploy** so the new settings take effect. These secrets live only in Netlify. They're never in the website files or visible to visitors.

## Step 4 — Razorpay webhook (backup confirmation)
In Razorpay go to **Settings → Webhooks → Add new webhook**:
- **URL:** `https://YOUR-DOMAIN/api/razorpay-webhook`
- **Secret:** the same value as `RAZORPAY_WEBHOOK_SECRET`
- **Events:** `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`

Also check that **Settings → Payment Capture** is set to **Automatic** (the default).

## Step 5 — Receipt emails (optional, free)
Without this, buyers still get Razorpay's payment receipt, an order page with their download links, and their link on screen. You still get an email for every paid order through FormSubmit.

For branded receipts, order-shipped and e-book-ready emails:
1. Create a free account at **brevo.com**.
2. Go to **Senders & IPs → Senders**, add the address you'll send from, and verify it. An address on your own domain delivers best.
3. Under **SMTP & API → API keys**, create a key.
4. Add `BREVO_API_KEY` and `EMAIL_FROM` (the verified address) in Netlify, then redeploy.

## Step 6 — Switch on selling
Selling on the website is currently **switched off**: books are visible, Amazon buttons work, but the cart, checkout and e-book downloads are closed (the server refuses orders and downloads too). After Steps 1–4, open `catalog.json`, change `"shopOpen": false` to `"shopOpen": true`, and push. Netlify redeploys and the Bookstore shows prices, cart and checkout.

## Step 7 — Test, then go live
1. With test keys, buy a book on your site. Razorpay's test window lets you choose "Success" (or use their test cards/UPI). Check that:
   - the order page shows **Thank you**
   - the order appears at **/admin-orders.html**
   - you receive the alert email
2. When Razorpay activates your account, generate **Live** keys. Replace the two key values in Netlify, add the webhook again in Live mode, and redeploy. That's it.

---

## Everyday use

**Prices and availability** — edit `catalog.json`, then push to GitHub (Netlify redeploys automatically):
- `"price": { "INR": 249, "USD": 5.99 }` — the INR price is charged on your site; the USD price is shown to overseas visitors.
- Formats per book: `ebook`, `print` (paperback) and `hardcover`. Each format's `"status"`: `"available"` (deliver now), `"preorder"` (charge now, deliver at launch) or `"off"`.
- A book's `"status"`: `"sale"` (in the store) or `"soon"` (shown as Coming soon with Notify me — I AM GOD, Numerology Cheat Code and The Black Book of Truth are set this way).
- **Publishing a coming-soon book:** set the book's `"status"` to `"sale"`, each format's `"status"` to `"available"`, add each format's `"asin"`, and fill `"amazon"` with `https://www.amazon.com/dp/<ASIN>` for kindle, paperback and hardcover. Until then, overseas visitors see "coming to Amazon".
- Shipping: `"shipping": { "flat": 80, "freeAbove": 999 }`.

**Selling an e-book** — save the files as `private/ebooks/<book id>.epub` and/or `<book id>.pdf` (each under 20 MB), add `"files": ["epub", "pdf"]` to the book's ebook format in catalog.json, set its status to `"available"`, and push. On every deploy, Netlify copies these files into its private file storage; buyers only ever get them through their personal paid link. The 14 published books are already set up this way.

**Launch day for a pre-ordered e-book** — do the step above, then open **Owner login → Book orders**, pick the book under *Launching an e-book?* and click **Send download links**. Every pre-order buyer of that book gets their link.

**Shipping a paperback or hardcover** — in **Book orders → To ship**, enter the courier and tracking number and click **Mark shipped**. The buyer is emailed and sees the tracking on their order page.

**Refunds** — refund in the Razorpay dashboard (**Payments → select payment → Refund**). The order is marked refunded automatically through the webhook, or you can click **Mark refunded**.

**Your records** — **Export CSV** on the Book Orders screen. Razorpay's dashboard also has settlement reports for your accountant.

## Things to check with your CA
- **GST:** printed books are generally GST-exempt in India, but e-books are taxed. Ask your CA whether you need to register and how to price e-books. Prices on the site are shown as tax-inclusive.
- **Razorpay fees:** Razorpay charges a small fee per payment. See razorpay.com/pricing for current rates.
- **Seller name:** the policy pages name **Vishal Singh** as the seller. If you sell through a company (e.g. V Hospitality Pvt. Ltd.), update the four policy pages and your Razorpay account to match.
