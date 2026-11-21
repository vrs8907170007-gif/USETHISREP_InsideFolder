/* ===========================================================
   SITE SETTINGS — the only file you need to edit to switch
   features on. See SETUP-BACKEND.md for step-by-step help.
   =========================================================== */
window.SITE_CONFIG = {
  ownerName: "Vishal Singh",
  ownerEmail: "p.svishal@gmail.com",

  // Emails that get the owner/admin view (reply in Talk2Me, delete comments, see bookings).
  adminEmails: ["p.svishal@gmail.com"],

  // WhatsApp number (country code, no + or spaces). Used for "Send on WhatsApp" buttons.
  whatsapp: "918369578225",

  // 1) EMAIL DELIVERY — works immediately, free (FormSubmit.co).
  //    Every form (contact, bookings, passes, pre-books) is emailed here.
  //    The very first submission sends an "Activate Form" email to ownerEmail — click it once.
  //    After activating, FormSubmit gives you a random alias; you can paste it in place of the email
  //    (e.g. "https://formsubmit.co/ajax/a1b2c3d4e5...") to keep your address out of the page source.
  formEndpoint: "https://formsubmit.co/ajax/p.svishal@gmail.com",

  // 2) PAYMENTS (optional)
  //    UPI: put your UPI ID (e.g. "yourname@okhdfcbank") and visitors get a QR code + "Pay with UPI app"
  //    button for the exact amount right after booking.
  upiId: "",
  upiPayeeName: "V Hospitality",
  //    Card / Net Banking: paste Razorpay (or any) payment-page links here.
  paymentLinks: {
    stay: "",    // Pandora City stays
    passes: "",  // Forever FYRE passes
    books: ""    // Book pre-booking
  },

  // 3) FIREBASE (free) — powers Talk2Me accounts & live chat, comments, likes,
  //    and keeps a copy of every booking/message in your Owner dashboard (admin.html).
  //    Paste the config object from Firebase console → Project settings → Your apps → Web app.
  //    Leave as null until then; the site keeps working by email in the meantime.
  firebase: null,
  /* Example:
  firebase: {
    apiKey: "AIza...",
    authDomain: "vishal-singh-site.firebaseapp.com",
    projectId: "vishal-singh-site",
    storageBucket: "vishal-singh-site.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abc123"
  },
  */

  // Developer use only: talk to the local Firebase emulators instead of the live project.
  useEmulator: false
};
