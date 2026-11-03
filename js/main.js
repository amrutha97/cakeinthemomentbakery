/* Cake in the Moment — site behavior */
const SITE = {
  instagramHandle: "cakeinthemomentbakery",
  instagramUrl: "https://www.instagram.com/cakeinthemomentbakery/",
  instagramDm: "https://ig.me/m/cakeinthemomentbakery",
  email: "cakinthemomentbakery@gmail.com",
  feedUrl: "data/instagram.json",
};

/* ---------- Mobile nav ---------- */
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");
if (toggle && links) {
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

/* ---------- Footer year ---------- */
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------- Reveal on scroll ---------- */
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }),
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("in"));
}

/* ---------- Instagram feed ---------- */
const IG_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.7" r="1.1" fill="currentColor"/></svg>`;
const VIDEO_ICON = `<svg class="ig-badge" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>`;
const ALBUM_ICON = `<svg class="ig-badge" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

const escapeHtml = (s = "") =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function placeholderTiles(count) {
  return Array.from({ length: count }, () =>
    `<a class="ig-item ig-placeholder" href="${SITE.instagramUrl}" target="_blank" rel="noopener">
       <span>${IG_ICON}See our latest<br>on Instagram</span>
     </a>`
  ).join("");
}

function postTile(post) {
  const img = post.image || post.thumbnail_url || post.media_url;
  const caption = (post.caption || "Custom cake by Cake in the Moment").trim();
  const firstLine = caption.split("\n")[0];
  const badge = post.media_type === "VIDEO" ? VIDEO_ICON : post.media_type === "CAROUSEL_ALBUM" ? ALBUM_ICON : "";
  return `<a class="ig-item" href="${escapeHtml(post.permalink || SITE.instagramUrl)}" target="_blank" rel="noopener"
             data-caption="${escapeHtml(caption.toLowerCase())}">
      <img src="${escapeHtml(img)}" alt="${escapeHtml(firstLine.slice(0, 120))}" loading="lazy" decoding="async">
      ${badge}
      <span class="ig-overlay"><p>${escapeHtml(caption.slice(0, 180))}</p></span>
    </a>`;
}

async function loadFeed() {
  const grids = document.querySelectorAll("[data-ig-feed]");
  if (!grids.length) return;

  let posts = [];
  try {
    const res = await fetch(SITE.feedUrl, { cache: "no-cache" });
    if (res.ok) posts = (await res.json()).posts || [];
  } catch (_) { /* offline or opened from file:// — fall back to placeholders */ }

  grids.forEach((grid) => {
    const limit = Number(grid.dataset.limit) || 24;
    const items = posts.filter((p) => p.image || p.media_url || p.thumbnail_url).slice(0, limit);
    grid.innerHTML = items.length ? items.map(postTile).join("") : placeholderTiles(Math.min(limit, 8));
  });

  setupFilters();
}

function setupFilters() {
  const bar = document.querySelector(".filter-bar");
  const grid = document.querySelector("[data-ig-feed][data-filterable]");
  if (!bar || !grid) return;
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    const terms = (btn.dataset.filter || "").split(",").filter(Boolean);
    grid.querySelectorAll(".ig-item").forEach((item) => {
      const cap = item.dataset.caption;
      item.hidden = Boolean(terms.length && cap !== undefined && !terms.some((t) => cap.includes(t)));
    });
  });
}

loadFeed();

/* ---------- Inquiry form → email draft / Instagram DM ---------- */
const form = document.querySelector("#inquiry-form");
if (form) {
  const status = form.querySelector(".form-status");
  const val = (name) => (form.elements[name]?.value || "").trim();

  const buildMessage = () => {
    const fields = [
      ["Name", "name"], ["Email", "email"], ["Phone", "phone"], ["Event date", "date"],
      ["Occasion", "occasion"], ["Order type", "type"], ["Servings / guests", "servings"],
      ["Flavor ideas", "flavor"], ["Pickup or delivery", "fulfillment"], ["Budget", "budget"],
      ["How I found you", "referral"],
    ];
    const details = fields.filter(([, k]) => val(k)).map(([label, k]) => `${label}: ${val(k)}`);
    return [
      "Hi Cake in the Moment! I'd love to inquire about a custom order.",
      details.join("\n"),
      `Design details:\n${val("details") || "(I'll send inspiration photos!)"}`,
    ].join("\n\n");
  };

  const subject = () => `Cake Inquiry – ${val("occasion") || "Custom Order"} on ${val("date") || "TBD"}`;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(buildMessage())}`;
    window.location.href = href;
    status.textContent = "Opening your email app with your inquiry drafted. Attach inspiration photos, then hit send!";
  });

  form.querySelector("[data-dm]")?.addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    try {
      await navigator.clipboard.writeText(buildMessage());
      status.textContent = "Inquiry copied! Paste it into the Instagram message that just opened.";
    } catch (_) {
      status.textContent = "Opening Instagram — tell us your date, servings and design idea in the message.";
    }
    window.open(SITE.instagramDm, "_blank", "noopener");
  });

  // Don't allow past dates
  const date = form.elements.date;
  if (date) date.min = new Date().toISOString().split("T")[0];
}
