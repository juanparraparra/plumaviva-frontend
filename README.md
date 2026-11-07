# PlumaViva · Frontend Angular

Frontend de la plataforma de bienestar aviar (Metodología EBA ICA v2.0, 2024). Angular 22, componentes standalone, signals, sin zone.js.

## Ejecutar
```bash
npm install
npm start          # http://localhost:4200  (rutas con # como el prototipo)
npm test           # pruebas del motor de cálculo (paridad numérica con el prototipo)
npm run build      # producción en dist/plumaviva/browser
```
Con `environment.modoDemo = true` (por defecto) la aplicación corre con datos ficticios en memoria. Usuarios de demostración en la pantalla de acceso; clave `Demo2026*`; el código 2FA se muestra en pantalla.

## Publicar en Firebase Hosting
La carpeta ya incluye `firebase.json`, `.firebaserc` y `public/config.json`.
Configura la URL de la API en `public/config.json`, revisa `CORS_ORIGINS` en la VPS y ejecuta:
```bash
npm run build:firebase
npm run deploy:firebase
```
El paso a paso completo (HTTPS, CORS, dominio propio y solución de problemas) está en **`FIREBASE.md`**.

## Para quien construye el backend
1. **Contrato de endpoints:** `docs/CONTRATO_ENDPOINTS.md` (rutas, cuerpos y reglas por módulo). Reglas de negocio completas en el prototipo de referencia `docs/prototipo_v6_final_3_referencia.html`.
2. **Modelo de dominio:** `src/app/core/models/tipos.ts` y los datos de ejemplo `src/app/core/data/demo/*` (forma exacta de usuarios, unidades, galpones, evaluaciones y respuestas).
3. **Datos fijos de la norma** (van a catálogos de la base): `src/app/core/data/norma/*` (35 indicadores Cap. I, 20 Cap. II, pesos, niveles, Tabla 3, catálogos, roles base).
4. **Cálculo oficial:** `src/app/core/engine/motor.ts` (función `resultado`, `prioDe`, `buildPlan`). El servidor debe reproducirlo; `motor.spec.ts` trae casos de referencia (V-2026-0301 = 88,16).
5. **Dónde se conecta:** hoy los datos viven en `StoreService` (`core/services/store.service.ts`, estado en memoria) y las mutaciones en `core/services/*` y en cada componente. El plan es sustituirlos por repositorios con `HttpClient` módulo por módulo, sin tocar las pantallas; empezar por acceso, usuarios y roles. `ParametrosService` es el ejemplo del patrón.
6. Seguridad: el frontend aplica menú y permisos por rol (`acceso.guard.ts`), pero el backend debe volver a validarlos.

## Estructura
```
src/app/
  core/engine/      motor de cálculo y reglas (TS puro) + tablas tipadas
  core/data/        norma/ (fijo) y demo/ (ficticio, se apaga con modoDemo)
  core/services/    store, auth, diálogos, parámetros
  core/guards/      control de acceso por rol y propiedad del recurso
  features/         auth, inicio, usuarios, roles, auditoria, parametrizacion, unidades, evaluaciones, seguimiento (componentes Angular con carga diferida)
  shared/ layout/   componentes comunes (plan, resumen de unidad, diálogos, asistente IA), shell
docs/               MIGRACION.md (estado), CONTRATO_ENDPOINTS.md
paridad/            pruebas Playwright: recorrido.js (6 roles × todas las rutas), param.js, unidades.js, evaluaciones.js (requieren la app compilada y servida; ver lib.js)
```

## Estado
Todas las pantallas son componentes Angular (ya no existe el puente con el HTML del prototipo) y están probadas con los 6 roles: acceso/2FA, inicio, usuarios, roles, control de cambios, parametrización, unidades, evaluaciones (lista, programación, 8 fases, resultado, acta, plan), seguimiento y asistente IA.

Pendiente conocido: `core/engine/motor.ts` (motor de cálculo, TS puro sin DOM) conserva `// @ts-nocheck` (~600 avisos de tipado, casi todos parámetros sin tipo). Se tipará junto con los DTO del backend; los componentes ya consumen el motor mediante servicios y tablas tipadas.
# plumaviva-frontend
