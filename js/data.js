import { db } from "../firebase-config.js";
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, runTransaction, query, where, orderBy, limit, startAfter, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { tokens, norm } from "./music.js";

const col = collection(db, "releases");
const wrap = d => ({ id: d.id, ...d.data() });

// "scopes": una sola consulta (array-contains + orden) sirve para tipo + palabra → índices de 2 campos.
export function scopesFor(r) {
  const s = ["type:" + r.type];
  for (const t of tokens(r)) s.push("t:" + t, `type:${r.type}:t:${t}`);
  return s;
}
export async function fetchReleases({ filter, token, sort = "new", author, cursor, size = 24 } = {}) {
  const cs = []; let scope = filter?.scope;
  if (token) scope = (scope ? scope + ":" : "") + "t:" + norm(token);
  if (author) cs.push(where("createdBy", "==", author));
  else if (scope) cs.push(where("scopes", "array-contains", scope));
  else if (filter?.any) cs.push(where("scopes", "array-contains-any", filter.any));
  cs.push(sort === "top" ? orderBy("ratingScore", "desc") : orderBy("createdAt", sort === "old" ? "asc" : "desc"), limit(size));
  if (cursor) cs.push(startAfter(cursor));
  const snap = await getDocs(query(col, ...cs));
  return { items: snap.docs.map(wrap), last: snap.docs.at(-1) ?? cursor, more: snap.size === size };
}
export async function getRelease(id) { const d = await getDoc(doc(col, id)); return d.exists() ? wrap(d) : null; }
export async function saveRelease(prev, data, user, authorName) {
  const base = { ...data, titleLower: data.title.toLowerCase(), scopes: scopesFor(data), updatedAt: serverTimestamp() };
  if (prev) { await updateDoc(doc(col, prev.id), base); return prev.id; }
  const r = await addDoc(col, { ...base, createdAt: serverTimestamp(), createdBy: user.uid, authorName,
    ratingSum: 0, ratingCount: 0, ratingScore: 0 });
  return r.id;
}
export const removeRelease = id => deleteDoc(doc(col, id));

// Valoraciones: una por cuenta (releases/{id}/ratings/{uid}); el promedio se mantiene en la publicación.
export async function getMyRating(id, uid) {
  try { const d = await getDoc(doc(col, id, "ratings", uid)); return d.exists() ? d.data().value : 0; } catch { return 0; }
}
export async function rate(id, uid, value) {
  const rref = doc(col, id), mref = doc(rref, "ratings", uid);
  await runTransaction(db, async tx => {
    const [r, m] = await Promise.all([tx.get(rref), tx.get(mref)]);
    if (!r.exists()) throw new Error("La publicación ya no existe.");
    const d = r.data(), old = m.exists() ? m.data().value : 0;
    const sum = (d.ratingSum || 0) + value - old, count = (d.ratingCount || 0) + (m.exists() ? 0 : 1);
    tx.set(mref, { value, updatedAt: serverTimestamp() });
    tx.update(rref, { ratingSum: sum, ratingCount: count, ratingScore: (sum + 9) / (count + 3) });
  });
}

const reports = collection(db, "reports");
export const sendReport = r => addDoc(reports, { ...r, createdAt: serverTimestamp() });
export async function listReports() {
  const s = await getDocs(query(reports, orderBy("createdAt", "desc"), limit(50)));
  return s.docs.map(wrap);
}
export const removeReport = id => deleteDoc(doc(reports, id));
