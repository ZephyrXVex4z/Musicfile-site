import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { TYPES, NAV, navLabel, navFilter, FIELDS, FILTERS, norm, SITE } from "./js/music.js";
import { fetchReleases, getRelease, removeRelease, rate, getMyRating } from "./js/data.js";
import { $, h, toast, fail, dlg, openDlg, closeDlg, confirmDlg, card, skeletons, showPost } from "./js/ui.js";
import { openUpload, openReport, openReportsList } from "./js/forms.js";
import { openAuth, isAdmin } from "./js/auth.js";

const S = { user: null, admin: false, key: "home", q: "", sig: "", items: [], cursor: null, more: false, sort: "new", filters: {}, dirty: false };
let lastList = "#/home";
const main = $("#main");
const refresh = () => show(S.key, S.q, true);
const back = () => { location.hash = lastList; };
const myName = () => S.user?.displayName || "Usuario";
const err = e => {
  if (e?.code !== "failed-precondition") return fail(e);
  console.error(e);
  const u = (e.message || "").match(/https:\/\/console\.firebase\.google\.com\S+/)?.[0];
  openDlg(h("h2", {}, "Falta un índice de Firestore"),
    h("p", {}, "Esta consulta necesita un índice. Créalo con el enlace, espera a que termine y recarga."),
    u ? h("p", {}, h("a", { href: u, target: "_blank", rel: "noopener noreferrer" }, "Crear índice en Firebase")) : h("p", {}, "Crea los índices de firestore.indexes.json desde la consola de Firebase."),
    h("p", { class: "mute" }, "Detalle del error:"), h("pre", { class: "pre errbox" }, e.message || String(e)),
    h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: closeDlg }, "Cerrar")));
};

/* ---------- Cabecera y sesión ---------- */
$("#themeBtn").onclick = () => {
  const n = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = n; try { localStorage.setItem("nx-theme", n); } catch {}
};
$("#logoutBtn").onclick = () => signOut(auth);
$("#loginBtn").onclick = () => openAuth();
$("#uploadBtn").onclick = upload;
$("#menuBtn").onclick = e => { const o = $("#side").classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", o); };
$("#searchForm").addEventListener("submit", e => {
  e.preventDefault(); const t = $("#q").value.trim();
  location.hash = "#/c/" + (["home", "top"].includes(S.key) ? "all" : S.key) + (t ? "?q=" + encodeURIComponent(t) : "");
});
$("#reportGen").onclick = () => openReport(null);
dlg.addEventListener("close", () => { if (location.hash.startsWith("#/p/")) back(); if (S.dirty) { S.dirty = false; refresh(); } });
function upload() { S.user ? openUpload(null, refresh, S.user, myName()) : openAuth("Inicia sesión o crea una cuenta para subir música."); }

onAuthStateChanged(auth, async u => {
  S.user = u; S.admin = u ? await isAdmin(u) : false;
  $("#who").textContent = u ? (u.displayName || u.email || "") + (S.admin ? " · Admin" : "") : "";
  $("#logoutBtn").hidden = !u; $("#loginBtn").hidden = !!u;
  S.sig = ""; route();
});

/* ---------- Menú ---------- */
const href = k => k === "home" ? "#/home" : "#/c/" + k;
function renderNav() {
  const link = ([k, l, i]) => h("a", { href: href(k), "aria-current": k === S.key ? "page" : null }, h("span", { "aria-hidden": "true" }, i), l);
  $("#side").replaceChildren(...NAV.map(([t, items]) => h("div", { class: "ng" }, h("h4", {}, t), ...items.map(link))),
    S.user && h("div", { class: "ng" }, h("h4", {}, "Mi cuenta"), link(["mine", "Mis publicaciones", "📁"])),
    S.admin && h("div", { class: "ng" }, h("h4", {}, "Administración"), h("button", { class: "btn", type: "button", onclick: openReportsList }, "Reportes")));
}

/* ---------- Rutas ---------- */
async function route() {
  const hash = location.hash || "#/home", [path, qs] = hash.slice(1).split("?"), parts = path.split("/").filter(Boolean);
  if (parts[0] === "p") { if (!S.sig) await show("home", ""); return openById(parts[1]); }
  if (dlg.open) closeDlg();
  lastList = hash;
  show(parts[0] === "c" ? parts[1] || "home" : "home", new URLSearchParams(qs).get("q") || "");
}
window.addEventListener("hashchange", route);

const ctx = {
  get user() { return S.user; }, get admin() { return S.admin; },
  login: () => openAuth("Inicia sesión para valorar."),
  mine: r => getMyRating(r.id, S.user.uid),
  edit: r => openUpload(r, refresh, S.user, myName()),
  report: r => openReport(r),
  share: async r => { try { await navigator.clipboard.writeText(location.origin + location.pathname + "#/p/" + r.id); toast("Enlace copiado"); } catch { toast("No se pudo copiar el enlace."); } },
  remove: async r => { if (!(await confirmDlg(`Se eliminará «${r.title}». Esta acción no se puede deshacer.`))) return; try { await removeRelease(r.id); closeDlg(); toast("Publicación eliminada"); refresh(); } catch (e) { fail(e); } },
  rate: async (r, v) => {
    try { await rate(r.id, S.user.uid, v); toast("¡Gracias por tu valoración!"); S.dirty = true; const f = await getRelease(r.id); if (f) showPost(f, ctx); }
    catch (e) { fail(e); }
  }
};
async function openById(id) {
  try {
    const r = await getRelease(id);
    if (!r) { toast("Publicación no encontrada."); return back(); }
    document.title = `${r.title} · ${SITE}`; showPost(r, ctx);
  } catch { toast("Publicación no disponible."); back(); }
}
async function show(key, q, force) {
  const sig = [key, q, S.user?.uid || "", S.admin].join("|");
  if (sig === S.sig && !force) return;
  Object.assign(S, { key, q, sig, filters: {}, sort: key === "top" ? "top" : "new" });
  $("#q").value = q; renderNav(); $("#side").classList.remove("open");
  document.title = (key === "home" ? "" : navLabel(key) + " · ") + SITE;
  key === "home" && !q ? home() : list(true);
}

/* ---------- Inicio ---------- */
const SECTIONS = [
  ["Mejor valoradas", null, "top", "top"],
  ["Recién añadidas", null, "all", "new"],
  ["Álbumes", { scope: "type:album" }, "album", "new"],
  ["Sencillos y EP", { any: ["type:single", "type:ep"] }, null, "new"]
];
async function home() {
  const sig = S.sig;
  main.replaceChildren(h("h1", {}, "Música para descargar"), h("p", { class: "mute" }, "Álbumes, sencillos y EP compartidos por la comunidad, con enlaces a servicios externos."),
    h("nav", { class: "chips", "aria-label": "Tipos" }, ...Object.entries(TYPES).map(([k, t]) => h("a", { class: "chip", href: href(k) }, t.icon + " " + t.plural))),
    h("div", { id: "secs" }, h("div", { class: "grid" }, ...skeletons(6))));
  let res;
  try { res = await Promise.all(SECTIONS.map(s => fetchReleases({ filter: s[1], sort: s[3], size: 8 }).then(r => r.items))); } catch (e) { err(e); res = []; }
  if (sig !== S.sig) return;
  res = res.map((r, i) => i === 0 ? r.filter(x => x.ratingCount > 0) : r);
  const secs = SECTIONS.map((s, i) => res[i]?.length && h("section", { class: "sec" },
    h("div", { class: "sech" }, h("h2", {}, s[0]), s[2] && h("a", { href: href(s[2]) }, "Ver todo")), h("div", { class: "grid" }, ...res[i].map(card)))).filter(Boolean);
  $("#secs").replaceChildren(...(secs.length ? secs : [h("div", { class: "empty" }, "Todavía no hay música publicada.", h("br"), h("button", { class: "btn primary", type: "button", onclick: upload }, "Sube la primera"))]));
}

/* ---------- Listados ---------- */
async function list(reset) {
  const sig = S.sig, tok = norm(S.q).split(/[^a-z0-9]+/).filter(t => t.length >= 2)[0] || "";
  if (reset) {
    Object.assign(S, { items: [], cursor: null, more: false });
    main.replaceChildren(h("h1", {}, navLabel(S.key) + (S.q ? ` · «${S.q}»` : "")), h("div", { id: "tools", class: "tools" }),
      h("div", { id: "grid", class: "grid" }, ...skeletons(8)), h("p", { id: "state", class: "empty", hidden: true }),
      h("div", { class: "more" }, h("button", { class: "btn", id: "moreBtn", type: "button", hidden: true, onclick: () => list(false) }, "Cargar más")));
    if (S.key === "mine" && !S.user) { $("#grid").replaceChildren(); $("#state").hidden = false; $("#state").textContent = "Inicia sesión para ver tus publicaciones."; return; }
  }
  try {
    const r = await fetchReleases({ filter: navFilter(S.key), token: tok, sort: S.sort === "az" ? "new" : S.sort, author: S.key === "mine" ? S.user.uid : null, cursor: S.cursor });
    if (sig !== S.sig) return;
    S.items.push(...r.items); S.cursor = r.last; S.more = r.more;
  } catch (e) { err(e); S.more = false; }
  paintTools(); paintGrid();
}
const hasVal = (m, f, v) => { const x = m?.[f]; return Array.isArray(x) ? x.map(String).includes(v) : String(x ?? "") === v; };
function paintTools() {
  const box = $("#tools"); if (!box) return;
  const sort = h("select", { "aria-label": "Ordenar" }, h("option", { value: "new" }, "Más recientes"), h("option", { value: "old" }, "Más antiguos"),
    h("option", { value: "top" }, "Mejor valoradas"), h("option", { value: "az" }, "Alfabético (cargados)"));
  sort.value = S.sort;
  sort.onchange = () => { const old = S.sort; S.sort = sort.value; if (old === "az" || S.sort === "az") paintGrid(); else list(true); };
  const sels = FILTERS.map(f => {
    const def = FIELDS.find(d => d.k === f), vals = new Set();
    S.items.forEach(p => { const x = p.meta?.[f]; (Array.isArray(x) ? x : x != null && x !== "" ? [x] : []).forEach(v => vals.add(String(v))); });
    if (!vals.size) return null;
    const s = h("select", { "aria-label": def.label }, h("option", { value: "" }, def.label + ": todos"), ...[...vals].sort().map(v => h("option", { value: v }, v)));
    s.value = S.filters[f] || ""; s.onchange = () => { S.filters[f] = s.value; paintGrid(); }; return s;
  }).filter(Boolean);
  box.replaceChildren(sort, ...sels);
}
function paintGrid() {
  const rest = S.q.split(/\s+/).slice(1).map(norm).filter(Boolean);
  let rows = S.items.filter(p => (S.key !== "top" || p.ratingCount > 0) && Object.entries(S.filters).every(([f, v]) => !v || hasVal(p.meta, f, v)) &&
    rest.every(w => norm(p.title + " " + JSON.stringify(p.meta || {})).includes(w)));
  if (S.sort === "az") rows = [...rows].sort((a, b) => a.title.localeCompare(b.title, "es"));
  $("#grid").replaceChildren(...rows.map(card));
  const st = $("#state"); st.hidden = rows.length > 0 || S.more;
  st.textContent = S.items.length ? "Ninguna publicación coincide con los filtros." : S.q ? "Sin resultados para la búsqueda." : "Todavía no hay música en esta sección.";
  $("#moreBtn").hidden = !S.more;
}
