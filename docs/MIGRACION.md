# PlumaViva · Migración del prototipo HTML (v6 Final 3) a Angular

Estado: **etapa 2 completada (todas las pantallas son componentes Angular)**. Base: Angular 22 · standalone · signals · zoneless · rutas con hash.

## Cómo ejecutar
```
npm install
npm start          # http://localhost:4200/#/login
npm test           # pruebas del motor (Vitest)
npm run build
```
Modo demo: `src/environments/environment.ts` → `modoDemo: true` (carga los datos ficticios). Con `false` el estado inicia vacío, a la espera del backend NestJS.

## Qué va "quemado" y qué no
| Tipo | Ubicación | Criterio |
|---|---|---|
| **Norma (fijo en código)** | `core/data/norma/*` | 35 indicadores Cap. I, 20 Cap. II, Tablas 1-3 (pesos, niveles, galpones), muestreo, catálogos (departamentos, sistemas, tipos de galpón), 6 roles de la guía. Cambian solo si cambia la metodología ICA. En el futuro deben venir de `carga/catalogos` (MariaDB). |
| **Reglas del motor** | `core/engine/motor.ts` | Fórmulas, umbrales (densidades, mortalidad), importancia por indicador, catálogo de recomendaciones (`REC`), prioridades, FAQ del asistente. Parametrizable lo que el prototipo ya parametrizaba (`ctx.PARAMS`). |
| **Datos de demostración** | `core/data/demo/*` | Usuarios, unidades, histórico, evaluaciones semilla, bitácora, notificaciones, consultas, clave `Demo2026*`, 2FA simulado y bandeja de correo simulada. Solo con `modoDemo`. Reemplazar por `HttpClient` + endpoints. |
| **Recursos** | `public/assets`, `shared/logo.ts` | Ilustración 3 (PNG), logos SVG. |

## Arquitectura
- `core/engine`: motor puro (sin Angular, sin DOM). `contexto.ts` guarda estado, sesión y parámetros. **Paridad verificada** al migrar (se ejecutó el HTML original y el motor TS: totales, grupos, críticos, snapshots, plan de mejora, galpones sugeridos y bloqueos idénticos); hoy la cubre `npm test`. `motor.ts` lleva `// @ts-nocheck` (tipado estricto = mejora posterior).
- `core/services`: `StoreService` (señal `v()` = versión del estado; los componentes recalculan al leerla), `AuthService` (login, 2FA, recuperación), `DialogService` (modales/confirmaciones).
- `core/guards/acceso.guard.ts`: sesión, menú por rol y propiedad de recursos (incluye la regla Final 3: **Seguimiento solo ADMIN, INSP y RT**).
- `shared/ui.ts`: etiquetas, KPI, gráficos SVG. `layout/shell.ts`: barra superior + menú por rol.

## Estado actual (etapa 2 completada)
**Todas las pantallas son componentes Angular** (standalone, signals, zoneless, carga diferida). El puente con el HTML del prototipo se eliminó.

| Módulo | Componentes |
|---|---|
| Acceso, 2FA, recuperar/restablecer, Inicio (6 perfiles), Usuarios, Roles y permisos, Control de cambios | `features/auth`, `inicio`, `usuarios`, `roles`, `auditoria` |
| Parametrización | `features/parametrizacion` + `ParametrosService` |
| Unidades (lista, ficha de 7 pestañas, formulario reactivo, inhabilitar/rehabilitar/duplicada) | `features/unidades` + `UnidadesService` |
| Evaluaciones: lista, programación, asistente por fases (apertura, muestreo, MBR/MBA/MBG, revisión), resultado, acta, plan, plan histórico, anulación | `features/evaluaciones` (`evaluacion`, `ev-pasos`, `ev-fase`, `ev-indicador`, `ev-bloque`, `ev-informe`, `evaluacion-nueva`, `evaluaciones-lista`, `plan-historico`) + `EvaluacionesService` |
| Seguimiento Kanban | `features/seguimiento` |
| Asistente IA flotante y solicitudes de contacto técnico | `shared/asistente.ts` |

Criterios de diseño: filtros y pestañas viajan en la URL (`?u=`, `?est=`, `?nivel=`, `?t=`); diálogos con `pv-modal` / `pv-motivo-modal`; etiquetas accesibles; el motor ya no contiene HTML. Los servicios (`UnidadesService`, `EvaluacionesService`, `ParametrosService`) son el punto donde se sustituirá la memoria por `HttpClient`.

## Verificación realizada
- `npm test`: 5 pruebas del motor (paridad numérica con el prototipo, incluida V-2026-0301 = 88,1605).
- `paridad/recorrido.js`: 6 roles × 23 rutas, sin errores de consola y con permisos correctos.
- `paridad/param.js`, `unidades.js`, `evaluaciones.js`: parametrización, ciclo de vida de unidades y formulario, y evaluaciones completas (programar → iniciar → completar → revisar → finalizar → validar → plan → acta; traspatio; anulación; asistente IA; restricciones de productor y responsable técnico).

## Siguientes pasos
1. Conectar con el backend siguiendo `docs/CONTRATO_ENDPOINTS.md` (sustituir los servicios por `HttpClient`).
2. Tipar el motor (interfaces Evaluacion, Unidad, Respuesta) y quitar `@ts-nocheck`.
3. Validar los textos y reglas con ICA/UCC antes del piloto.
