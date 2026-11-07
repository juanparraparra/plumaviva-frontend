import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { StoreService } from "../services/store.service";
import * as M from "../engine/motor";

const PUBLICAS = ["login", "cambiar-clave", "verificar", "recuperar", "restablecer"];
/** Reglas de acceso del prototipo (route()): sesión, menú del rol y propiedad de cada recurso. */
export const accesoGuard: CanActivateFn = (route, state) => {
  const store = inject(StoreService), router = inject(Router);
  const [p, a] = state.url.split("?")[0].replace(/^\//, "").split("/");
  const s = store.SES;
  if (!s && !PUBLICAS.includes(p)) return router.parseUrl("/login");
  if (s && PUBLICAS.includes(p)) return router.parseUrl("/inicio");
  if (!s) return true;
  const negar = (msg = "Su perfil no tiene acceso a esta sección.") => { store.denegado.set(msg); return router.parseUrl("/sin-permiso"); };
  const mia = (id: any) => M.visibleUnidades().some((u: any) => u.id === Number(id));
  if (!["inicio", "evaluacion", "evaluacion-nueva", "unidad-form", "plan", "sin-permiso"].includes(p) && !M.rolDe(s).menu.includes(p)) return negar();
  if (p === "unidades" && a && !mia(a)) return negar("Solo puede consultar las unidades productivas vinculadas a su perfil.");
  if (p === "unidad-form" && (!M.can("ADMIN", "COORD", "INSP", "PROD") || !M.hasPerm("Registrar o editar unidades") || (a && !mia(a)))) return negar("Su perfil no puede registrar ni editar esta unidad productiva.");
  if (p === "unidad-form" && a && M.unidadById(a) && M.unidadById(a).estado !== "ACTIVA") return negar("La unidad está inhabilitada: su información no se puede modificar. Un administrador debe rehabilitarla primero.");
  if (p === "evaluacion-nueva" && !M.hasPerm("Crear evaluaciones")) return negar("Su perfil no puede programar evaluaciones.");
  if (p === "plan") { const sn = M.snapByCodigo(decodeURIComponent(a || "")); if (sn && (s.rol === "CONS" || !mia(sn.unidad))) return negar("Solo puede consultar los planes de mejora de las unidades vinculadas a su perfil."); }
  if (p === "evaluacion") { const ev = M.evById(a); if (ev && (s.rol === "CONS" || !mia(ev.unidad))) return negar("Solo puede consultar las evaluaciones de las unidades vinculadas a su perfil."); }
  return true;
};
