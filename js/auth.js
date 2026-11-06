import { auth, db } from "../firebase-config.js";
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signInWithRedirect, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { h, openDlg, closeDlg, toast } from "./ui.js";

// Administrador = existe el documento admins/{uid} con admin: true (solo editable desde la consola de Firebase).
export async function isAdmin(u) {
  try { const d = await getDoc(doc(db, "admins", u.uid)); return d.exists() && d.data().admin === true; } catch { return false; }
}
const MSG = {
  "auth/invalid-credential": "Correo o contraseña incorrectos.", "auth/invalid-email": "El correo no es válido.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Inicia sesión.", "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/operation-not-allowed": "Este método de acceso no está habilitado en Firebase.", "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase.",
  "auth/account-exists-with-different-credential": "Ya existe una cuenta con ese correo usando otro método de acceso.",
  "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.", "auth/network-request-failed": "Sin conexión."
};
export function openAuth(note) {
  let mode = "in";
  const err = h("p", { class: "error", role: "alert" });
  const fail = e => { if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") return; err.textContent = `${MSG[e.code] || "No se pudo completar."} (${e.code || e.message})`; };
  async function social(P) {
    err.textContent = "";
    try { await signInWithPopup(auth, new P()); closeDlg(); }
    catch (e) { if (e.code === "auth/popup-blocked") return signInWithRedirect(auth, new P()); fail(e); }
  }
  function render() {
    const name = h("input", { name: "name", maxlength: 40, autocomplete: "nickname" });
    const email = h("input", { name: "email", type: "email", required: true, autocomplete: "username" });
    const pass = h("input", { name: "pass", type: "password", required: true, minlength: 6, autocomplete: mode === "in" ? "current-password" : "new-password" });
    const go = async () => {
      if (!email.validity.valid || !pass.validity.valid) { err.textContent = "Escribe un correo válido y una contraseña de al menos 6 caracteres."; return; }
      err.textContent = "";
      try {
        if (mode === "in") await signInWithEmailAndPassword(auth, email.value.trim(), pass.value);
        else { const c = await createUserWithEmailAndPassword(auth, email.value.trim(), pass.value); if (name.value.trim()) await updateProfile(c.user, { displayName: name.value.trim() }); }
        closeDlg();
      } catch (e) { fail(e); }
    };
    openDlg(h("h2", {}, mode === "in" ? "Iniciar sesión" : "Crear cuenta"), note && h("p", { class: "mute" }, note),
      h("div", { class: "row" }, h("button", { class: "btn" + (mode === "in" ? " primary" : ""), type: "button", onclick: () => { mode = "in"; render(); } }, "Entrar"),
        h("button", { class: "btn" + (mode === "up" ? " primary" : ""), type: "button", onclick: () => { mode = "up"; render(); } }, "Crear cuenta")),
      mode === "up" && h("label", {}, "Nombre visible (aparece en tus publicaciones)", name),
      h("label", {}, "Correo electrónico", email), h("label", {}, "Contraseña", pass), err,
      h("button", { class: "btn primary", type: "button", onclick: go }, mode === "in" ? "Entrar con correo" : "Crear cuenta con correo"),
      mode === "in" && h("button", { class: "btn link", type: "button", onclick: async () => {
        if (!email.value.trim()) { err.textContent = "Escribe tu correo primero."; return; }
        try { await sendPasswordResetEmail(auth, email.value.trim()); } catch {} err.textContent = "Si la cuenta existe, enviamos un correo para restablecer la contraseña.";
      } }, "Olvidé mi contraseña"),
      h("p", { class: "mute center" }, "o continúa con"),
      h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => social(GoogleAuthProvider) }, "Google"),
        h("button", { class: "btn", type: "button", onclick: () => social(GithubAuthProvider) }, "GitHub")),
      h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: closeDlg }, "Cerrar")));
  }
  render();
}
