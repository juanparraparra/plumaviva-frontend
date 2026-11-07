import { Routes } from "@angular/router";
import { accesoGuard } from "./core/guards/acceso.guard";
import { Shell } from "./layout/shell";
import { Login } from "./features/auth/login";
import { Verificar } from "./features/auth/verificar";
import { CambiarClave } from "./features/auth/cambiar-clave";
import { Recuperar } from "./features/auth/recuperar";
import { Restablecer } from "./features/auth/restablecer";
import { Inicio } from "./features/inicio/inicio";
import { Usuarios } from "./features/usuarios/usuarios";
import { Roles } from "./features/roles/roles";
import { Auditoria } from "./features/auditoria/auditoria";
import { SinPermiso } from "./features/sin-permiso";

/** Rutas con hash (#/…) igual que el prototipo. Cada ruta pasa por accesoGuard (sesión, menú del rol y propiedad del recurso). */
export const routes: Routes = [
  { path: "login", component: Login, canActivate: [accesoGuard] },
  { path: "cambiar-clave", component: CambiarClave, canActivate: [accesoGuard] },
  { path: "verificar", component: Verificar, canActivate: [accesoGuard] },
  { path: "recuperar", component: Recuperar, canActivate: [accesoGuard] },
  { path: "restablecer", component: Restablecer, canActivate: [accesoGuard] },
  // La raíz redirige a login; el guard de login manda a inicio si ya hay sesión.
  // No se puede combinar redirectTo con canActivate (Angular lanza NG04014).
  { path: "", pathMatch: "full", redirectTo: "login" },
  {
    path: "", component: Shell, canActivateChild: [accesoGuard], children: [
      { path: "inicio", component: Inicio },
      { path: "usuarios", component: Usuarios },
      { path: "roles", component: Roles },
      { path: "auditoria", component: Auditoria },
      { path: "unidades", loadComponent: () => import("./features/unidades/unidades-lista").then(m => m.UnidadesLista) },
      { path: "unidades/:a", loadComponent: () => import("./features/unidades/unidad-ficha").then(m => m.UnidadFicha) },
      { path: "unidad-form", loadComponent: () => import("./features/unidades/unidad-form").then(m => m.UnidadForm) },
      { path: "unidad-form/:a", loadComponent: () => import("./features/unidades/unidad-form").then(m => m.UnidadForm) },
      { path: "parametrizacion", loadComponent: () => import("./features/parametrizacion/parametrizacion").then(m => m.Parametrizacion) },
      { path: "evaluaciones", loadComponent: () => import("./features/evaluaciones/evaluaciones-lista").then(m => m.EvaluacionesLista) },
      { path: "seguimiento", loadComponent: () => import("./features/seguimiento/seguimiento").then(m => m.Seguimiento) },
      { path: "evaluacion-nueva", loadComponent: () => import("./features/evaluaciones/evaluacion-nueva").then(m => m.EvaluacionNueva) },
      { path: "evaluacion/:a", loadComponent: () => import("./features/evaluaciones/evaluacion").then(m => m.Evaluacion) },
      { path: "evaluacion/:a/:paso", loadComponent: () => import("./features/evaluaciones/evaluacion").then(m => m.Evaluacion) },
      { path: "plan/:a", loadComponent: () => import("./features/evaluaciones/plan-historico").then(m => m.PlanHistorico) },
      { path: "sin-permiso", component: SinPermiso },
    ]
  },
  { path: "**", redirectTo: "inicio" }
];
