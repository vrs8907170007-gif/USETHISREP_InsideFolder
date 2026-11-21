// Shared header/footer injector so every page stays in sync.
// Edit NAV and SOCIAL_LINKS here only.
document.documentElement.classList.add("js");
(function(){
  const NAV = [
    ["index.html", "Home"],
    ["Story", [["about.html", "About Me"], ["accomplishments.html", "Accomplishments"], ["experience.html", "Experience & Work"]]],
    ["Ventures", [["pandora-city.html", "Pandora City"], ["forever-fyre.html", "Forever FYRE"]]],
    ["talk2me.html", "Talk2Me"],
    ["gallery.html", "Gallery"],
    ["contribution.html", "Contribution"],
    ["bookstore.html", "Bookstore"],
    ["library.html", "Library"],
    ["contact.html", "Contact"],
  ];

  function currentFile(){
    const p = window.location.pathname.split("/").pop();
    return p === "" ? "index.html" : p;
  }

  function navLink(href, label, cur){
    return `<a href="${href}" class="${href === cur ? "active" : ""}"${href === cur ? ' aria-current="page"' : ""}>${label}</a>`;
  }

  function buildHeader(){
    const cur = currentFile();
    const header = document.createElement("header");
    header.className = "site-header";
    const items = NAV.map(([a, b]) => {
      if (Array.isArray(b)) {
        const active = b.some(([href]) => href === cur);
        return `<div class="nav-group${active ? " has-active" : ""}">
          <button type="button" aria-expanded="false">${a}</button>
          <div class="nav-menu">${b.map(([href, label]) => navLink(href, label, cur)).join("")}</div>
        </div>`;
      }
      return navLink(a, b, cur);
    }).join("");
    header.innerHTML = `
      <div class="shell">
        <a href="index.html" class="brand">Vishal Singh <span>/ journal</span></a>
        <nav class="main-nav" id="mainNav" aria-label="Main">${items}</nav>
        <button class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="mainNav">Menu</button>
      </div>`;
    document.body.prepend(header);

    // cart badge (shows only when the visitor has books in their cart)
    const paintCart = () => {
      let n = 0; try { n = (JSON.parse(localStorage.getItem("vs_cart") || "[]") || []).reduce((s, x) => s + ((x && x.qty) || 1), 0); } catch (e) {}
      let a = header.querySelector(".nav-cart");
      if (!n) { if (a) a.remove(); return; }
      if (!a) { a = document.createElement("a"); a.href = "checkout.html"; a.className = "nav-cart"; header.querySelector("#mainNav").appendChild(a); }
      a.innerHTML = 'Cart <b>' + n + '</b>';
      if (cur === "checkout.html") a.classList.add("active");
    };
    paintCart();
    document.addEventListener("vs-cart", paintCart);
    window.addEventListener("storage", (e) => { if (e.key === "vs_cart") paintCart(); });

    document.getElementById("navToggle").addEventListener("click", function(){
      const nav = document.getElementById("mainNav");
      const open = nav.classList.toggle("open");
      this.setAttribute("aria-expanded", open ? "true" : "false");
      this.textContent = open ? "Close" : "Menu";
    });
    header.querySelectorAll(".nav-group > button").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const g = btn.parentElement;
        const open = !g.classList.contains("open");
        header.querySelectorAll(".nav-group").forEach(x => { x.classList.remove("open"); x.firstElementChild.setAttribute("aria-expanded","false"); });
        if (open) { g.classList.add("open"); btn.setAttribute("aria-expanded","true"); }
      });
    });
    document.addEventListener("click", () => header.querySelectorAll(".nav-group.open").forEach(x => x.classList.remove("open")));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") header.querySelectorAll(".nav-group.open").forEach(x => x.classList.remove("open")); });
  }

  function buildVentureDock(){
    const cur = currentFile();
    const dock = document.createElement("div");
    dock.className = "venture-dock";
    const items = [
      ["pandora-city.html", "emerald", "PC", "Pandora City"],
      ["forever-fyre.html", "flame", "FF", "Forever FYRE"],
      ["talk2me.html", "violet", "T2", "Talk2Me"],
    ].filter(([href]) => href !== cur);
    dock.innerHTML = items.map(([href, cls, initials, label]) =>
      `<a href="${href}" class="dock-btn ${cls}" title="${label}" aria-label="${label}">${initials}</a>`
    ).join("");
    document.body.appendChild(dock);
  }

  function initScrollReveal(){
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("in"); });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }

  const SOCIAL_LINKS = [
    {
      name: "Instagram — Personal",
      url: "https://www.instagram.com/p.svishal?igsi=MWEwMWV3am5xbHVqZg==",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>`
    },
    {
      name: "Instagram — Tipsy Monkee",
      url: "https://www.instagram.com/tipsy_monkee?igsi=YzZ1ZHF4OHIyZXZ5",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>`
    },
    {
      name: "Facebook — Personal",
      url: "https://www.facebook.com/share/1C3B7XCUGo/",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V9z"/></svg>`
    },
    {
      name: "Facebook — Tipsy Monkee",
      url: "https://www.facebook.com/share/17eL7XwxPM/",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V9z"/></svg>`
    },
    {
      name: "YouTube — V Blog",
      url: "https://youtube.com/@vsnonchalant?si=f0KH-K_Ct0YsUG5W",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="6" width="19" height="12" rx="3"/><path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none"/></svg>`
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/in/nonchalantvs?utm_source=share_via&utm_content=profile&utm_medium=member_android",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="7.5" y1="10" x2="7.5" y2="17"/><circle cx="7.5" cy="6.8" r="0.9" fill="currentColor" stroke="none"/><path d="M11.5 17v-4.5c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5V17"/><line x1="11.5" y1="10" x2="11.5" y2="17"/></svg>`
    }
  ];

  function buildFooter(){
    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="shell">
        <div>© ${new Date().getFullYear()} Vishal Singh · V Hospitality Pvt. Ltd.</div>
        <div class="footer-links">
          <a href="contact.html">Contact</a>
          <a href="library.html">Library</a>
          <a href="gallery.html">Gallery</a>
          <a href="talk2me.html">Talk2Me</a>
          <a href="admin.html" rel="nofollow">Owner login</a>
        </div>
        <div class="footer-links footer-legal">
          <a href="terms.html">Terms</a>
          <a href="privacy.html">Privacy</a>
          <a href="refund-policy.html">Refunds &amp; Cancellations</a>
          <a href="shipping-policy.html">Shipping &amp; Delivery</a>
        </div>
        <div class="social-row">
          ${SOCIAL_LINKS.map(s => `
            <a href="${s.url}" class="social-icon" target="_blank" rel="noopener" aria-label="${s.name}">
              ${s.icon}
              <span class="tooltip">${s.name}</span>
            </a>
          `).join("")}
        </div>
      </div>`;
    document.body.appendChild(footer);
  }

  document.addEventListener("DOMContentLoaded", function(){
    buildHeader();
    buildVentureDock();
    buildFooter();
    initScrollReveal();
  });
})();
