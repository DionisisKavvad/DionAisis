const sidebarEl = document.getElementById("sidebar");
const iframeEl = document.getElementById("page");
const emptyEl = document.getElementById("empty-state");
const emptyListEl = document.getElementById("empty-list");
const breadcrumbEl = document.getElementById("breadcrumb");
const toggleBtn = document.getElementById("toggle-sidebar");

const SIDEBAR_KEY = "dionai-wiki-sidebar";

let manifest = null;

async function loadManifest() {
  const res = await fetch("./manifest.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
  return res.json();
}

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  if (!raw) return null;
  const [group, page] = raw.split("/");
  if (!group || !page) return null;
  return { group, page };
}

function resolveEntry(manifest, groupSlug, pageSlug) {
  const group = manifest.groups.find((g) => g.slug === groupSlug);
  if (!group) return null;
  const page = group.pages.find((p) => p.slug === pageSlug);
  if (!page) return null;
  return { group, page };
}

function renderSidebar(manifest, activeHash) {
  sidebarEl.innerHTML = "";
  for (const group of manifest.groups) {
    const section = document.createElement("div");
    section.className = "group";

    const title = document.createElement("div");
    title.className = "group-title";
    title.textContent = group.title;
    section.appendChild(title);

    for (const page of group.pages) {
      const link = document.createElement("a");
      const hash = `#/${group.slug}/${page.slug}`;
      link.className = "page-link";
      link.href = hash;
      link.textContent = page.title;
      if (hash === activeHash) link.classList.add("active");
      section.appendChild(link);
    }
    sidebarEl.appendChild(section);
  }
}

function renderBreadcrumb(entry) {
  breadcrumbEl.innerHTML = "";

  const root = document.createElement("a");
  root.className = "crumb root";
  root.href = "#/";
  root.textContent = "DionAi Wiki";
  breadcrumbEl.appendChild(root);

  if (!entry) return;

  const { group, page } = entry;

  const sep1 = document.createElement("span");
  sep1.className = "crumb-sep";
  sep1.textContent = "›";
  breadcrumbEl.appendChild(sep1);

  const groupCrumb = document.createElement("a");
  groupCrumb.className = "crumb";
  groupCrumb.href = "#/";
  groupCrumb.textContent = group.title;
  breadcrumbEl.appendChild(groupCrumb);

  const sep2 = document.createElement("span");
  sep2.className = "crumb-sep";
  sep2.textContent = "›";
  breadcrumbEl.appendChild(sep2);

  const pageCrumb = document.createElement("span");
  pageCrumb.className = "crumb current";
  pageCrumb.textContent = page.title;
  breadcrumbEl.appendChild(pageCrumb);
}

function showEmptyState(manifest) {
  iframeEl.hidden = true;
  iframeEl.removeAttribute("src");
  emptyEl.hidden = false;
  renderBreadcrumb(null);
  document.title = "DionAi Wiki";

  emptyListEl.innerHTML = "";
  for (const group of manifest.groups) {
    for (const page of group.pages) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#/${group.slug}/${page.slug}`;
      a.innerHTML = `<span class="group-label">${group.title}</span>${page.title}`;
      li.appendChild(a);
      emptyListEl.appendChild(li);
    }
  }
}

function setActivePage(entry) {
  const { group, page } = entry;
  iframeEl.hidden = false;
  emptyEl.hidden = true;
  if (iframeEl.getAttribute("src") !== page.path) {
    iframeEl.setAttribute("src", page.path);
  }
  renderBreadcrumb(entry);
  document.title = `${page.title} — DionAi Wiki`;
}

function route() {
  if (!manifest) return;
  const parsed = parseHash();
  const activeHash = parsed ? `#/${parsed.group}/${parsed.page}` : "";
  renderSidebar(manifest, activeHash);

  if (!parsed) {
    showEmptyState(manifest);
    return;
  }
  const entry = resolveEntry(manifest, parsed.group, parsed.page);
  if (!entry) {
    showEmptyState(manifest);
    return;
  }
  setActivePage(entry);
}

function initSidebarToggle() {
  const saved = localStorage.getItem(SIDEBAR_KEY);
  if (saved === "collapsed") document.body.classList.add("sidebar-collapsed");

  toggleBtn.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("sidebar-collapsed");
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "open");
  });
}

async function init() {
  initSidebarToggle();
  try {
    manifest = await loadManifest();
  } catch (err) {
    sidebarEl.innerHTML = `<div class="group-title">Error</div><div style="padding:8px 16px;color:#ff8080">${err.message}</div>`;
    return;
  }
  route();
  window.addEventListener("hashchange", route);
}

init();
