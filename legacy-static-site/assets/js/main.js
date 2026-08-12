function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function productCard(p) {
  return `
    <article class="card">
      <div class="card-img"><img src="${p.img}" alt="${escapeHtml(p.name)}" loading="lazy"></div>
      <div class="card-body">
        <span class="badge">${escapeHtml(p.category)}</span>
        <h3>${escapeHtml(p.name)}</h3>
        <p class="specs">${escapeHtml(p.specs)}</p>
        <div class="card-actions">
          <a class="btn btn-whatsapp" target="_blank" rel="noopener" href="${waLink(p.name)}">WhatsApp Enquiry</a>
          <a class="btn btn-outline" href="${mailLink(p.name)}">Email</a>
        </div>
      </div>
    </article>`;
}

function renderProductGrid(containerId, opts = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const list = opts.category && opts.category !== "All"
    ? PRODUCTS.filter(p => p.category === opts.category)
    : PRODUCTS;
  const items = opts.limit ? list.slice(0, opts.limit) : list;
  el.innerHTML = items.length
    ? items.map(productCard).join("")
    : `<p class="empty">No products in this category yet.</p>`;
}

function renderCategoryChips(containerId, gridId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const categories = ["All", ...new Set(PRODUCTS.map(p => p.category))];
  el.innerHTML = categories
    .map((c, i) => `<button class="chip${i === 0 ? " active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
    .join("");
  el.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    el.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    renderProductGrid(gridId, { category: btn.dataset.cat });
  });
}

function applySiteConfig() {
  document.querySelectorAll("[data-site]").forEach(elm => {
    const key = elm.getAttribute("data-site");
    if (key === "whatsapp-href") elm.href = waLink();
    else if (key === "mail-href") elm.href = mailLink();
    else if (key === "logo-src") elm.src = SITE_CONFIG.logo;
    else if (SITE_CONFIG[key] !== undefined) elm.textContent = SITE_CONFIG[key];
  });
}

function initNav() {
  const toggle = document.getElementById("nav-toggle");
  const menu = document.getElementById("nav-menu");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => menu.classList.toggle("open"));
}

document.addEventListener("DOMContentLoaded", () => {
  applySiteConfig();
  initNav();
  renderCategoryChips("category-chips", "product-grid");
  renderProductGrid("product-grid");
  renderProductGrid("featured-grid", { limit: 3 });
});
