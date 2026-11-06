# NantiX · musicfile.site

Sitio solo de música: álbumes, sencillos, EP y colecciones con enlaces de descarga externos, valoraciones de 1 a 5 estrellas y «Mejor valoradas». HTML + CSS + JS (módulos ES) + Firebase (`nantixdatabase`). Sin compilación.

## Archivos (raíz del dominio)
```
index.html  styles.css  app.js  firebase-config.js
js/music.js  js/data.js  js/auth.js  js/ui.js  js/forms.js
firestore.rules  firestore.indexes.json  README.md   (los dos últimos no hace falta subirlos al hosting)
```

## Configuración en Firebase (obligatoria)
1. **Authentication → Sign-in method:** habilita Correo/contraseña, Google y GitHub.
   - GitHub: crea una OAuth App en GitHub (Settings → Developer settings). Homepage `https://musicfile.site`; callback `https://nantixdatabase.firebaseapp.com/__/auth/handler`. Copia Client ID y Secret al proveedor GitHub de Firebase.
2. **Authentication → Settings → Authorized domains:** añade `musicfile.site` y `www.musicfile.site`.
3. **Google Cloud → APIs y servicios → Credenciales** (clave de navegador): si tiene restricción de sitios, añade `https://musicfile.site/*`.
4. Publica `firestore.rules` y crea los 4 índices de `firestore.indexes.json` (colección `releases`; todos de 2 campos).
5. **Administrador:** Authentication → Users → copia el UID de la cuenta. Firestore → Iniciar colección `admins` → ID del documento = ese UID → campo `admin` (boolean) = `true`. Solo se puede hacer desde la consola; las reglas impiden crearlo desde la web.

## Datos
- `releases`: `type` (album/single/ep/collection), `title`, `titleLower`, `description`, `cover`, `tags[]`, `meta{}`, `downloads[]` (`url`, `service`, `label`, `format`, `ext`, `fileName`, `sizeBytes`), `scopes[]` (índice de búsqueda), `createdBy`, `authorName`, `createdAt`, `updatedAt`, `ratingSum`, `ratingCount`, `ratingScore`.
- `releases/{id}/ratings/{uid}`: `value` (1–5), `updatedAt`. Una por cuenta; no se puede valorar la propia publicación.
- `reports`, `admins`. Las colecciones anteriores (`posts`, `drafts`, `users`, `fieldDefinitions`, `settings`) siguen guardadas pero las reglas las bloquean.

## Notas
- `ratingScore` = (suma + 9) / (votos + 3): evita que una publicación con un solo voto de 5 estrellas encabece la lista. El promedio mostrado es suma / votos.
- Búsqueda: primera palabra en el servidor; resto de palabras, filtros y «Alfabético» sobre lo ya cargado.
- Eliminar una publicación no borra sus valoraciones (quedan inaccesibles).
- Las páginas de publicaciones se comparten con `#/p/<id>`; los buscadores no las indexan individualmente.
