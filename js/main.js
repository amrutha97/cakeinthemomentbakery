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

// Sort each post into "cupcake", "cake", or "other" (cookies, cake pops…) from its caption.
function categorize(caption = "") {
  const c = caption.toLowerCase();
  if (c.includes("cupcake")) return "cupcake";
  if (/cake ?pops?\b|cookie set|royalicingcookie|cookiedecor/.test(c)) return "other";
  return "cake";
}

function postTile(post) {
  const img = post.image || post.thumbnail_url || post.media_url;
  const caption = (post.caption || "Custom cake by Cake in the Moment").trim();
  const firstLine = caption.split("\n")[0];
  const badge = post.media_type === "VIDEO" ? VIDEO_ICON : post.media_type === "CAROUSEL_ALBUM" ? ALBUM_ICON : "";
  return `<a class="ig-item" href="${escapeHtml(post.permalink || SITE.instagramUrl)}" target="_blank" rel="noopener"
             data-category="${categorize(caption)}">
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
  // No real posts yet (placeholders only) → nothing to filter
  if (!grid.querySelector("[data-category]")) { bar.hidden = true; return; }
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    const want = btn.dataset.filter;
    grid.querySelectorAll(".ig-item").forEach((item) => {
      item.hidden = Boolean(want && item.dataset.category !== want);
    });
  });
}

loadFeed();

/* ---------- Themed dropdowns (enhances native <select>) ---------- */
function enhanceSelect(select) {
  const wrap = document.createElement("div");
  wrap.className = "dropdown";
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
  select.classList.add("dropdown-native");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  const label = document.querySelector(`label[for="${select.id}"]`);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dropdown-btn";
  btn.id = `${select.id}-btn`;
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  if (label) { label.htmlFor = btn.id; }

  const list = document.createElement("ul");
  list.className = "dropdown-list";
  list.id = `${select.id}-list`;
  list.setAttribute("role", "listbox");
  list.tabIndex = -1;
  btn.setAttribute("aria-controls", list.id);

  const opts = [...select.options].filter((o) => o.value !== "");
  opts.forEach((o, idx) => {
    const li = document.createElement("li");
    li.id = `${select.id}-opt-${idx}`;
    li.setAttribute("role", "option");
    li.textContent = o.text;
    li.dataset.value = o.value;
    list.appendChild(li);
  });
  wrap.append(btn, list);

  const items = [...list.children];
  let active = -1;

  const render = () => {
    const current = select.value;
    btn.innerHTML = `<span class="${current ? "" : "placeholder"}">${escapeHtml(current || select.options[0].text)}</span>`;
    items.forEach((li) => li.setAttribute("aria-selected", String(li.dataset.value === current)));
  };
  const setActive = (i) => {
    active = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((li, j) => li.classList.toggle("active", j === active));
    list.setAttribute("aria-activedescendant", items[active].id);
    items[active].scrollIntoView({ block: "nearest" });
  };
  const open = () => {
    document.querySelectorAll(".dropdown.open").forEach((d) => d !== wrap && d.close?.());
    wrap.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    const sel = items.findIndex((li) => li.dataset.value === select.value);
    setActive(sel >= 0 ? sel : 0);
    list.focus();
  };
  const close = (refocus = true) => {
    wrap.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    if (refocus) btn.focus();
  };
  wrap.close = () => close(false);
  const choose = (i) => {
    select.value = items[i].dataset.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    render();
    close();
  };

  btn.addEventListener("click", () => (wrap.classList.contains("open") ? close() : open()));
  btn.addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); open(); }
  });
  list.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(items.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") { close(false); }
  });
  list.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (li) choose(items.indexOf(li));
  });
  list.addEventListener("mousemove", (e) => {
    const li = e.target.closest("li");
    if (li && items.indexOf(li) !== active) setActive(items.indexOf(li));
  });
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target) && wrap.classList.contains("open")) close(false);
  });
  // If browser validation focuses the hidden select, send focus to our button
  select.addEventListener("focus", () => btn.focus());
  select.addEventListener("invalid", () => wrap.classList.add("invalid"));
  select.addEventListener("change", () => { wrap.classList.remove("invalid"); render(); });

  render();
}

// Custom dropdown on desktop; phones keep their native picker (styled via CSS)
if (window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".form-card select").forEach(enhanceSelect);
}

/* ---------- Inquiry form → copy-ready message ---------- */
const form = document.querySelector("#inquiry-form");
if (form) {
  const status = form.querySelector(".form-status");
  const panel = form.querySelector(".message-panel");
  const preview = form.querySelector(".message-preview");
  const val = (name) => (form.elements[name]?.value || "").trim();

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(`${iso}T12:00:00`);
    return isNaN(d) ? iso : d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const buildMessage = () => {
    const fields = [
      ["Name", val("name")], ["Email", val("email")], ["Phone", val("phone")],
      ["Event date", formatDate(val("date"))], ["Occasion", val("occasion")], ["Order type", val("type")],
      ["Servings / guests", val("servings")], ["Flavor ideas", val("flavor")], ["How I found you", val("referral")],
    ];
    const details = fields.filter(([, v]) => v).map(([label, v]) => `${label}: ${v}`);
    return [
      "Hi Cake in the Moment! I'd love to inquire about a custom order.",
      details.join("\n"),
      `Design details:\n${val("details") || "(I'll send inspiration photos!)"}`,
      "Thank you!",
    ].join("\n\n");
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Fallback for older browsers / non-secure contexts
      preview.focus();
      preview.select();
      try { return document.execCommand("copy"); } catch (_) { return false; }
    }
  };

  const copyAndReport = async () => {
    const ok = await copyText(preview.value);
    status.textContent = ok
      ? "Copied to your clipboard! Now paste it into an email or Instagram DM."
      : "Select the message below and copy it, then paste it into an email or Instagram DM.";
    status.classList.toggle("success", ok);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    preview.value = buildMessage();
    panel.hidden = false;
    preview.style.height = "auto";
    preview.style.height = `${preview.scrollHeight + 4}px`;
    await copyAndReport();
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  form.querySelector(".copy-again")?.addEventListener("click", copyAndReport);

  // Don't allow past dates
  const date = form.elements.date;
  if (date) date.min = new Date().toISOString().split("T")[0];
}
