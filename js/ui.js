import { TYPES, FIELDS, cardLines, fmtDate, fmtSize, serviceName, safeUrl, avg } from "./music.js";

export const $ = s => document.querySelector(s);
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  el.append(...kids.flat().filter(x => x != null && x !== false));
  return el;
}
export function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 3500);
}
export function fail(e) {
  console.error(e);
  toast(e?.code === "permission-denied" ? "No tienes permiso para esta acción." : "Ocurrió un error: " + (e?.message || e));
}
export const dlg = $("#dlg"), dlgForm = $("#dlgForm");
export function openDlg(...nodes) { dlgForm.replaceChildren(...nodes); if (!dlg.open) dlg.showModal(); }
export const closeDlg = () => dlg.open && dlg.close();
export function confirmDlg(msg, ok = "Eliminar") {
  return new Promise(res => openDlg(h("h2", {}, "Confirmar"), h("p", {}, msg), h("div", { class: "row" },
    h("button", { class: "btn", type: "button", onclick: () => { closeDlg(); res(false); } }, "Cancelar"),
    h("button", { class: "btn danger", type: "button", onclick: () => { closeDlg(); res(true); } }, ok))));
}

export function coverEl(r, big) {
  const el = h("div", { class: "cover sq" + (big ? " big" : "") });
  const ph = () => el.replaceChildren(h("span", { class: "ph", "aria-hidden": "true" }, TYPES[r.type]?.icon || "🎵"));
  if (safeUrl(r.cover)) { const im = h("img", { src: r.cover, alt: "", loading: "lazy", referrerpolicy: "no-referrer" }); im.onerror = ph; el.append(im); } else ph();
  return el;
}
export const stars = v => "★★★★★".slice(0, Math.round(v)) + "☆☆☆☆☆".slice(0, 5 - Math.round(v));
const ratingText = r => r.ratingCount ? `${avg(r).toFixed(1)} · ${r.ratingCount} valoración${r.ratingCount > 1 ? "es" : ""}` : "Sin valoraciones";

export function card(r) {
  return h("a", { class: "card", href: "#/p/" + r.id }, coverEl(r),
    h("div", { class: "cb" }, h("div", {}, h("span", { class: "tag" }, TYPES[r.type]?.label || "Música")),
      h("h3", {}, r.title), ...cardLines(r).filter(Boolean).slice(0, 3).map(l => h("p", { class: "ln" }, l)),
      r.ratingCount > 0 && h("p", { class: "ln stars", title: ratingText(r) }, `★ ${avg(r).toFixed(1)} (${r.ratingCount})`)));
}
export const skeletons = n => Array.from({ length: n }, () => h("div", { class: "card sk" }, h("div", { class: "cover sq" }), h("div", { class: "cb" }, h("p", { class: "ln" }, "\u00a0"))));

export function showPost(r, ctx) {
  const m = r.meta || {};
  const rows = FIELDS.filter(d => d.type !== "textarea" && m[d.k] != null && m[d.k] !== "" && !(Array.isArray(m[d.k]) && !m[d.k].length))
    .flatMap(d => [h("dt", {}, d.label), h("dd", {}, Array.isArray(m[d.k]) ? m[d.k].join(", ") : d.type === "date" ? fmtDate(m[d.k]) : String(m[d.k]))]);
  const tl = m.tracklist && h("div", {}, h("h4", {}, "Lista de pistas"), h("p", { class: "pre" }, m.tracklist));
  const dls = (r.downloads || []).filter(d => safeUrl(d.url)).map(d => h("div", { class: "dl" },
    h("div", {}, h("strong", {}, d.label || d.fileName || "Archivo"), h("small", {}, [d.format, d.ext && d.ext !== d.format ? d.ext : "", fmtSize(d.sizeBytes), serviceName(d)].filter(Boolean).join(" · "))),
    h("a", { class: "btn primary", href: safeUrl(d.url), target: "_blank", rel: "noopener noreferrer nofollow ugc" }, "Descargar")));
  const rateBox = h("div", { class: "rate" });
  const paint = mine => {
    const own = ctx.user && r.createdBy === ctx.user.uid;
    rateBox.replaceChildren(h("p", { class: "ratetxt" }, h("span", { class: "stars big" }, stars(avg(r))), " ", ratingText(r)),
      !ctx.user ? h("button", { class: "btn", type: "button", onclick: ctx.login }, "Inicia sesión para valorar")
        : own ? h("small", { class: "mute" }, "No puedes valorar tu propia publicación.")
        : h("div", { class: "pick5", role: "group", "aria-label": "Tu valoración" }, ...[1, 2, 3, 4, 5].map(i =>
            h("button", { class: "star" + (i <= mine ? " on" : ""), type: "button", "aria-label": `${i} estrella${i > 1 ? "s" : ""}`, "aria-pressed": i === mine, onclick: () => ctx.rate(r, i) }, "★"))));
  };
  paint(0); if (ctx.user) ctx.mine(r).then(paint);
  const date = fmtDate(r.createdAt), can = ctx.admin || (ctx.user && r.createdBy === ctx.user.uid);
  openDlg(h("div", { class: "detail" },
    h("section", { class: "blk head" }, coverEl(r, true), h("div", {},
      h("span", { class: "tag" }, TYPES[r.type]?.label || "Música"), h("h2", {}, r.title), m.artist && h("p", { class: "who2" }, m.artist),
      r.description && h("p", { class: "pre" }, r.description), h("dl", {}, rows), tl,
      r.tags?.length && h("p", { class: "tags" }, r.tags.map(t => h("span", { class: "tag" }, t))))),
    h("section", { class: "blk" }, h("h3", {}, "Valoración"), rateBox),
    dls.length ? h("section", { class: "blk" }, h("h3", {}, "Descarga"), dls,
      h("small", { class: "mute" }, "Los archivos están en servicios externos elegidos por quien publica; el sitio no los aloja.")) : null,
    h("section", { class: "blk" }, h("h3", {}, "Publicación"), h("dl", {},
      r.authorName && [h("dt", {}, "Publicado por"), h("dd", {}, r.authorName)], date && [h("dt", {}, "Fecha"), h("dd", {}, date)],
      ctx.admin && [h("dt", {}, "ID"), h("dd", {}, r.id)])),
    h("div", { class: "row" },
      can && h("button", { class: "btn danger", type: "button", onclick: () => ctx.remove(r) }, "Eliminar"),
      can && h("button", { class: "btn", type: "button", onclick: () => ctx.edit(r) }, "Editar"),
      h("button", { class: "btn", type: "button", onclick: () => ctx.share(r) }, "Copiar enlace"),
      h("button", { class: "btn", type: "button", onclick: () => ctx.report(r) }, "Reportar"),
      h("button", { class: "btn", type: "button", onclick: closeDlg }, "Cerrar"))));
}
