# Switching on the live features

Everything is controlled from **one file: `js/config.js`**. There are three parts, and each one works on its own.

| Feature | Works when | Setup time |
|---|---|---|
| Every form emailed to you (contact, stays, passes, book pre-orders, Talk2Me messages, comments) | The site is online and you click one activation email | 2 min |
| UPI QR code + "Pay with UPI app" for the exact amount after a booking | You add your UPI ID | 1 min |
| Talk2Me accounts and live chat, public comments, likes, Owner Dashboard | You connect a free Firebase project | 15 min |

> The site must be **hosted on a real web address** (see the end of this guide). Forms can't send from a file opened directly on your computer.

---

## 1. Email delivery (FormSubmit, free)

Already set to `p.svishal@gmail.com` in `js/config.js` (`formEndpoint`).

1. Put the site online.
2. Send yourself a test message from the Contact page.
3. FormSubmit emails you an **"Activate Form"** link. Click it once. From then on, every form arrives in your inbox. Visitors also get an automatic confirmation email.
4. *(Optional)* FormSubmit then gives you a random alias such as `https://formsubmit.co/ajax/7f3a…`. Paste it into `formEndpoint` so your email address isn't visible in the page code.

## 2. Payments

In `js/config.js`:

- **UPI:** set `upiId: "yourname@okhdfcbank"`. After a booking, visitors see a QR code and an "Open UPI app" button pre-filled with the exact amount and their booking reference. After paying they can enter the UTR number, which is emailed to you.
- **Card / Net Banking (optional):** in Razorpay go to **Payment Pages → Create**, and set the amount so the customer can enter it. Paste the page links into `paymentLinks.stay`, `paymentLinks.passes` and `paymentLinks.books`.
- If neither is set, visitors are told you'll send a payment link within 24 hours. Every request still reaches you.

## 3. Firebase: Talk2Me, comments, likes, Owner Dashboard (free "Spark" plan)

1. Go to **console.firebase.google.com**, click **Add project** and name it (e.g. `vishal-singh-site`). Google Analytics is optional.
2. Go to **Build → Authentication → Get started → Sign-in method** and enable:
   - **Email/Password** (for Talk2Me accounts)
   - **Anonymous** (lets visitors comment and like without an account)
3. In **Authentication → Settings → Authorized domains**, add your website's domain (e.g. `vishalsingh.in`).
4. Go to **Build → Firestore Database → Create database**. Choose **Production mode** and the **asia-south1 (Mumbai)** location.
5. In **Firestore → Rules**, delete what's there, paste the whole contents of **`firestore.rules`** from this folder, and click **Publish**.
6. Go to **Project settings** (gear icon) **→ General → Your apps**, click the **Web `</>`** icon and register the app (no hosting needed). Copy the `firebaseConfig` values into `js/config.js`:
   ```js
   firebase: {
     apiKey: "AIza…",
     authDomain: "vishal-singh-site.firebaseapp.com",
     projectId: "vishal-singh-site",
     storageBucket: "vishal-singh-site.appspot.com",
     messagingSenderId: "…",
     appId: "1:…:web:…"
   },
   ```
   These values are meant to be public. Security comes from the rules you published in step 5.
7. **Create your owner account:** open **Talk2Me**, sign up with **p.svishal@gmail.com**, and click the confirmation link in your email. Then open **Owner login** (footer link, `admin.html`).

### What you get as owner
- **Talk2Me:** an inbox of every member's private thread, with unread markers. You reply as "Vishal Singh · Author" and can delete any message. You get an email when someone starts a new conversation.
- **Owner Dashboard (`admin.html`):** every stay request, pass reservation, pre-order, payment confirmation and contact message. You can mark each one new / confirmed / paid / done / cancelled, reply by email or WhatsApp in one tap, and export to CSV.
- **Comments:** your comments show an "Author" badge. You can delete any comment from the page or the dashboard.

### Changing the owner email
Change it in **both** `js/config.js` (`adminEmails`) and `firestore.rules` (the `isAdmin()` line), then publish the rules again.

### Free plan limits
50,000 reads and 20,000 writes per day, which is far more than a personal site needs.

---

## Putting the site online

**Because the site now sells books, host it on Netlify via GitHub** — see SHOP-SETUP.md. The options below still work for everything except the book checkout.


- **Netlify:** drag the whole folder onto app.netlify.com/drop, then connect your domain.
- **Firebase Hosting:** `firebase.json` is included. Run `npx firebase-tools login`, then `npx firebase-tools deploy` in this folder. This also publishes the rules.
- **GitHub Pages / any web host:** upload the folder as is. There's no build step.

After your domain is live, change `og:image` in each page's `<head>` from `assets/og-image.jpg` to the full address (e.g. `https://vishalsingh.in/assets/og-image.jpg`). WhatsApp and LinkedIn link previews need the full address.
