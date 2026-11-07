/* Contexto compartido del motor: estado en memoria, sesión, parámetros vigentes y estado de pantalla.
   Lo inicializa y administra StoreService. El motor es lógica pura; no conoce Angular. */
import { PARAMS_BASE } from "../data/norma/parametros";
import { ROLES_BASE } from "../data/norma/roles";

export const ROLES: any[] = structuredClone(ROLES_BASE);

export const ctx: { S: any; SES: any; AUTH: any; PARAMS: any; ui: any; onAudit?: (fila: any) => void; onNotif?: (t: string, d: string, usuarioId?: number) => void } = {
  S: null,
  SES: null,
  AUTH: {},
  PARAMS: structuredClone(PARAMS_BASE),
  ui: { PLAN_G: "", PLAN_P: "", PLAN_OB: false, PLAN_ORD: "prio", PREVC: {}, ROUTE_LAST: "", EVAL_ORIGEN: "", FILTRO: "todos", UTAB: "resumen", UF: { q: "", rol: "", estado: "" }, PF: { q: "", tipo: "" }, CF: { q: "", m: "", a: "", acc: false }, HOST: null, REFRESH: null, EVAL_UNIDAD: null, PTAB: "lista", EF: { u: "", est: "", nivel: "" }, SEG: { q: "", tipo: "", hl: "" }, FILTRO_KEEP: new Set<string>(), EV: null, CHAT: { open: false, tab: "ia", msgs: [], ctx: {} }, onChat: null }
};
