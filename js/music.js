export const SITE = "NantiX";
const T = (label, plural, icon) => ({ label, plural, icon });
export const TYPES = { album: T("Álbum", "Álbumes", "💿"), single: T("Sencillo", "Sencillos", "🎵"), ep: T("EP", "EP", "🎶"), collection: T("Colección", "Discografías y colecciones", "🗂️") };
export const NAV = [
  ["Explorar", [["home", "Inicio", "🏠"], ["top", "Mejor valoradas", "⭐"], ["all", "Toda la música", "🎧"]]],
  ["Tipos", [["album", "Álbumes", "💿"], ["single", "Sencillos", "🎵"], ["ep", "EP", "🎶"], ["collection", "Discografías y colecciones", "🗂️"]]]
];
export const navLabel = k => k === "mine" ? "Mis publicaciones" : NAV.flatMap(g => g[1]).find(i => i[0] === k)?.[1] ?? "Música";
export const navFilter = k => TYPES[k] ? { scope: "type:" + k } : null;

const F = (k, label, type, o = {}) => ({ k, label, type, ...o });
export const FIELDS = [
  F("artist", "Artista principal", "text", { req: 1 }), F("featuring", "Artistas colaboradores", "list"), F("releaseDate", "Fecha de lanzamiento", "date"),
  F("year", "Año", "number"), F("genres", "Géneros", "list"), F("trackCount", "Número de pistas", "number"), F("duration", "Duración total", "text"),
  F("audioFormat", "Formato de audio", "select", { opts: ["FLAC", "MP3", "WAV", "AAC", "ALAC", "Otro"] }),
  F("sampleRate", "Frecuencia de muestreo", "text"), F("bitDepth", "Profundidad de bits", "text"), F("label", "Discográfica", "text"),
  F("tracklist", "Lista de pistas (una por línea)", "textarea")
];
export const FILTERS = ["genres", "audioFormat", "year", "artist"];

export const SERVICES = ["MEGA", "Google Drive", "MediaFire", "Dropbox", "Otro"];
export function detectService(url) {
  try {
    const h = new URL(url).hostname;
    if (/(^|\.)mega\.(nz|io)$/.test(h)) return "MEGA";
    if (/(^|\.)(drive|docs)\.google\.com$/.test(h)) return "Google Drive";
    if (/mediafire\.com$/.test(h)) return "MediaFire";
    if (/dropbox\.com$/.test(h)) return "Dropbox";
  } catch {}
  return "Otro";
}
export const serviceName = d => d.service !== "Otro" ? d.service : (() => { try { return new URL(d.url).hostname; } catch { return "Enlace externo"; } })();
export const safeUrl = u => /^https?:\/\//i.test(u || "") ? u : "";
export const norm = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export function tokens(r) {
  const m = r.meta || {}, src = [r.title, m.artist, m.featuring, m.genres, m.label, r.tags].flat().filter(Boolean).join(" ");
  return [...new Set(norm(src).split(/[^a-z0-9]+/).filter(t => t.length >= 2))].slice(0, 60);
}
export function fmtSize(b) {
  if (!b) return ""; const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0, n = b;
  while (n >= 1024 && i < 4) { n /= 1024; i++; } return `${n < 10 && i ? n.toFixed(1) : Math.round(n)} ${u[i]}`;
}
export function fmtDate(v) {
  const d = v?.toDate ? v.toDate() : v ? new Date(v) : null;
  return d && !isNaN(d) ? d.toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" }) : "";
}
export const avg = r => r.ratingCount ? r.ratingSum / r.ratingCount : 0;
export function cardLines(r) {
  const m = r.meta || {};
  return [m.artist, [TYPES[r.type]?.label, m.year || (m.releaseDate || "").slice(0, 4)].filter(Boolean).join(" · "), m.audioFormat];
}
