# Despliegue del frontend en Firebase Hosting

Esta carpeta ya está preparada para publicarse en Firebase Hosting apuntando al backend de la VPS.
El front se sirve como sitio estático y **no necesita** que la VPS sirva los archivos del front.

---

## 1. Requisitos

- Node.js y npm instalados.
- Una cuenta de Firebase y un proyecto creado en <https://console.firebase.google.com>.
- Firebase CLI:

```powershell
npm.cmd install -g firebase-tools
firebase login
```

---

## 2. Configurar la URL de la API

Edita **`public/config.json`**:

```json
{
  "apiUrl": "https://TU_DOMINIO_O_IP:3000/api"
}
```

Reglas:

- Debe terminar en **`/api`**.
- Debe ser **HTTPS**. Firebase sirve el sitio por HTTPS y el navegador bloquea las llamadas a `http://...` (contenido mixto).
- Si la VPS solo tiene HTTP en el puerto 3000, coloca delante un proxy con certificado (Caddy, Nginx + Let's Encrypt, Cloudflare, etc.) y usa su dominio, por ejemplo:

```json
{
  "apiUrl": "https://api.tudominio.com/api"
}
```

> `config.json` se lee en tiempo de ejecución. Si cambias la URL, vuelve a compilar y desplegar
> (o edita `dist/plumaviva/browser/config.json` y despliega solo hosting).

En **localhost** el front ignora `config.json` y sigue usando `/api` con `proxy.conf.json`,
así que el desarrollo local no se ve afectado.

---

## 3. Permitir el dominio de Firebase en la VPS (CORS)

En el `.env` del backend en la VPS, agrega los dominios de Firebase a `CORS_ORIGINS` y reinicia el servidor:

```env
CORS_ORIGINS=https://TU_PROYECTO.web.app,https://TU_PROYECTO.firebaseapp.com
```

Si usas dominio propio en Firebase Hosting, agrégalo también:

```env
CORS_ORIGINS=https://TU_PROYECTO.web.app,https://TU_PROYECTO.firebaseapp.com,https://app.tudominio.com
```

El front envía el JWT en `Authorization: Bearer ...`, por lo que el navegador hará peticiones
`OPTIONS` (preflight). Sin el origen correcto en `CORS_ORIGINS`, la API responderá con error de CORS.

---

## 4. Vincular el proyecto de Firebase

Edita `.firebaserc` y reemplaza `TU_PROJECT_ID`:

```json
{
  "projects": {
    "default": "mi-proyecto-plumaviva"
  }
}
```

También puedes hacerlo con la CLI:

```powershell
firebase use --add
```

> No ejecutes `firebase init hosting` sobre esta carpeta si no es necesario: puede sobrescribir
> el `firebase.json` que ya está configurado.

---

## 5. Compilar y desplegar

Desde esta carpeta (`PlumaViva_Angular_Final/plumaviva`):

```powershell
npm.cmd install
npm.cmd run build:firebase
npm.cmd run deploy:firebase
```

O por separado:

```powershell
npm.cmd run build:firebase
firebase deploy --only hosting
```

La salida de compilación es `dist/plumaviva/browser`, que es la carpeta publicada por `firebase.json`.

Al terminar, Firebase muestra la URL del sitio, por ejemplo:

```
https://mi-proyecto-plumaviva.web.app
```

---

## 6. Verificar

1. Abre la URL de Firebase.
2. Comprueba en la consola del navegador (F12 → Network) que las peticiones van a
   `https://TU_DOMINIO/api/...` y no a `https://TU_PROYECTO.web.app/api/...`.
3. Inicia sesión con un usuario real de la base de datos de la VPS.
4. Si aparece un error de CORS, revisa `CORS_ORIGINS` y reinicia el backend.
5. Si aparece `Mixed Content`, la API no está en HTTPS.

---

## 7. Cambiar la URL de la API sin recompilar

La aplicación prioriza un valor guardado en `localStorage`:

```js
// En la consola del navegador
localStorage.setItem("pv_api", "https://api.tudominio.com/api");
location.reload();
```

Para volver a la configuración publicada:

```js
localStorage.removeItem("pv_api");
location.reload();
```

Esto es útil para pruebas puntuales, pero la configuración definitiva debe quedar en `config.json`.

---

## 8. Dominio propio (opcional)

En Firebase Console → **Hosting → Add custom domain**, agrega tu dominio y sigue las instrucciones DNS.
Después:

- agrega el dominio a `CORS_ORIGINS` en la VPS;
- actualiza `public/config.json` si cambia la URL de la API;
- vuelve a desplegar.

---

## 9. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| La página carga pero el login dice "No se pudo conectar" | `config.json` tiene una URL incorrecta o la API no responde | Revisa `public/config.json`, que termine en `/api`, y que la VPS responda |
| Error de CORS en la consola | El dominio de Firebase no está en `CORS_ORIGINS` | Agrégalo en el `.env` de la VPS y reinicia |
| `Mixed Content` | La API está en `http://` | Publica la API por HTTPS (proxy inverso) |
| 404 al entrar a una ruta | Se desplegó otra carpeta | Verifica que `firebase.json` apunte a `dist/plumaviva/browser` |
| El front sigue usando una URL vieja | Caché o `localStorage` | Borra `pv_api`, recarga con Ctrl+F5 y vuelve a desplegar `config.json` |
| `firebase: command not found` | CLI no instalada | `npm.cmd install -g firebase-tools` |

---

## 10. Notas sobre el estado actual del backend

- El login entrega el JWT directamente (`POST /api/auth/login`), sin 2FA ni cambio obligatorio.
- Las funciones de correo y 2FA están comentadas en el backend; no se requiere SMTP para operar.
- El backend actual escucha en el puerto 3000. Para Firebase debe ser accesible por HTTPS.
