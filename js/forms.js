import { TYPES, FIELDS, SERVICES, detectService, safeUrl } from "./music.js";
import { h, $, openDlg, closeDlg, toast, fail, confirmDlg, card } from "./ui.js";
import { saveRelease, sendReport, listReports, removeReport } from "./data.js";

function ctl(d, v) {
  const id = "m_" + d.k; let c;
  if (d.type === "textarea") c = h("textarea", { id, maxlength: 4000 });
  else if (d.type === "select") c = h("select", { id }, h("option", { value: "" }, ""), ...d.opts.map(o => h("option", { value: o }, o)));
  else c = h("input", { id, type: d.type === "list" ? "text" : d.type, maxlength: 500, step: d.type === "number" ? "any" : null });
  c.value = Array.isArray(v) ? v.join(", ") : v ?? "";
  return h("label", {}, d.label + (d.type === "list" ? " (separados por comas)" : "") + (d.req ? " *" : ""), c);
}
function readMeta() {
  const m = {};
  for (const d of FIELDS) {
    const raw = $("#m_" + d.k)?.value.trim(); if (!raw) continue;
    if (d.type === "list") m[d.k] = raw.split(",").map(s => s.trim()).filter(Boolean);
    else if (d.type === "number") { const n = Number(raw); if (Number.isFinite(n)) m[d.k] = n; }
    else m[d.k] = raw;
  }
  return m;
}
function dlRow(d, list) {
  const f = (name, label, type = "text", v = "") => h("label", {}, label, h("input", { name, type, value: v, step: type === "number" ? "any" : null }));
  const url = h("input", { name: "url", type: "url", value: d.url || "", required: true });
  const svc = h("select", { name: "service" }, ...SERVICES.map(s => h("option", { value: s }, s)));
  svc.value = d.service || (d.url ? detectService(d.url) : "MEGA");
  url.oninput = () => { if (!svc.dataset.t) svc.value = detectService(url.value); }; svc.onchange = () => { svc.dataset.t = 1; };
  const row = h("fieldset", { class: "dlrow" }, h("label", {}, "Enlace de descarga *", url), h("label", {}, "Servicio", svc),
    f("label", "Nombre o versión del archivo", "text", d.label || ""), f("format", "Formato", "text", d.format || ""),
    f("sizeMB", "Tamaño (MB)", "number", d.sizeBytes ? +(d.sizeBytes / 1048576).toFixed(2) : ""), f("fileName", "Nombre del archivo", "text", d.fileName || ""),
    h("button", { class: "btn danger", type: "button", onclick: () => row.remove() }, "Quitar enlace"));
  list.append(row);
}
function readDownloads(list) {
  return [...list.children].map(r => {
    const g = n => r.querySelector(`[name=${n}]`).value.trim(), d = { url: g("url"), service: g("service") };
    if (g("label")) d.label = g("label"); if (g("format")) d.format = g("format");
    if (g("fileName")) { d.fileName = g("fileName"); const e = d.fileName.split(".").pop(); if (e !== d.fileName) d.ext = e.toLowerCase(); }
    if (Number(g("sizeMB")) > 0) d.sizeBytes = Math.round(Number(g("sizeMB")) * 1048576);
    return d;
  });
}

export function openUpload(p, onSaved, user, authorName) {
  const m0 = p?.meta || {};
  const type = h("select", { id: "f_type" }, ...Object.entries(TYPES).map(([k, t]) => h("option", { value: k }, t.label))); type.value = p?.type || "album";
  const title = h("input", { id: "f_title", required: true, maxlength: 200, value: p?.title ?? "" });
  const desc = h("textarea", { id: "f_desc", maxlength: 4000 }); desc.value = p?.description ?? "";
  const cover = h("input", { id: "f_cover", type: "url", value: p?.cover ?? "" });
  const tags = h("input", { id: "f_tags", value: (p?.tags || []).join(", ") });
  const rights = h("input", { type: "checkbox", id: "f_rights" });
  const dls = h("div", {}), prev = h("div", { id: "prev" }), err = h("p", { class: "error", role: "alert" });
  (p?.downloads?.length ? p.downloads : [{}]).forEach(d => dlRow(d, dls));
  const build = () => {
    const meta = readMeta(), downloads = readDownloads(dls);
    if (!title.value.trim()) return { error: "El título es obligatorio." };
    if (!meta.artist) return { error: "El artista principal es obligatorio." };
    if (cover.value.trim() && !safeUrl(cover.value.trim())) return { error: "La portada debe ser una URL http(s)." };
    if (!downloads.length) return { error: "Añade al menos un enlace de descarga." };
    if (downloads.some(d => !safeUrl(d.url))) return { error: "Cada enlace de descarga debe ser una URL http(s) válida." };
    if (!p && !rights.checked) return { error: "Debes confirmar que tienes derecho a compartir este contenido." };
    return { data: { type: type.value, title: title.value.trim(), description: desc.value.trim(), cover: cover.value.trim(),
      tags: tags.value.split(",").map(s => s.trim()).filter(Boolean), meta, downloads } };
  };
  const save = h("button", { class: "btn primary", type: "button", onclick: async () => {
    const r = build(); err.textContent = r.error || ""; if (r.error) return;
    save.disabled = true; save.textContent = "Guardando…";
    try { await saveRelease(p, r.data, user, authorName); closeDlg(); toast("Publicación guardada"); onSaved(); }
    catch (e) { fail(e); save.disabled = false; save.textContent = "Guardar"; }
  } }, "Guardar");
  openDlg(h("h2", {}, p ? "Editar publicación" : "Subir música"),
    h("label", {}, "Tipo", type), h("label", {}, "Título *", title), ...FIELDS.slice(0, 1).map(d => ctl(d, m0[d.k])),
    h("label", {}, "Portada (URL de imagen)", cover), h("label", {}, "Descripción", desc), h("label", {}, "Etiquetas (separadas por comas)", tags),
    h("div", { class: "metabox" }, ...FIELDS.slice(1).map(d => ctl(d, m0[d.k]))),
    h("h3", {}, "Enlaces de descarga"), dls, h("button", { class: "btn", type: "button", onclick: () => dlRow({}, dls) }, "+ Añadir enlace"),
    !p && h("label", { class: "chk" }, rights, "Confirmo que tengo derecho a compartir este contenido y que los enlaces son míos o tengo permiso para publicarlos."),
    prev, err,
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: closeDlg }, "Cancelar"),
      h("button", { class: "btn", type: "button", onclick: () => {
        const r = build(); err.textContent = r.error || ""; if (r.error) return;
        const c = card({ ...r.data, id: "preview", ratingCount: 0 }); c.addEventListener("click", e => e.preventDefault());
        prev.replaceChildren(h("h3", {}, "Vista previa"), h("div", { class: "grid one" }, c));
      } }, "Vista previa"), save));
  title.focus();
}

export function openReport(p) {
  const reason = h("select", { id: "r_reason" }, ...["Enlace roto", "Contenido publicado sin autorización", "Otro"].map(o => h("option", { value: o }, o)));
  const msg = h("textarea", { id: "r_msg", maxlength: 500 });
  openDlg(h("h2", {}, "Reportar"), p && h("p", {}, p.title), h("label", {}, "Motivo", reason), h("label", {}, "Detalles (opcional)", msg),
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: closeDlg }, "Cancelar"),
      h("button", { class: "btn primary", type: "button", onclick: async () => {
        try { await sendReport({ postId: p?.id || "", postTitle: (p?.title || "").slice(0, 200), reason: reason.value, message: msg.value.trim() }); closeDlg(); toast("Reporte enviado. Gracias."); }
        catch (e) { fail(e); }
      } }, "Enviar")));
}
export async function openReportsList() {
  openDlg(h("h2", {}, "Reportes"), h("p", {}, "Cargando…"));
  try {
    const rs = await listReports(), list = h("div", {});
    rs.forEach(r => list.append(h("div", { class: "frow" }, h("span", {}, h("strong", {}, r.reason), " — ", r.postId ? h("a", { href: "#/p/" + r.postId, onclick: () => closeDlg() }, r.postTitle || r.postId) : "General", r.message && h("small", { class: "block" }, r.message)),
      h("button", { class: "btn danger", type: "button", onclick: async () => { if (await confirmDlg("¿Eliminar este reporte?")) { try { await removeReport(r.id); } catch (x) { fail(x); } } openReportsList(); } }, "Eliminar"))));
    openDlg(h("h2", {}, "Reportes"), rs.length ? list : h("p", {}, "No hay reportes."), h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: closeDlg }, "Cerrar")));
  } catch (e) { fail(e); closeDlg(); }
}
