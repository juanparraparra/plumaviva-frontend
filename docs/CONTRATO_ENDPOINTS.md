# PlumaViva · Contrato real de la API (Express + MySQL)

Este documento describe la API que sirve hoy `plumaviva-apiv3` y que consume el front Angular. Sustituye al contrato propuesto inicialmente para NestJS: **no hay cookies, el 2FA es real por correo y las respuestas de colección son arreglos JSON**, no objetos paginados.

## Convenciones

- Prefijo: `/api`. Cuerpo y respuesta en JSON (`Content-Type: application/json`).
- Sesión: `Authorization: Bearer <JWT>` en todas las rutas excepto las de acceso (`/auth/login`, `/auth/cambiar-password-inicial`, `/auth/verificar-2fa`, `/auth/reenviar-2fa`, `/auth/recuperar`, `/auth/restablecer`). El JWT se emite únicamente al completar el 2FA y vence según `JWT_EXPIRES` (por defecto 8 h).
- Error estándar: HTTP 4xx/5xx con `{ "error": "mensaje legible" }`.
- La API vuelve a aplicar las reglas de visibilidad y de rol; el frontend nunca es la única barrera.
- Las mutaciones relevantes escriben en `auditoria` (usuario, rol, módulo, acción, objeto, detalle y motivo).

## Acceso

| Método y ruta | Cuerpo | Respuesta / notas |
|---|---|---|
| `POST /auth/login` | `{ correo, password }` | Si la cuenta tiene clave temporal: `{ requiere_cambio: true, token_cambio, correo_enmascarado }`. Si no: `{ requiere_2fa: true, desafio, expira_en, correo_enmascarado }`. **No entrega JWT.** Bloqueo de 15 min tras 5 fallos; límite por IP. |
| `POST /auth/cambiar-password-inicial` | `{ token_cambio, actual, nueva, confirmar }` | Cambia la clave temporal y continúa con un desafío 2FA. Política: ≥10 caracteres, mayúscula, minúscula, número y especial. |
| `POST /auth/verificar-2fa` | `{ desafio, codigo }` | `{ token, usuario }`. Código de 6 dígitos, 10 min, máximo 5 intentos; el JWT solo se emite aquí. |
| `POST /auth/reenviar-2fa` | `{ desafio }` | `{ ok, desafio, expira_en, correo_enmascarado }`. Espera mínima de 60 s y máximo de 10 envíos por hora. |
| `GET /auth/me` | — | Usuario público de la sesión (incluye `debe_cambiar_password`, `extra` aplanado e `historial`). |
| `POST /auth/logout` | — | `{ ok: true }`; registra el cierre en auditoría (el JWT es sin estado). |
| `POST /auth/recuperar` | `{ correo }` | Respuesta genérica. En desarrollo (`NODE_ENV !== "production"`) agrega `token` para probar sin correo. |
| `POST /auth/restablecer` | `{ token, password }` | `{ ok: true }`. Contraseña: ≥10 caracteres, mayúscula, minúscula, número y especial. Token válido 30 min y de un solo uso. |

## Usuarios

| Método y ruta | Cuerpo / notas |
|---|---|
| `GET /usuarios` | ADMIN/COORD/INSP reciben todos los datos; los demás solo `{id, nombres, apellidos, rol, estado}` de terceros y su propio registro completo. Incluye `hist_ev`/`hist_un` para calcular `historial`. |
| `POST /usuarios` | ADMIN cualquier rol; COORD/INSP/PROD solo propietarios `PROD`/`TEN`. El correo es obligatorio. Sin `password` se genera una clave temporal, se envía por correo (`correo_enviado: true`) y la cuenta debe cambiarla al primer ingreso. |
| `PUT /usuarios/:id` | ADMIN edita todo; los demás solo datos de contacto de propietarios (PROD solo su propio registro). No se puede dejar la plataforma sin un ADMIN activo (409). El correo no puede quedar vacío. |
| `POST /usuarios/:id/password` | ADMIN. Genera una clave temporal nueva, la envía por correo y obliga el cambio al ingresar. Devuelve `{ ok, correo_enviado }`. |
| `DELETE /usuarios/:id` | ADMIN. 409 si el usuario tiene historial (evaluaciones, unidades, auditoría o notificaciones) o si es la propia cuenta. |

## Unidades productivas

| Método y ruta | Cuerpo / notas |
|---|---|
| `GET /unidades` | Visibilidad: ADMIN/COORD/INSP ven todas; `PROD`/`TEN` solo las de `propietario_id`; `RT` solo las de `rt_id`; `CONS` recibe `[]`. Incluye especies y galpones anidados. |
| `GET /unidades/:id` | Misma visibilidad. 404 si no existe o no es visible. |
| `POST /unidades` | ADMIN/COORD/INSP/PROD. `{ nombre, propietario_id, ...datos, especies[], galpones[] }`. PROD solo a su nombre. |
| `PUT /unidades/:id` | Actualiza datos e hijos (`especies`/`galpones` si vienen). Solo ADMIN cambia `estado` (`ACTIVA`/`INACTIVA`). PROD solo sus unidades. |
| `DELETE /unidades/:id` | Solo ADMIN y solo si no tiene evaluaciones ni histórico (409). |

## Evaluaciones

| Método y ruta | Cuerpo / notas |
|---|---|
| `GET /evaluaciones` | ADMIN/COORD ven todas; INSP las asignadas; PROD/TEN las de sus unidades; RT las de sus unidades; CONS `[]`. |
| `GET /evaluaciones/:id` | Misma visibilidad. Devuelve la fila con `detalle` (JSON con inventario, galpones, grupos, respuestas, `atiende`, etc.). |
| `POST /evaluaciones` | INSP/COORD/ADMIN. `{ unidad_id, sis, insp_id, fecha, hora, orden, pastoreo, detalle }`. Una unidad solo puede tener una evaluación abierta. |
| `PUT /evaluaciones/:id` | INSP/COORD/ADMIN. `{ estado, consent, obs_gen, hora, orden, detalle }`. Autoguardado; `BORRADOR → EN_PROCESO` nunca retrocede. |
| `POST /evaluaciones/:id/finalizar` | INSP/COORD/ADMIN. Solo desde `EN_PROCESO`; pasa a `FINALIZADA`. |
| `POST /evaluaciones/:id/validar` | COORD/ADMIN. Solo desde `FINALIZADA`. Cuerpo `{ total, grupos: { MBA, MBR, MBG }, det }`. Inserta la fila en `historico` con `cap`, `sis` y `det` (`{ indicador: porcentaje }`). |
| `POST /evaluaciones/:id/anular` | COORD/ADMIN. `{ motivo, anulada }`; conserva la evaluación como `ANULADA` y libera la unidad. |

El cálculo del puntaje se hace en el frontend (motor EBA v2.0) y el servidor guarda el resultado enviado al validar. El histórico conserva el detalle por indicador para que el plan de mejora histórico siga funcionando.

## Histórico, notificaciones y auditoría

| Método y ruta | Cuerpo / notas |
|---|---|
| `GET /historico` | ADMIN/COORD/INSP/PROD/TEN/RT. Filtra por propietario/RT. Respuesta: `{ codigo, unidad, fecha, total, cap, sis, det, g: {MBR, MBA, MBG} }`. Las filas antiguas sin `cap`/`sis` lo deducen del tipo de unidad en el front. |
| `GET /notificaciones` | Personal interno ve todas; los demás solo las propias. Últimas 50. |
| `POST /notificaciones` | `{ t, d, usuario_id? }`. ADMIN/COORD/INSP pueden dirigirla a otro usuario; el resto solo a sí mismo. |
| `GET /auditoria` | Solo ADMIN. `?limite=` (máximo 1000). |
| `POST /auditoria` | Cualquier sesión. `{ accion, objeto, modulo, detalle, motivo }`; el servidor pone usuario, rol y fecha. |

## Parametrización y roles

| Método y ruta | Cuerpo / notas |
|---|---|
| `GET /parametros` | Objeto `{ pesos, niveles, muestreo, tabla3, imp, obligatoriedad, reincidencia, roles? }`. |
| `PUT /parametros/:clave` | ADMIN/COORD para `pesos`, `niveles`, `muestreo`, `tabla3`, `imp`, `obligatoriedad`, `reincidencia`; solo ADMIN para `roles`. Cuerpo `{ valor }`. |
| `GET /roles` | `{ roles: [], perm: {}, siguiente }` desde `parametros.roles`. |
| `PUT /roles` | Solo ADMIN. Reemplaza `{ roles, perm, siguiente }`. |

## Puesta en marcha

### Backend (API + build Angular)

```powershell
cd plumaviva-apiv3
npm install
npm run dev        # node --watch src/server.js
# o: npm start     # node src/server.js
```

- API y front compilado en `http://localhost:3000` (si existe `PlumaViva_Angular_Final/plumaviva/dist/plumaviva/browser`).
- Sin build Angular, el backend sirve el prototipo de `public/`.
- Base de datos: ver `database/schema.sql` y `.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRETO`, `JWT_EXPIRA`).

### Front Angular en desarrollo (modo real con proxy)

```powershell
cd PlumaViva_Angular_Final/plumaviva
npm install
npm start          # ng serve --proxy-config proxy.conf.json → /api a http://localhost:3000
```

### Build de producción

```powershell
cd PlumaViva_Angular_Final/plumaviva
npm run build      # ng build → dist/plumaviva/browser
```

El backend detecta ese directorio y sirve el front en el mismo origen.

### Modo demostración (datos ficticios, 2FA simulado)

```powershell
npm start -- --configuration demo
npm run build -- --configuration demo --output-path dist/demo
```

El modo demo conserva las pruebas de paridad del prototipo y no toca la base de datos.

## Diferencias con el contrato anterior

- No hay `POST /auth/2fa/*`: el backend real no implementa segundo factor.
- No hay respuestas paginadas `{ items, total }`: las colecciones se devuelven como arreglos.
- Los endpoints de resumen/plan/acta/seguimiento/asistente se calculan en el frontend; no existen como rutas del servidor.
- La recuperación de contraseña usa la tabla `recuperacion` (token hasheado, 30 min, un solo uso).
