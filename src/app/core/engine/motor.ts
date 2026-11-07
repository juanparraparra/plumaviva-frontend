// @ts-nocheck
/* Motor de la Metodología EBA v2.0 · cálculo, muestreo, plan de mejora, historial y asistente.
   Portado de forma literal desde el prototipo v6 Final 3: lógica pura, sin DOM.
   Lee y escribe el estado a través de `ctx` (lo administra StoreService). */
import { ctx } from "./contexto";
import { IND1 } from "../data/norma/indicadores-cap1";
import { IND2 } from "../data/norma/indicadores-cap2";
import { SISTEMAS, TIPOS_GALPON } from "../data/norma/catalogos";
import { ROLES } from "./contexto";

export const codeOf = i => i.cod || i.id;

/* ---------- Parámetros (Tabla 1 y Tabla 2) ---------- */
export const fmt = (n, d = 1) => (n == null || isNaN(n)) ? "—" : Number(n).toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
export const int = n => Number(n || 0).toLocaleString("es-CO");
export const now = () => new Date();
export const hhmm = d => d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
export const today = () => new Date().toISOString().slice(0, 10);
export const stamp = () => { const d = now(); return d.toISOString().slice(0, 10) + " " + d.toTimeString().slice(0, 5); };
export const role = id => ROLES.find(r => r.id === id);
export const ROL_VACIO = { id: "", nombre: "Sin rol", guia: "", plat: "Sin rol", desc: "", menu: ["inicio"] };
export const rolDe = x => (x && x.rolPers && role(x.rolPers)) || role(x && x.rol) || ROL_VACIO;   // rol que se muestra (personalizado o de la guía)
/** Pesos vigentes del capítulo; si el dato histórico no trae capítulo se usa el del capítulo I. */
export const pesosDe = cap => ctx.PARAMS.pesos[cap] || ctx.PARAMS.pesos.I || { MBA: 35, MBR: 35, MBG: 30 };
export const baseRol = id => { const r = role(id); return r && r.base ? r.base : id; };       // perfil base: define qué datos ve y qué acciones permite
export const rolEf = x => (x && (x.rolPers || x.rol)) || "";
export const userById = id => ctx.S.users.find(u => u.id === id);
export const fullName = u => u ? `${u.nombres} ${u.apellidos}` : "—";
export const unidadById = id => ctx.S.unidades.find(x => x.id === Number(id));
export const can = (...roles) => ctx.SES && roles.includes(ctx.SES.rol);
export const roleName = id => (role(id) || {}).nombre || String(id || "—");
export function moduloDe(a, o) {
  const t = (a + " " + o).toLowerCase();
  if (/sesión/.test(t)) return "Acceso";
  if (/permiso|\brol\b/.test(t)) return "Roles y permisos";
  if (/usuario/.test(t)) return "Usuarios";
  if (/unidad productiva|propietario/.test(t)) return "Unidades productivas";
  if (/ponderaciones|importancia|umbral|reincidencia|parametr/.test(t)) return "Parametrización";
  if (/contacto técnico|solicitud técnica/.test(t)) return "Asistente IA";
  if (/evaluación|evaluacion|galpón|evidencia|fases/.test(t)) return "Evaluaciones";
  return "Sistema";
}
/* ex.det = [{ c: dato, a: antes, d: después }] · ex.mot = motivo · ex.m = módulo */
export function audit(a, o, ex = {}) {
  const ur = ctx.SES ? (ctx.SES.rolPers || ctx.SES.rol) : "";
  const fila = { t: stamp(), ur, urn: roleName(ur), up: ctx.SES ? fullName(userById(ctx.SES.id)) : "Sistema", a, o, m: ex.m || moduloDe(a, o), det: ex.det || [], mot: ex.mot || "" };
  ctx.S.audit.unshift(fila);
  if (ctx.onAudit) { try { ctx.onAudit(fila); } catch { /* el registro local no debe romper la acción */ } }
}
export function nivel(p) { if (p == null) return null; return ctx.PARAMS.niveles.find(n => p >= n.min).n; }
export function visibleUnidades() {
  if (!ctx.SES) return [];
  if (ctx.SES.rol === "PROD" || ctx.SES.rol === "TEN") return ctx.S.unidades.filter(x => x.propietario === ctx.SES.id);
  if (ctx.SES.rol === "RT") return ctx.S.unidades.filter(x => x.rt === ctx.SES.id);
  return ctx.S.unidades;
}
export function allResults() {
  const ids = new Set(visibleUnidades().map(x => x.id));
  const h = ctx.S.historico.filter(x => ctx.SES.rol === "CONS" || ids.has(x.unidad)).map(x => ({ ...x, src: "hist" }));
  const e = ctx.S.evaluaciones.filter(x => ["FINALIZADA", "VALIDADA", "CERRADA"].includes(x.estado) && (ctx.SES.rol === "CONS" || ids.has(x.unidad))).map(x => {
    const r = resultado(x); return { codigo: x.codigo, unidad: x.unidad, fecha: x.fecha, total: r.total, g: Object.fromEntries(Object.entries(r.grupos).map(([k, v]) => [k, v.pct])), src: "ev", crit: r.criticos.length };
  });
  return [...h, ...e].sort((a, b) => a.fecha.localeCompare(b.fecha));
}
/* ---------- tablero de inicio: cambia según el perfil ---------- */
export const cap1 = t => t[0] + t.slice(1).toLowerCase();
export const NIV_COL = { EXCELENTE: "var(--campo)", ALTO: "var(--siembra)", MEDIO: "var(--cosecha)", BAJO: "var(--vino)" };
export const MESES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const ultimasPorUnidad = us => us.map(u => { const sn = unitSnaps(u.id); return sn.length ? { u, s: sn[sn.length - 1] } : null; }).filter(Boolean);
export const distNiveles = arr => ctx.PARAMS.niveles.map(n => ({ lab: cap1(n.n), c: arr.filter(t => nivel(t) === n.n).length, color: NIV_COL[n.n] })).reverse();
export function serieMensual(res) {
  if (!res.length) return [];
  const mm = res.map(x => x.fecha.slice(0, 7)).sort(), hoy = today().slice(0, 7), out = []; let [y, m] = mm[0].split("-").map(Number), acc = 0, guard = 0;
  while (guard++ < 240) { const k = `${y}-${String(m).padStart(2, "0")}`, n = mm.filter(x => x === k).length; acc += n; out.push({ k, n, acc }); if (k >= hoy && k >= mm[mm.length - 1]) break; m++; if (m > 12) { m = 1; y++; } }
  return out;
}
export function pendientesInicio() {
  const pend = [];
  ctx.S.evaluaciones.forEach(ev => {
    if (!visibleUnidades().some(u => u.id === ev.unidad)) return;
    if (ABIERTA.includes(ev.estado) && can("INSP", "ADMIN", "COORD") && (ctx.SES.rol !== "INSP" || ev.insp === ctx.SES.id)) { const av = avance(ev); pend.push([vencida(ev) ? `Evaluación incompleta · vencida (más de ${ctx.PARAMS.diasCierre} días)` : ev.estado === "BORRADOR" ? "Visita programada" : "Evaluación en curso", `${ev.codigo} · ${unidadById(ev.unidad).nombre} · ${av.h}/${av.n} indicadores`, `#/evaluacion/${ev.id}`]); }
    if (ev.estado === "FINALIZADA" && can("COORD", "ADMIN")) pend.push(["Validar evaluación", ev.codigo, `#/evaluacion/${ev.id}/resultado`]);
    Object.entries(ev.resp).forEach(([k, v]) => { if (v.doc === "PENDIENTE") pend.push(["Documento por aportar (evaluación ya finalizada)", `${ev.codigo} · ${codeOf(indById(k.split("|")[1]))}`, `#/evaluacion/${ev.id}/MBG`]); });
  });
  visibleUnidades().forEach(u => { if (u.gab && u.gabVence && (new Date(u.gabVence) - now()) / 86400000 < 45) pend.push(["GAB próximo a vencer", `${u.nombre} · ${u.gabVence}`, `#/unidades/${u.id}`]); });
  return pend;
}
export function planesDe(us) { return ultimasPorUnidad(us).flatMap(x => buildPlan(x.s).recs.map(r => ({ ...r, un: x.u, sn: x.s }))).sort((a, b) => a.prio - b.prio || b.score - a.score); }
export function diffUsuario(u, d, rolId) {
  const out = [];
  [["nombres", "Nombres"], ["apellidos", "Apellidos"], ["tipoDoc", "Tipo de documento"], ["doc", "Número de documento"], ["correo", "Correo"], ["tel", "Teléfono"], ["seccional", "Seccional"], ["matricula", "Matrícula profesional"]]
    .forEach(([k, t]) => { if (String(u[k] ?? "") !== String(d[k] ?? "")) out.push({ c: t, a: u[k] || "—", d: d[k] || "—" }); });
  if (rolEf(u) !== rolId) out.push({ c: "Rol", a: roleName(rolEf(u)), d: roleName(rolId), rol: true });
  return out;
}
/* confirmación previa para cambios sensibles: lista lo que tenía y lo que quedaría */
export const PERM_MODS = ["Usuarios y roles", "Registrar o editar unidades", "Crear evaluaciones", "Diligenciar evaluaciones", "Validar evaluaciones", "Parametrización", "Consultar resultados", "Asistente IA"];
export const PERM = {
  ADMIN: [1, 1, 1, 1, 1, 1, 1, 1], COORD: [0, 1, 1, 0, 1, 1, 1, 1], INSP: [0, 1, 0, 1, 0, 0, 1, 1], CONS: [0, 0, 0, 0, 0, 0, 1, 1],
  PROD: [0, 1, 0, 0, 0, 0, 1, 1], TEN: [0, 0, 0, 0, 0, 0, 1, 1], RT: [0, 1, 0, 0, 0, 0, 1, 1]
};
export const PERM_BASE = JSON.parse(JSON.stringify(PERM));        // tope de cada rol de la guía: un rol nuevo nunca supera a su perfil base
export const nUsuariosRol = id => ctx.S.users.filter(u => rolEf(u) === id).length;
export const MODS_CF = ["Usuarios", "Roles y permisos", "Unidades productivas", "Evaluaciones", "Parametrización", "Asistente IA", "Acceso", "Sistema"];
export function cfRol(a) { const r = a.ur && role(a.ur); return r ? r.nombre : (a.urn || a.u || "—"); }   // si el rol existe se muestra su nombre actual
export const totalAves = u => u.galpones.reduce((s, g) => s + Number(g.aves || 0), 0);
export const tipoPredio = u => totalAves(u) >= 200 ? "Granja avícola · Capítulo I" : "Traspatio · Capítulo II";
export const tieneHistorial = u => ctx.S.historico.some(h => h.unidad === u.id) || ctx.S.evaluaciones.some(e => e.unidad === u.id);
export const SIS_KEY = { POLLO_ENGORDE: "engorde", PONEDORA_JAULA: "jaula", PONEDORA_PISO: "piso" };
export const GALPON_LEVEL_EXC = ["MBR-07", "MBR-10", "MBA-11"];      // se evalúan por unidad productiva
export const MIN_REQ = { "MBR-07": [0, 3], "MBR-10": [0] };            // condiciones que dan 1 punto
export const ETAPA_JAULA = { "Producción": 450, "Levante": 300, "Cría": 200 };
export const ETAPA_PISO = { "Producción": 11, "Levante": 15, "Cría": 60, "Pastoreo": 4 };
export const GN = { MBR: "Medidas basadas en los recursos", MBA: "Medidas basadas en el animal", MBG: "Medidas basadas en la gestión" };
export const ESTADOS = { BORRADOR: "t-gray", EN_PROCESO: "t-info", FINALIZADA: "t-warn", VALIDADA: "t-ok", ANULADA: "t-gray", CERRADA: "t-info" };

export const evById = id => ctx.S.evaluaciones.find(e => e.id === Number(id));
export const indsOf = ev => (ev.cap === "I" ? IND1 : IND2);
export const indById = id => IND1.find(i => i.id === id) || IND2.find(i => i.id === id);
/* Traspatio: todos los grupos de aves del predio en la misma visita (numeral 11 · Tabla 35) */
export const GRUPO_DEF = { PON: { sis: "TRAS_PONEDORA", re: /gallina|ponedora/i, lab: "gallinas ponedoras", corto: "Gallinas", ico: "🐔" },
                    POL: { sis: "TRAS_POLLO", re: /pollo/i, lab: "pollos de engorde", corto: "Pollos", ico: "🐥" } };
export const SIN_CORRAL = /patio|suelt|libre/i;
export function buildGrupos(u) {
  return Object.entries(GRUPO_DEF).filter(([id, d]) => u.especies.some(e => e.sis === d.sis)).map(([id, d]) => {
    const gs = u.galpones.filter(x => d.re.test(x.grupo)), n = gs.reduce((a, x) => a + Number(x.aves || 0), 0);
    const corral = gs.some(x => !SIN_CORRAL.test(x.cod));
    const puntos = corral ? Math.max(1, Math.ceil(n / 15)) : 1;
    const aves = corral ? (n < 15 ? n : 2 * puntos) : Math.min(n, 10);
    return { id, sis: d.sis, lab: d.lab, corto: d.corto, ico: d.ico, n, corral, puntos, aves, corrales: gs.map(x => x.cod),
             beb: gs.reduce((a, x) => a + Number(x.beb || 0), 0), com: gs.reduce((a, x) => a + Number(x.com || 0), 0),
             area: gs.reduce((a, x) => a + Number(x.area || 0) + Number(x.patio || 0), 0) };
  }).filter(g => g.n > 0);
}
export const capi = t => t.charAt(0).toUpperCase() + t.slice(1);
export const grupoOf = (ev, gk) => (ev.grupos || []).find(g => g.id === gk);
export function appliesG(ind, ev, gk) { const g = grupoOf(ev, gk); if (!g) return false; return (gk === "PON" ? ind.pon : ind.pol) && !(ind.id === "13.5" && !g.corral); }
export function applies(ind, ev) { return ev.cap === "I" ? !!ind[SIS_KEY[ev.sis]] : ev.grupos.some(g => appliesG(ind, ev, g.id)); }
export const sisLabel = ev => ev.cap === "I" ? SISTEMAS[ev.sis] : "Traspatio · " + ev.grupos.map(g => `${g.n} ${g.lab}`).join(" y ");
export const galponLevel = (ind, ev) => ev.cap === "I" && ind.g !== "MBG" && !GALPON_LEVEL_EXC.includes(ind.id);
export const keysFor = (ind, ev) => ev.cap === "II" ? ev.grupos.filter(g => appliesG(ind, ev, g.id)).map(g => g.id) : galponLevel(ind, ev) ? ev.galpones : ["U"];
export const galpon = (ev, gk) => ev.inv.find(g => g.cod === gk) || ev.inv[0];

/* ---------- respuesta por indicador (con valores precargados del inventario) ---------- */
export function getR(ev, gk, ind) {
  const key = gk + "|" + ind.id;
  if (ev.resp[key]) return ev.resp[key];
  const g = galpon(ev, gk), r = { obs: "", file: "" };
  const k = ind.k;
  if (k === "grid" && ev.cap === "I" && ind.u === "Ave") r.pp = Array.from({ length: ctx.PARAMS.muestreo.puntos }, () => ({ n: 15, c2: 0, c1: 0, c0: 0 }));
  else if (k === "grid" || k === "cc") r.units = Array(unitCount(ind, ev, gk)).fill(null);
  if (ev.cap === "II" && ind.id === "13.1" && !grupoOf(ev, gk).corral) { r.v = 2; r.auto = true; }
  if (k === "check") { r.checks = ind.crit.map(() => false); if (ind.g === "MBG") r.doc = ""; }
  if (k === "ratio") { r.aves = g.aves; r.n = ind.what === "bebedero" ? g.beb : g.com; r.ref = ind.what === "bebedero" ? g.refB : g.refC; }
  if (k === "dens_jaula") r.jaulas = [0, 1, 2].map(() => ({ area: 2700, aves: 6 })), r.etapa = "Producción";
  if (k === "dens_piso") { const sp = ev.pastoreo; r.aves = g.aves; r.area = Number(g.area) + (sp ? Number(g.ext || 0) : 0); r.etapa = sp ? "Pastoreo" : "Producción"; }
  if (k === "dens_engorde") { r.aves = g.aves; r.pu = 0.042; r.gdp = 0.06; r.dias = g.edad; r.area = g.area; r.tipo = g.tipo || "ABIERTO"; }
  if (k === "mort") { r.pct = ""; r.corr = false; }
  if (k === "pct") r.pct = "";
  if (k === "dens_tras_pon" || k === "dens_tras_pol") {
    const G = grupoOf(ev, gk); r.aves = G.n; r.area = G.area; if (k === "dens_tras_pol") r.peso = 2.2;
  }
  ev.resp[key] = r; return r;
}
/* ---------- puntaje de un indicador en un galpón: {pts 0–2, done, det} ---------- */
export function score(ind, r, ev, gk) {
  const k = ind.k, num = v => v === "" || v == null || isNaN(Number(v)) ? null : Number(v);
  if (k === "grid" && r.pp) return scorePP(r, ev);
  if (k === "grid") { const v = r.units.filter(x => x != null); return { pts: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, done: v.length === r.units.length }; }
  if (k === "cc") {
    const map = gk === "PON" ? { 1: 0, 2: 2, 3: 2, 4: 1, 5: 0 } : { 1: 0, 2: 1, 3: 2, 4: 2, 5: 0 };
    const v = r.units.filter(x => x != null).map(x => map[x]); return { pts: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, done: v.length === r.units.length };
  }
  if (k === "scale") return { pts: r.v ?? null, done: r.v != null };
  if (k === "check") {
    const all = r.checks.every(Boolean), touched = r.touched;
    let p = all ? 2 : 0;
    if (!all && MIN_REQ[ind.id] && MIN_REQ[ind.id].every(i => r.checks[i])) p = 1;
    if (!all && ind.rule === "bpumv" && ind.min.every(i => r.checks[i])) p = 1;
    const docOk = ind.g !== "MBG" || !!r.doc;
    return { pts: touched ? p : null, done: !!touched && docOk, det: touched ? `${r.checks.filter(Boolean).length} de ${r.checks.length} condiciones` : "" };
  }
  if (k === "ratio") {
    const a = num(r.aves), n = num(r.n), ref = num(r.ref); if (!a || !n || !ref) return { pts: null, done: false };
    const rel = a / n, exc = (rel / ref - 1) * 100;
    return { pts: exc <= 0 ? 2 : exc <= 30 ? 1 : 0, done: true, det: `${fmt(rel)} aves por ${ind.what} · referencia ${ref} · ${exc <= 0 ? "dentro del límite" : "supera " + fmt(exc) + " %"}` };
  }
  if (k === "dens_jaula") {
    const lim = ETAPA_JAULA[r.etapa], vals = r.jaulas.map(j => num(j.area) && num(j.aves) ? j.area / j.aves : null);
    if (vals.some(v => v == null)) return { pts: null, done: false };
    const pts = vals.map(v => v >= lim ? 2 : 0); return { pts: pts.reduce((a, b) => a + b, 0) / pts.length, done: true, det: `EGJ: ${vals.map(v => fmt(v, 0)).join(" · ")} cm²/ave · umbral ≥ ${lim}` };
  }
  if (k === "dens_piso") {
    const a = num(r.aves), ar = num(r.area); if (!a || !ar) return { pts: null, done: false };
    const d = a / ar, lim = ETAPA_PISO[r.etapa]; return { pts: d <= lim ? 2 : 0, done: true, det: `${fmt(d, 2)} aves/m² · umbral ≤ ${lim}${r.etapa === "Pastoreo" ? " (galpón + corrales exteriores)" : ""}` };
  }
  if (k === "dens_engorde") {
    const a = num(r.aves), ar = num(r.area), pu = num(r.pu), gdp = num(r.gdp), d = num(r.dias); if (!a || !ar || pu == null || gdp == null || d == null) return { pts: null, done: false };
    const pai = pu + gdp * d, p = a * pai / ar, lim = TIPOS_GALPON[r.tipo][1];
    return { pts: p <= lim ? 2 : 0, done: true, det: `PAI = ${fmt(pai, 3)} kg · P = ${fmt(p, 1)} kg/m² · ${TIPOS_GALPON[r.tipo][0]} ≤ ${lim}` };
  }
  if (k === "pct") { const p = num(r.pct); if (p == null) return { pts: null, done: false }; return { pts: p <= 40 ? 2 : p <= 60 ? 1 : 0, done: true, det: `${fmt(p)} % de las aves` }; }
  if (k === "mort") {
    const p = num(r.pct); if (p == null) return { pts: null, done: false };
    const pon = ev.sis !== "POLLO_ENGORDE", [a, b] = pon ? [12, 14] : [6, 9];
    return { pts: p <= a ? 2 : p <= b ? (r.corr ? 1 : 0) : 0, done: true, det: `${fmt(p)} % · límite ${pon ? "ponedoras" : "engorde"} ≤ ${a} % (hasta ${b} % con correctivos)` };
  }
  if (k === "dens_tras_pon") { const a = num(r.aves), ar = num(r.area); if (!a || !ar) return { pts: null, done: false }; const d = a / ar; return { pts: d <= 4 ? 2 : 0, done: true, det: `${fmt(d, 2)} aves/m² · ≤ 4` }; }
  if (k === "dens_tras_pol") { const a = num(r.aves), ar = num(r.area), w = num(r.peso); if (!a || !ar || !w) return { pts: null, done: false }; const d = a * w / ar; return { pts: d <= 33 ? 2 : 0, done: true, det: `${fmt(d, 1)} kg/m² · ≤ 33` }; }
  return { pts: null, done: false };
}
/* ---------- indicador consolidado (promedio de galpones) ---------- */
export function indResult(ind, ev) {
  const ks = keysFor(ind, ev), sc = ks.map(gk => ({ gk, ...score(ind, getR(ev, gk, ind), ev, gk) }));
  let pts;
  if (ev.cap === "II" && (ind.k === "grid" || ind.k === "cc")) {        // numeral 11: promedio de todas las aves o recursos revisados
    const all = ks.flatMap(gk => unitPts(ind, getR(ev, gk, ind), gk)); pts = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
  } else { const v = sc.filter(s => s.pts != null).map(s => s.pts); pts = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }
  return { pts, pct: pts == null ? null : pts / 2 * 100, done: sc.every(s => s.done), sc };
}
/* ---------- resultado de la evaluación (norma 5.3) ---------- */
export function resultado(ev) {
  const pesos = pesosDe(ev.cap), grupos = {}, inds = [];
  ["MBA", "MBR", "MBG"].forEach(g => {
    const list = indsOf(ev).filter(i => i.g === g && applies(i, ev)).map(i => ({ ind: i, ...indResult(i, ev) }));
    inds.push(...list);
    const v = list.filter(x => x.pct != null).map(x => x.pct);
    const pct = v.length ? v.reduce((a, b) => a + b, 0) / v.length : (pesos[g] ? null : null);
    grupos[g] = { pct: pesos[g] ? pct : null, peso: pesos[g], aporte: pesos[g] && pct != null ? pct * pesos[g] / 100 : 0, n: list.length, hechos: list.filter(x => x.done).length };
  });
  const total = Object.values(grupos).reduce((s, g) => s + g.aporte, 0);
  const order = { MBA: 0, MBR: 1, MBG: 2 };
  const criticos = inds.filter(x => x.pct != null && x.pct < 50).sort((a, b) => order[a.ind.g] - order[b.ind.g] || a.pct - b.pct);
  const faltan = inds.filter(x => !x.done);
  return { total, grupos, inds, criticos, faltan };
}
export const diag = p => p >= 90 ? ["Fortaleza", "t-ok"] : p >= 50 ? ["Oportunidad de mejora", "t-warn"] : ["Incumplimiento", "t-err"];

/* ---------- evaluaciones de ejemplo ---------- */
export function newEval(o) {
  const u = unidadById(o.unidad), cap = o.sis.startsWith("TRAS") ? "II" : "I", sis = cap === "II" ? "TRAS" : o.sis;
  const n = ctx.S.nextEval++;
  const ev = { id: n, codigo: `${cap === "I" ? "V" : "T"}-2026-${String(300 + n).padStart(4, "0")}`, unidad: u.id, sis, cap, insp: o.insp, fecha: o.fecha || today(), hora: o.hora || "08:00",
    estado: "BORRADOR", orden: o.orden || "MBR", pastoreo: !!(u.especies.find(e => e.sis === sis) || {}).pastoreo, inv: JSON.parse(JSON.stringify(u.galpones)),
    galpones: cap === "I" ? galSugeridos(u) : ["U"], grupos: cap === "II" ? buildGrupos(u) : [], resp: {}, atiende: "", consent: false, saved: null, validada: null, obsGen: "" };
  ev.galSug = ev.galpones.slice(); ev.galMotivo = "";
  ctx.S.evaluaciones.push(ev); return ev;
}
export const maxGalpones = u => u.capacidad > 50000 ? 2 : 1;
export function rnd(seedv) { let s = seedv; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
export function autofill(ev, seedv = 7, good = 0.72) {
  const R = rnd(seedv), pick = () => { const x = R(); return x < good ? 2 : x < good + 0.2 ? 1 : 0; };
  indsOf(ev).filter(i => applies(i, ev)).forEach(ind => keysFor(ind, ev).forEach(gk => {
    const r = getR(ev, gk, ind);
    if (ind.k === "grid") { if (r.pp) r.pp = r.pp.map(() => { const n = 15 + Math.floor(R() * 4), c = [0, 0, 0]; for (let i = 0; i < n; i++) c[2 - pick()]++; return { n, c2: c[0], c1: c[1], c0: c[2] }; }); else r.units = r.units.map(pick); }
    if (ind.k === "cc") r.units = r.units.map(() => [2, 3, 3, 4, 3][Math.floor(R() * 5)]);
    if (ind.k === "scale" && !r.auto) r.v = pick();
    if (ind.k === "check") { const ok = R() < 0.8; r.checks = r.checks.map((c, i) => ok || i % 2 === 0); r.touched = true; if (ind.g === "MBG") r.doc = r.checks.every(Boolean) ? "APORTADO" : "NO_APORTADO"; }
    if (ind.k === "pct") r.pct = Math.round(R() * 45);
    if (ind.k === "mort") { r.pct = ev.sis === "POLLO_ENGORDE" ? 5.4 : 11.2; }
    if (ind.id === "MBG-09") r.file = "certificados_eutanasia.pdf";
  }));
}
export const canEdit = ev => ["BORRADOR", "EN_PROCESO"].includes(ev.estado) && hasPerm("Diligenciar evaluaciones") && (ctx.SES.rol === "ADMIN" || (ctx.SES.rol === "INSP" && ev.insp === ctx.SES.id));

/* =============================== nueva =============================== */
export function stepsOf(ev) {
  const ph = ev.orden === "MBR" ? ["MBR", "MBA"] : ["MBA", "MBR"];
  const s = [["apertura", "Fase I", "Apertura"], ["muestreo", "Plan", ev.cap === "I" ? "Galpón y muestreo" : "Corrales y muestreo"],
    [ph[0], "Fase II", ph[0] === "MBR" ? "Recursos (MBR)" : "Animal (MBA)"], [ph[1], "Fase III", ph[1] === "MBR" ? "Recursos (MBR)" : "Animal (MBA)"]];
  if (ev.cap === "I") s.push(["MBG", "Fase IV", "Gestión (MBG)"]);
  s.push(["revision", "Revisión", "Completitud"], ["resultado", "Resultado", "Diagnóstico"]);
  if (["FINALIZADA", "VALIDADA"].includes(ev.estado)) s.push(["plan", "Mejora", "Plan de mejora"]);
  s.push(["cierre", "Cierre", "Acta"]);
  return s;
}
export function galponesPendientes(ev, g) {
  const L = indsOf(ev).filter(i => i.g === g && applies(i, ev) && galponLevel(i, ev));
  if (!L.length) return [];
  return ev.galpones.map(k => ({ k, falta: L.filter(i => !score(i, getR(ev, k, i), ev, k).done).length, n: L.length })).filter(x => x.falta > 0);
}
export function bloqueoFase(ev, desde, hacia) {
  if (!canEdit(ev) || ev.cap !== "I" || ev.galpones.length < 2) return null;
  const ks = stepsOf(ev), i0 = ks.findIndex(x => x[0] === desde), i1 = ks.findIndex(x => x[0] === hacia);
  if (i0 < 0 || i1 <= i0) return null;                       // solo al avanzar; volver atrás siempre se puede
  for (let j = i0; j < i1; j++) { const g = ks[j][0]; if (!["MBR", "MBA", "MBG"].includes(g)) continue; const pend = galponesPendientes(ev, g); if (pend.length) return { g, st: ks[j], pend }; }
  return null;
}
export const RES_U = { Bebedero: ["bebederos", "beb", "MBR-06"], Comedero: ["comederos", "com", "MBR-09"] };
export function unitLab(ind, i) {
  if (ind.cap === "I" && ind.cnt === 9 && ["Bebedero", "Comedero", "Nidal", "Jaula"].includes(ind.u)) return `Punto ${i + 1}`;
  return `${ind.u} ${i + 1}`;
}
export function muestraTxt(ind, ev, gk) {
  const k = ind.k;
  if (ev.cap === "I") {
    const g = galpon(ev, gk), jaula = ev.sis === "PONEDORA_JAULA";
    if (k === "grid") {
      if (ind.u === "Ave") return `9 puntos del galpón ${gk} (extremos y centro, Ilustración 2) con ${jaula ? "3 a 5 jaulas y 10 a 20 aves" : "15 a 30 aves"} por punto: entre ${int(9 * PP_RANGO(ev)[0])} y ${int(9 * PP_RANGO(ev)[1])} aves de ${int(g.aves)} en inventario. En cada punto anote cuántas aves revisó y cuántas quedaron en 2, 1 y 0 puntos.`;
      if (ind.u === "Hoja") return `3 hojas centinela (centro y dos extremos del galpón ${gk}); cada casilla es una hoja.`;
      if (ind.u === "Punto") return `1 puñado de cama en cada uno de los 9 puntos del galpón ${gk}; cada casilla es un punto.`;
      if (RES_U[ind.u]) { const [pl, f, rel] = RES_U[ind.u]; return `En cada uno de los 9 puntos se revisan los 4 o 5 ${pl} más cercanos (jaula: los de cada jaula); cada casilla es la calificación del punto. El total del inventario (${int(g[f])} ${pl}) no se revisa uno a uno: se usa en ${rel}.`; }
      if (ind.u === "Nidal") return `El nidal más cercano a cada uno de los 9 puntos del galpón ${gk}; cada casilla es un punto.`;
      if (ind.u === "Jaula") return `3 a 5 jaulas por punto (nivel bajo, intermedio y alto) en los 9 puntos; cada casilla es la calificación del punto.`;
    }
    if (k === "ratio") return `Sin muestreo: usa los totales del inventario del galpón ${gk} (${int(g.aves)} aves y ${int(ind.what === "bebedero" ? g.beb : g.com)} ${ind.what}s) frente a la referencia del fabricante.`;
    if (k === "dens_jaula") return `3 jaulas de muestra: área de cada jaula y número de aves alojadas.`;
    if (k.startsWith("dens")) return `Sin muestreo: usa el total de aves y el área del galpón ${gk} registrados en el inventario${ev.pastoreo ? " (incluye corrales exteriores)" : ""}.`;
    if (k === "pct") return jaula ? "Conteo de aves con el comportamiento antes de abrir cada jaula de la muestra." : "Estimación visual del % de aves con el comportamiento en el centro y los extremos del galpón, antes de cualquier otra medición.";
    if (k === "mort") return "Registros de mortalidad de los últimos 5 ciclos (ponedoras: acumulada a la semana 80).";
    if (k === "check") return ind.g === "MBG" ? "Revisión documental de la unidad productiva (no depende del galpón)." : "Verificación visual en la unidad productiva y revisión del POE y sus registros.";
    return ind.uni || ind.met;
  }
  const G = grupoOf(ev, gk), corr = G.corrales.join(", "), lab = G.lab;
  if ((k === "grid" && ind.u === "Ave") || k === "cc") {
    if (!G.corral) return `Numeral 11 · sin corral (${corr}): se inspeccionan mínimo 10 aves (todas si hay menos), priorizando las de mayor edad → ${G.aves} de ${G.n} ${lab}; cada casilla es un ave.`;
    if (G.n < 15) return `Numeral 11: ${G.n} ${lab} en ${corr} (menos de 15) → se evalúan todas: ${G.n} aves; cada casilla es un ave.`;
    return `Numeral 11: ${G.n} ${lab} en ${corr} → ${G.puntos} puntos de inspección (1 por cada 15 aves) con 1 a 2 aves cada uno → ${G.aves} aves, priorizando las de mayor edad; cada casilla es un ave.`;
  }
  if (k === "grid" && RES_U[ind.u]) { const [pl, f] = RES_U[ind.u]; return `Se evalúan todos los ${pl} del grupo, dentro y fuera del corral${G.corral ? "" : " (fuera del corral deben estar bajo sombra)"}: ${G[f]} en el inventario de ${corr}; cada casilla es un ${ind.u.toLowerCase()}.`; }
  if (k === "grid" && ind.u === "Punto") return `1 puñado de cama por punto de inspección de ${corr}: ${G.puntos} punto(s) (1 por cada 15 aves).`;
  if (k === "grid" && ind.u === "Nidal") return G.corral ? `El nidal más cercano a cada punto de inspección: ${G.puntos} nidal(es).` : `Sin corral: los nidales del lugar donde ponen las gallinas, según indique el productor.`;
  if (ind.id === "13.1") return G.corral ? `1 hoja centinela en el centro de ${corr}, colocada al inicio y retirada al final de la visita.` : `Sin corral (${corr}): se califica automáticamente con 2 puntos (13.1).`;
  if (k.startsWith("dens")) return `Sin muestreo: ${G.n} ${lab} y ${fmt(G.area, 0)} m² de corral + patio registrados en el inventario (${corr}).`;
  return ind.uni || ind.met;
}
export function unitCount(ind, ev, gk) {
  if (ev.cap === "I") return ind.cnt;
  const G = grupoOf(ev, gk);
  if (ind.u === "Ave" || ind.k === "cc") return Math.max(1, G.aves);
  if (ind.u === "Bebedero") return Math.max(1, G.beb);
  if (ind.u === "Comedero") return Math.max(1, G.com);
  return Math.max(1, G.puntos);
}
export function unitPts(ind, r, gk) {
  if (ind.k === "cc") { const map = gk === "PON" ? { 1: 0, 2: 2, 3: 2, 4: 1, 5: 0 } : { 1: 0, 2: 1, 3: 2, 4: 2, 5: 0 }; return r.units.filter(x => x != null).map(x => map[x]); }
  return r.units.filter(x => x != null);
}
export function resultadoPorGrupo(ev) {
  return ev.grupos.map(G => {
    const gr = {};
    ["MBA", "MBR"].forEach(g => {
      const v = indsOf(ev).filter(i => i.g === g && appliesG(i, ev, G.id)).map(i => score(i, getR(ev, G.id, i), ev, G.id).pts).filter(x => x != null).map(x => x / 2 * 100);
      gr[g] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    });
    const total = ["MBA", "MBR"].reduce((t, g) => t + (gr[g] || 0) * ctx.PARAMS.pesos.II[g] / 100, 0);
    return { G, gr, total };
  });
}

/* =====================================================================
   PlumaViva · ampliación v3
   1) Identidad propia (logo)         2) Resumen e historial por unidad productiva
   3) Recomendaciones automáticas     4) Importancia y obligatoriedad de indicadores
   Todo se calcula con la parametrización vigente (ctx.PARAMS) y con los datos de cada evaluación.
   ===================================================================== */

/* ---------- 1 · logo del proyecto (SVG en línea, sin archivos externos) ---------- */
export const IMP_NIV = {
  4: { n: "Crítico", d: "Compromete la vida, el acceso a agua o alimento, el confort térmico o el espacio vital de las aves, o es un requisito legal de base." },
  3: { n: "Alto", d: "Su incumplimiento causa dolor, lesión, enfermedad o riesgo sanitario, o exige un documento firmado por un profesional." },
  2: { n: "Medio", d: "Contribuye al bienestar y a la prevención, pero su déficit no genera por sí solo sufrimiento inmediato." },
  1: { n: "Complementario", d: "Buena práctica de apoyo: mejora la comodidad o la calidad del manejo." }
};
ctx.PARAMS.imp = {
  "MBR-01": 2, "MBR-02": 3, "MBR-03": 3, "MBR-04": 4, "MBR-05": 4, "MBR-06": 4, "MBR-07": 2, "MBR-08": 3, "MBR-09": 4, "MBR-10": 4, "MBR-11": 2, "MBR-12": 4, "MBR-13": 4, "MBR-14": 4,
  "MBA-01": 4, "MBA-02": 3, "MBA-03": 2, "MBA-04": 3, "MBA-05": 2, "MBA-06": 2, "MBA-07": 3, "MBA-08": 2, "MBA-09": 3, "MBA-10": 2, "MBA-11": 4,
  "MBG-01": 3, "MBG-02": 4, "MBG-03": 4, "MBG-04": 3, "MBG-05": 3, "MBG-06": 2, "MBG-07": 2, "MBG-08": 4, "MBG-09": 3, "MBG-10": 4,
  "13.1": 2, "13.2": 2, "13.3": 4, "13.4": 3, "13.5": 3, "13.6": 1, "13.7": 3, "13.8": 3, "13.9": 3,
  "14.1": 4, "14.2": 3, "14.3": 2, "14.4": 3, "14.5": 2, "14.6": 2, "14.7": 3, "14.8": 1, "14.9": 3, "14.10": 1, "14.11": 4
};
ctx.PARAMS.oblDesde = 3;     // los indicadores con importancia ≥ este nivel son de obligatorio cumplimiento
export const impOf = ind => ctx.PARAMS.imp[ind.id] ?? 2;
export const esObl = ind => impOf(ind) >= ctx.PARAMS.oblDesde;
export const CUMPLE = 99.95;
export const estCump = p => p >= CUMPLE ? ["Cumple", "t-ok"] : p >= 50 ? ["Parcial", "t-warn"] : ["No cumple", "t-err"];
export const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
export const GCORTO = { MBA: "Animal", MBR: "Recursos", MBG: "Gestión" };
export const addDays = (f, n) => { const [y, m, d] = f.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
export const diasHasta = f => Math.round((new Date(f + "T00:00:00Z") - new Date(today() + "T00:00:00Z")) / 86400000);

/* ---------- catálogo de acciones sugeridas (por tema) ---------- */
export const PLAZO = { I: { l: "Inmediato (≤ 15 días)", d: 15 }, C: { l: "Corto plazo (≤ 60 días)", d: 60 }, M: { l: "Mediano plazo (≤ 90 días)", d: 90 } };
export const REC = {
  "MBR-01": { t: "C", a: ["Revisar la ventilación (mínima y de transición) para renovar el aire sin levantar polvo.", "Mantener la cama seca y friable: removerla y reponer material limpio para que no libere polvo fino.", "Evitar barrer en seco o manipular cama y alimento con las aves presentes; humedecer ligeramente pasillos si hace falta.", "Verificar la calidad del alimento (exceso de finos) y el estado de los equipos de distribución."] },
  "MBR-02": { t: "I", a: ["Remover y airear la cama a diario en las zonas compactas; retirar placas y puntos húmedos.", "Reparar fugas de bebederos, techos y cortinas, y ajustar la altura de los bebederos.", "Reponer material de cama seco y de buena calidad donde esté apelmazado.", "Ajustar la ventilación para evacuar humedad y evitar sobredensidad."] },
  "MBR-03": { t: "M", a: ["Reparar o reemplazar mallas, puertas y soportes con salientes, deformaciones o desgaste.", "Verificar la altura de la jaula frente a lo exigido: si es insuficiente anula el puntaje, por lo que se debe corregir primero.", "Incluir en el POE la limpieza y la inspección periódica de las jaulas, con registro."] },
  "MBR-04": { t: "I", a: ["Ajustar la altura de los bebederos a la de las aves y modificarla según crecen (la altura insuficiente anula el puntaje).", "Reparar o reemplazar bebederos rotos, con fugas o con bordes deteriorados.", "Programar lavado y desinfección periódica, purgando las líneas para eliminar la lama."] },
  "MBR-05": { t: "I", a: ["Verificar presión y flujo en las líneas (reguladores, filtros, purgas) y corregir obstrucciones.", "Calibrar válvulas o niveles de llenado en bebederos de campana o niple.", "Tener un plan de contingencia de agua (tanque de reserva, bomba de respaldo) para horas de calor."] },
  "MBR-06": { t: "C", a: ["Contrastar el número de aves con el de bebederos según la referencia de la casa genética o del fabricante.", "Instalar bebederos adicionales hasta cumplir la relación aves por bebedero.", "Si no es posible ampliar, ajustar la población alojada y actualizar el inventario en la plataforma."] },
  "MBR-07": { t: "C", a: ["Redactar el protocolo de tratamiento del agua en un POE firmado por profesional con matrícula.", "Verificar que la infraestructura (dosificador, filtros, tanques) funcione y tenga mantenimiento.", "Llevar registros periódicos (cloro residual, pH, limpieza de tanques) como soporte de implementación."] },
  "MBR-08": { t: "I", a: ["Ajustar la altura de los comederos al dorso de las aves y modificarla con la edad (la altura insuficiente anula el puntaje).", "Reparar o reemplazar comederos deteriorados, con bordes filosos o fugas de alimento.", "Limpiar con regularidad y retirar alimento húmedo o apelmazado."] },
  "MBR-09": { t: "C", a: ["Contrastar el número de aves con el de comederos según la referencia del fabricante o de la casa genética.", "Agregar comederos o tramos de canal hasta cumplir la relación aves por comedero.", "Si no es posible ampliar, ajustar la población y actualizar el inventario."] },
  "MBR-10": { t: "C", a: ["Garantizar equipos funcionales de confort térmico (ventiladores, extractores, nebulizadores, cortinas, calefacción según la etapa) con mantenimiento programado.", "Declarar los equipos y su manejo en el POE de bienestar.", "Contar con electrolitos con soporte (factura o registro) y llevar registro de uso en eventos de estrés térmico."] },
  "MBR-11": { t: "C", a: ["Reparar nidales con pisos, bordes o divisiones dañados y eliminar salientes.", "Mantenerlos limpios, con material de nido suficiente y en número acorde con las gallinas alojadas.", "Ubicarlos en zonas tranquilas, sombreadas y de fácil acceso."] },
  "MBR-12": { t: "M", a: ["Ajustar el número de aves por jaula para cumplir el área mínima por ave según la etapa (ver umbrales).", "Medir y registrar el área real de las jaulas muestreadas.", "Programar el descenso gradual de población o la ampliación de jaulas en el próximo ciclo."] },
  "MBR-13": { t: "M", a: ["Reducir la densidad de aves por m² hasta el umbral de la etapa productiva (ver umbrales).", "Si hay pastoreo, incluir en el área útil los corrales exteriores efectivamente disponibles y registrarlos.", "Planear la siembra del próximo lote con base en el área real del galpón."] },
  "MBR-14": { t: "M", a: ["Reducir el número de aves sembradas o el peso de salida para no superar los kg/m² del tipo de galpón (ver umbrales).", "Programar raleos o ventas parciales antes de que se exceda la carga.", "Verificar que el tipo de galpón registrado en la unidad productiva sea el correcto."] },
  "MBA-01": { t: "I", a: ["Reforzar ventilación y enfriamiento en las horas de mayor temperatura (modo túnel, nebulización, cortinas).", "Garantizar agua fresca y accesible en todo momento; evitar manejos y recolecciones en horas de calor.", "Activar el protocolo de emergencia térmica (MBG-05) y registrar los eventos de calor."] },
  "MBA-02": { t: "I", a: ["Identificar la causa del amontonamiento: temperatura, corrientes de aire, luz, ruido o presencia de depredadores.", "Ajustar calefacción, ventilación y distribución de luz y equipos para que las aves se repartan.", "Reducir estímulos de estrés y estandarizar el ingreso del personal al galpón."] },
  "MBA-03": { t: "M", a: ["Revisar con el nutricionista o MVZ el aporte de calcio, fósforo y vitamina D de la dieta.", "Mejorar el diseño de perchas y el manejo para reducir golpes y presión sobre la quilla.", "Revisar el manejo de captura y transporte de las aves."] },
  "MBA-04": { t: "C", a: ["Mantener la cama seca y friable; corregir fugas y reforzar la ventilación.", "Revisar con el MVZ la nutrición (biotina, zinc, proteína) y las causas digestivas que humedecen la cama.", "En ponedoras, revisar pisos, rejillas y perchas como posible fuente de lesión."] },
  "MBA-05": { t: "C", a: ["Revisar jaulas, rejillas, perchas y equipos en contacto con las patas para eliminar bordes o atrapamientos.", "Capacitar al personal en captura y manejo suave de aves.", "Registrar los casos y la causa probable para hacer seguimiento."] },
  "MBA-06": { t: "C", a: ["Mejorar la cama y las superficies de descanso (secas, blandas y sin compactación).", "Revisar el ritmo de crecimiento y la densidad con el responsable técnico.", "Reducir el tiempo de contacto de las aves con cama húmeda."] },
  "MBA-07": { t: "C", a: ["Identificar la causa: picaje o canibalismo, peleas, ectoparásitos, equipos con filos o prolapsos.", "Revisar densidad, luz, nutrición y enriquecimiento ambiental (material para picotear).", "Hacer control de ectoparásitos con plan sanitario del MVZ y retirar y tratar las aves lesionadas."] },
  "MBA-08": { t: "C", a: ["Mejorar la cama y corregir el goteo de bebederos para evitar plumaje sucio o mojado.", "Revisar con el MVZ posibles causas digestivas (diarreas) o parasitarias.", "Controlar el picaje y los ectoparásitos que deterioran el plumaje."] },
  "MBA-09": { t: "I", a: ["Controlar el amoníaco y el polvo con ventilación adecuada y manejo de cama.", "Revisar con el MVZ el programa de vacunación y la bioseguridad; aislar y tratar a las aves afectadas.", "Ante brotes, tomar muestras para diagnóstico y registrar las acciones."] },
  "MBA-10": { t: "M", a: ["Si se corrige el pico, documentar la técnica, la edad y quién la ejecuta, bajo los criterios del POE (reducción del dolor).", "Reducir las causas de picaje (densidad, luz, nutrición, enriquecimiento) para disminuir la necesidad de corrección.", "Capacitar al personal en la técnica y revisar los casos con daño severo."] },
  "MBA-11": { t: "I", a: ["Analizar las causas de mortalidad por lote y por semana (necropsias, registros) con el MVZ.", "Establecer acciones correctivas documentadas: según el umbral, la evidencia de correctivos puede dar 1 punto en lugar de 0.", "Reforzar bioseguridad, manejo inicial de pollitos, agua y alimento en las etapas con más pérdidas."] },
  "MBG-01": { t: "C", a: ["Contratar el análisis fisicoquímico y microbiológico de cada fuente de agua con un laboratorio autorizado y renovarlo antes de cumplir un año.", "Si el análisis arroja hallazgos, documentar el correctivo (cloración, filtrado, limpieza de tanques) y repetir la prueba."] },
  "MBG-02": { t: "C", a: ["Archivar facturas, remisiones o etiquetas del alimento de cada lote como soporte.", "Verificar con el nutricionista que la fórmula corresponda a la etapa productiva y que la planta fabricante tenga registro ICA."] },
  "MBG-03": { t: "C", a: ["Tramitar o renovar el certificado de Granja Avícola Bioseguro (GAB) antes de que venza.", "Mantener el plan de control de enfermedades de control oficial con registros de ejecución."] },
  "MBG-04": { t: "C", a: ["Redactar el POE de bienestar animal con plan de vacunación, densidades, manejo de animales enfermos y prácticas para reducir el dolor.", "Hacerlo firmar por un MV, MVZ o Z con matrícula vigente y socializarlo con el personal."] },
  "MBG-05": { t: "C", a: ["Elaborar el protocolo de emergencias térmicas (calor y frío) dentro del POE, con equipos e insumos definidos.", "Revisar equipos y reservas antes de las épocas críticas y hacer que lo firme un profesional con matrícula."] },
  "MBG-06": { t: "C", a: ["Definir por escrito el programa de luz y oscuridad de 24 h por ciclo, según la edad de las aves.", "Incluir el protocolo ante cambios abruptos de luz (por ejemplo, fallas eléctricas) con alternativas de respaldo.", "Firmarlo por un profesional con matrícula."] },
  "MBG-07": { t: "C", a: ["Inscribir a todo el personal en un curso de bienestar animal con entidad válida (FENAVI, ICA, SENA u otra) y conservar los certificados.", "Programar la capacitación de personal nuevo durante su primer mes."] },
  "MBG-08": { t: "C", a: ["Documentar el protocolo de sacrificio humanitario o eutanasia: método, criterios de decisión y compromiso ético, basado en el título 7 del código OMSA.", "Firmarlo por MV o MVZ con matrícula y adjuntar la ficha técnica."] },
  "MBG-09": { t: "C", a: ["Capacitar al personal que ejecuta la eutanasia o designar a un MV/MVZ con matrícula vigente para hacerla.", "Adjuntar los certificados o la matrícula como evidencia (obligatoria en la plataforma)."] },
  "MBG-10": { t: "C", a: ["Verificar que todos los medicamentos tengan registro ICA y estén prescritos por MV/MVZ, con registro de tratamientos.", "Depurar la bodega: retirar productos vencidos, almacenar según el rotulado, mantenerla limpia y con agujas y equipos en buen estado.", "Descartar cualquier sustancia prohibida."] },
  "T-ALOJ": { t: "M", a: ["Construir o adecuar un corral que proteja a las aves de depredadores y del clima (techo, malla, puerta con cierre).", "Si ya existe, reparar huecos y filtraciones y cerrarlo por la noche.", "Ofrecer sombra y un refugio para la lluvia."] },
  "T-CONF": { t: "C", a: ["Ofrecer sombra permanente (árboles o techos) y buena ventilación natural en el corral.", "Mantener agua fresca a la sombra y evitar que las aves queden al sol en las horas más calientes.", "Proteger a las aves de corrientes frías y de la lluvia en la noche."] },
  "T-ESP-PON": { t: "M", a: ["Reducir el número de gallinas o ampliar el área del corral y el patio hasta no superar 4 aves/m².", "Rotar las zonas del patio cuando sea posible.", "Vender o retirar las aves excedentes."] },
  "T-ESP-POL": { t: "M", a: ["Ajustar el número de pollos o el área para no superar 33 kg/m² (peso promedio × aves ÷ área).", "Vender o sacrificar a tiempo los pollos que ya alcanzaron el peso de salida."] },
  "T-CC": { t: "C", a: ["Revisar la alimentación: cantidad, calidad y frecuencia según la edad y el tipo de ave.", "Desparasitar y revisar la salud de las aves muy flacas o con exceso de peso.", "Separar a las aves débiles para que coman con tranquilidad y verificar que haya comederos suficientes."] }
};
export const RECMAP = { "13.1": ["MBR-01"], "13.2": ["MBR-02"], "13.3": ["MBR-04", "MBR-05"], "13.4": ["MBR-08"], "13.5": ["T-CONF"], "13.6": ["MBR-11"], "13.7": ["T-ESP-PON"], "13.8": ["T-ESP-POL"], "13.9": ["T-ALOJ"],
  "14.1": ["MBA-01"], "14.2": ["MBA-02"], "14.3": ["MBA-03"], "14.4": ["MBA-04"], "14.5": ["MBA-05"], "14.6": ["MBA-06"], "14.7": ["MBA-07"], "14.8": ["MBA-08"], "14.9": ["MBA-09"], "14.10": ["MBA-10"], "14.11": ["T-CC"] };

/* ---------- 3 · historial por unidad: instantánea de cada calificación ---------- */
export const FINAL = ["FINALIZADA", "VALIDADA", "CERRADA"];
export function levelsOf(ind) {                      // niveles posibles (en %) de un indicador; null = continuo
  if (ind.k === "grid" || ind.k === "cc") return null;
  if (ind.k.startsWith("dens")) return [100, 0];
  if (ind.k === "check" && ind.rule === "all" && !MIN_REQ[ind.id]) return [100, 0];
  return [100, 50, 0];
}
export function enrichHistorico() {     // el histórico de ejemplo solo traía totales: se le agrega el detalle por indicador
  ctx.S.historico.forEach(h => {
    const u = unidadById(h.unidad), sk = u ? ((u.especies || []).find(e => e && !String(e.sis).startsWith("TRAS")) || {}).sis : null;
    // Las filas anteriores a esta versión no guardaban capítulo ni sistema: se deducen de la unidad.
    if (!h.cap) h.cap = sk ? "I" : "II";
    if (!h.sis) h.sis = h.cap === "II" ? "TRAS" : (sk || "POLLO_ENGORDE");
    if (h.det && Object.keys(h.det).length) return;
    const list = h.cap === "I" ? IND1.filter(i => i[SIS_KEY[h.sis]]) : IND2, pesos = pesosDe(h.cap), g0 = { ...(h.g || {}) }, t0 = h.total;
    const seed0 = h.codigo.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100000, 7);
    let best = null;
    for (let t = 0; t < 120 && !(best && best.ok); t++) {
      const R = rnd(seed0 + t * 131), det = {}, g = { ...g0 };
      ["MBA", "MBR", "MBG"].forEach(gr => {
        const L = list.filter(i => i.g === gr); if (!L.length || !pesos[gr] || !g0[gr]) return;
        const m = g0[gr], lev = L.map(levelsOf);
        const v = L.map((i, k) => { const ls = lev[k]; if (!ls) return Math.max(0, Math.min(100, Math.round(m + (R() - .5) * 50)));
          if (R() * 100 < m) return ls.includes(50) && R() < .2 ? 50 : 100; return ls.includes(50) && R() < .35 ? 50 : 0; });
        for (let it = 0; it < 600; it++) {
          const d = m - avg(v); if (Math.abs(d) <= 1) break;
          const k = Math.floor(R() * L.length), old = v[k]; let nv = old;
          if (!lev[k]) nv = Math.max(0, Math.min(100, old + Math.sign(d) * Math.min(5, Math.abs(d) * L.length)));
          else { const ls = lev[k], c = ls.indexOf(old), nx = d > 0 ? ls[c - 1] : ls[c + 1]; if (nx != null) nv = nx; }
          v[k] = nv; if (Math.abs(m - avg(v)) >= Math.abs(d)) v[k] = old;
        }
        L.forEach((i, k) => det[i.id] = v[k]); g[gr] = Math.round(avg(v) * 10) / 10;
      });
      const total = Math.round(["MBA", "MBR", "MBG"].reduce((s, gr) => s + (pesos[gr] ? (g[gr] || 0) * pesos[gr] / 100 : 0), 0) * 10) / 10;
      best = { det, g, total, ok: nivel(total) === nivel(t0) && Math.abs(total - t0) <= 1.2 };
    }
    h.det = best.det; h.g = best.g; h.total = best.total;
  });
}
export function missFromPct(ind, pct) {
  if (ind.k !== "check" || pct >= CUMPLE) return [];
  const mn = MIN_REQ[ind.id] || ind.min;
  return pct >= 50 && mn ? ind.crit.filter((c, i) => !mn.includes(i)) : ind.crit.slice();
}
export function snapOfHist(h) {
  const u = unidadById(h.unidad), sk = u ? ((u.especies || []).find(e => e && !String(e.sis).startsWith("TRAS")) || {}).sis : null;
  const cap = h.cap || (sk ? "I" : "II"), sis = h.sis || (cap === "I" ? sk : "TRAS") || "TRAS";
  const items = Object.entries(h.det || {}).map(([id, pct]) => { const ind = indById(id); return { ind, pct, det: "", miss: missFromPct(ind, pct) }; });
  return { codigo: h.codigo, unidad: h.unidad, fecha: h.fecha, cap, sis, sisLab: cap === "I" ? SISTEMAS[sis] : "Traspatio", total: h.total, g: h.g, items, src: "hist", estado: "CERRADA" };
}
export function snapOfEv(ev) {
  const r = resultado(ev);
  const items = r.inds.filter(x => x.pct != null).map(x => {
    const rr = x.ind.k === "check" ? getR(ev, "U", x.ind) : null;
    return { ind: x.ind, pct: x.pct, det: x.sc.map(s => s.det).filter(Boolean).join(" · "), miss: rr ? x.ind.crit.filter((c, i) => !rr.checks[i]) : [], doc: rr && rr.doc };
  });
  return { codigo: ev.codigo, unidad: ev.unidad, fecha: ev.fecha, cap: ev.cap, sis: ev.sis, sisLab: sisLabel(ev), total: r.total, g: Object.fromEntries(Object.entries(r.grupos).map(([k, v]) => [k, v.pct])), items, src: "ev", id: ev.id, estado: ev.estado, insp: ev.insp, obs: ev.obsGen };
}
export function unitSnaps(uid) {
  const h = ctx.S.historico.filter(x => x.unidad === uid).map(snapOfHist);
  const e = ctx.S.evaluaciones.filter(x => x.unidad === uid && FINAL.includes(x.estado)).map(snapOfEv);
  return [...h, ...e].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.codigo.localeCompare(b.codigo));
}

export function prevSnap(ev) {
  if (!(ev.id in ctx.ui.PREVC)) { const sn = unitSnaps(ev.unidad).filter(s => s.codigo !== ev.codigo && s.fecha <= ev.fecha); ctx.ui.PREVC[ev.id] = sn.length ? sn[sn.length - 1] : null; }
  return ctx.ui.PREVC[ev.id];
}

/* ---------- 4 · motor de recomendaciones (usa pesos, niveles y escalas parametrizados) ---------- */
export function metaText(ind) {
  let m = ind.p2;
  if (ind.k === "dens_jaula") m += " · " + Object.entries(ETAPA_JAULA).map(([e, v]) => `${e} ≥ ${v} cm²/ave`).join(", ");
  if (ind.k === "dens_piso") m += " · " + Object.entries(ETAPA_PISO).map(([e, v]) => `${e} ≤ ${v} aves/m²`).join(", ");
  if (ind.k === "dens_engorde") m += " · " + Object.values(TIPOS_GALPON).map(([n, v]) => `${n} ≤ ${v} kg/m²`).join(", ");
  if (ind.k === "mort") m += " · Engorde ≤ 6 % (hasta 9 % con correctivos) · Ponedoras ≤ 12 % (hasta 14 % con correctivos)";
  return m;
}
export const NEXT_LVL = total => { const i = ctx.PARAMS.niveles.findIndex(n => total >= n.min); return i > 0 ? ctx.PARAMS.niveles[i - 1] : null; };
export const PRIO = { 1: ["Crítica", "t-err"], 2: ["Urgente", "t-warn"], 3: ["Importante", "t-info"], 4: ["Menor", "t-gray"] };
export const esTec = () => ["ADMIN", "COORD", "INSP", "RT"].includes(ctx.SES.rol);          // perfiles técnicos: ven los puntos de atención
export const planHref = x => x.src === "ev" ? "#/evaluacion/" + x.id + "/plan" : "#/plan/" + encodeURIComponent(x.codigo);


/* ---------- informe de importancia / obligatoriedad ---------- */
export let EF = { u: "", est: "", nivel: "" };
export const estU = u => u.estado === "ACTIVA" ? "ACTIVA" : "INHABILITADA";
export const normTxt = t => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
export const MOT_INHAB = { Temporal: ["Suspensión por registro sanitario", "Suspensión temporal de la actividad (sin aves)", "Cambio de propietario en trámite", "Otro"],
  Definitiva: ["Venta del predio", "Cierre de la actividad avícola", "Otro"] };
export const CAMPOS_U = [["Datos básicos", "nombre", "Nombre de la unidad"], ["Datos básicos", "codigo", "Código de predio ICA"], ["Datos básicos", "propietario", "Propietario", 1], ["Datos básicos", "operario", "Operario / administrador"],
  ["Datos básicos", "rt", "Responsable técnico", 1], ["Datos básicos", "capacidad", "Capacidad instalada (aves)", 1], ["Datos básicos", "gab", "Certificado GAB"], ["Datos básicos", "gabVence", "Vigencia del GAB"],
  ["Ubicación", "depto", "Departamento"], ["Ubicación", "mun", "Municipio"], ["Ubicación", "vereda", "Vereda"], ["Ubicación", "dir", "Dirección"], ["Ubicación", "indic", "Indicaciones de llegada"], ["Ubicación", "lat", "Latitud"], ["Ubicación", "lon", "Longitud"]];
export const nv = v => v === "" || v == null ? "" : String(Number.isNaN(Number(v)) ? v : Number(v));
export function valU(k, v) { if (k === "propietario" || k === "rt") return v ? fullName(userById(v)) : "—"; if (k === "gab") return v ? "Sí" : "No"; if (k === "capacidad") return v === "" || v == null ? "—" : int(v); return v === "" || v == null ? "—" : String(v); }
export function diffUnidad(a, b) {
  const out = [], push = (grupo, campo, antes, despues, sens) => out.push({ grupo, campo, antes, despues, sens: !!sens });
  CAMPOS_U.forEach(([g, k, t, sens]) => { if (nv(a[k]) !== nv(b[k])) push(g, t, valU(k, a[k]), valU(k, b[k]), sens); });
  const sa = a.especies.map(e => e.sis), sb = b.especies.map(e => e.sis), lab = x => SISTEMAS[x] || x;
  sb.filter(x => !sa.includes(x)).forEach(x => push("Especies", "Sistema productivo", "—", lab(x) + " (agregado)", 1));
  sa.filter(x => !sb.includes(x)).forEach(x => push("Especies", "Sistema productivo", lab(x), "Retirado", 1));
  sb.filter(x => sa.includes(x)).forEach(x => { const pa = !!a.especies.find(e => e.sis === x).pastoreo, pb = !!b.especies.find(e => e.sis === x).pastoreo; if (pa !== pb) push("Especies", lab(x) + " · pastoreo", pa ? "Sí" : "No", pb ? "Sí" : "No", 1); });
  const ca = new Set(a.galpones.map(g => g.cod)), cb = new Set(b.galpones.map(g => g.cod)), res = g => `${int(g.aves || 0)} aves · ${int(g.area || 0)} m²`;
  b.galpones.filter(g => !ca.has(g.cod)).forEach(g => push("Inventario", `Galpón ${g.cod}`, "—", "Agregado · " + res(g), 1));
  a.galpones.filter(g => !cb.has(g.cod)).forEach(g => push("Inventario", `Galpón ${g.cod}`, res(g), "Retirado", 1));
  b.galpones.filter(g => ca.has(g.cod)).forEach(g => { const o = a.galpones.find(x => x.cod === g.cod);
    [["tipo", "Tipo de galpón", 1], ["area", "Área útil (m²)", 1], ["ext", "Exterior / patio (m²)", 1], ["beb", "Bebederos"], ["com", "Comederos"], ["grupo", "Grupo etario"], ["edad", "Edad"], ["aves", "Aves", 1]].forEach(([k, t, sens]) => {
      const x = k === "ext" ? (o.ext || o.patio || 0) : o[k], y = k === "ext" ? (g.ext || g.patio || 0) : g[k], f = (r, v) => k === "tipo" ? ((TIPOS_GALPON[v] || [])[0] || "—") : k === "edad" ? `${nv(v) || "—"} ${r.unidad || ""}`.trim() : (nv(v) === "" ? "—" : (typeof v === "number" || !Number.isNaN(Number(v)) && v !== "" ? int(Number(v)) : String(v)));
      if (nv(x) !== nv(y) || (k === "edad" && o.unidad !== g.unidad)) push("Inventario", `Galpón ${g.cod} · ${t}`, f(o, x), f(g, y), sens); }); });
  return out;
}
export function snapByCodigo(cod) {
  const h = ctx.S.historico.find(x => x.codigo === cod); if (h) return snapOfHist(h);
  const e = ctx.S.evaluaciones.find(x => x.codigo === cod && FINAL.includes(x.estado)); return e ? snapOfEv(e) : null;
}
/* acciones de evaluación en la ficha: retomar la que está abierta, iniciar una nueva o anular (solo coordinación y administración) */
export const menuHas = m => rolDe(ctx.SES).menu.includes(m);
/* accesos directos: no hace falta volver al menú principal */
export const volverEval = uid => {
  const m = /^#\/unidades\/(\d+)/.exec(ctx.ui.EVAL_ORIGEN || "");
  if (m && Number(m[1]) === Number(uid) && menuHas("unidades")) return { href: ctx.ui.EVAL_ORIGEN, txt: "← Volver a la unidad", unidad: true };
  if (ctx.ui.EVAL_ORIGEN === "#/inicio") return { href: "#/inicio", txt: "← Volver al inicio" };
  return { href: "#/evaluaciones", txt: "← Volver a evaluaciones" };
};

export const hasPerm = mod => {
  if (!ctx.SES) return false;
  const i = PERM_MODS.indexOf(mod);
  if (i < 0) return true;
  const rol = ctx.SES.rolPers || ctx.SES.rol;
  if (!PERM[rol] || !PERM[rol][i]) return false;
  // Un rol personalizado nunca puede superar los permisos actuales de su perfil base.
  return ctx.SES.rolPers ? !!(PERM[baseRol(ctx.SES.rolPers)] || [])[i] : true;
};

/* ---------- estados de la evaluación ---------- */
export const EST_LAB = { BORRADOR: "Programada", EN_PROCESO: "En curso", FINALIZADA: "Finalizada · por validar", VALIDADA: "Validada", ANULADA: "Anulada", CERRADA: "Cerrada (histórico)" };
export const ABIERTA = ["BORRADOR", "EN_PROCESO"];
ctx.PARAMS.diasCierre = 7;                 // días desde la visita para finalizar una evaluación en curso
export function avance(ev) { const r = resultado(ev), n = r.inds.length, h = r.inds.filter(x => x.done).length; return { n, h, pct: n ? h / n * 100 : 0 }; }
export const evAbierta = uid => ctx.S.evaluaciones.find(e => e.unidad === Number(uid) && ABIERTA.includes(e.estado));
export const vencida = ev => ABIERTA.includes(ev.estado) && diasHasta(addDays(ev.fecha, ctx.PARAMS.diasCierre)) < 0;
export const ESTADOS_INFO = [
  ["BORRADOR", "Se creó y se asignó al inspector, pero la visita no ha empezado. Se puede reprogramar o anular."],
  ["EN_PROCESO", `El inspector abrió la visita (persona que atiende y consentimiento). Todo se guarda automáticamente. Si queda incompleta se retoma desde la misma evaluación, sin crear otra. Debe finalizarse dentro de los ${ctx.PARAMS.diasCierre} días siguientes a la visita; después aparece como vencida para la coordinación.`],
  ["FINALIZADA", "Están registrados todos los indicadores que aplican, el consentimiento y las evidencias obligatorias. El resultado se calcula y ya no se puede editar. Los documentos por aportar quedan señalados en el informe."],
  ["VALIDADA", "La coordinación revisó y confirmó el resultado. Es la calificación oficial de la unidad."],
  ["ANULADA", "Evaluación que no se concluyó (por ejemplo, visita suspendida). Queda con el motivo, se conserva para la trazabilidad y no cuenta en los resultados."],
  ["CERRADA", "Calificaciones anteriores cargadas a la plataforma. Sirven de base para el historial y la comparación."]
];
export const edadDias = g => Number(g.edad || 0) * (/semana/i.test(g.unidad || "") ? 7 : 1);
export function sugerirGalpones(u, max = maxGalpones(u)) {
  const prev = ctx.S.evaluaciones.filter(e => e.unidad === u.id && e.cap === "I" && FINAL.includes(e.estado)).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const L = u.galpones.map(g => {
    let inc = 0;
    if (prev && prev.galpones.includes(g.cod)) inc = IND1.filter(i => applies(i, prev) && galponLevel(i, prev)).filter(i => { const s = score(i, getR(prev, g.cod, i), prev, g.cod); return s.pts != null && s.pts < 1; }).length;
    return { cod: g.cod, inc, edad: edadDias(g), aves: Number(g.aves || 0), prev };
  }).sort((a, b) => b.inc - a.inc || b.edad - a.edad || b.aves - a.aves);
  return L.map((x, i) => ({ ...x, sug: i < max, orden: i + 1,
    motivo: [x.inc ? `${x.inc} incumplimiento(s) en ${x.prev.codigo}` : "", `aves de ${int(x.edad)} días`, `${int(x.aves)} aves`].filter(Boolean).join(" · ") }));
}
export const galSugeridos = u => sugerirGalpones(u).filter(x => x.sug).map(x => x.cod);

/* ---------- 2 · prioridad parametrizada ---------- */
ctx.PARAMS.prio = { reinc: true };      // la prioridad solo ordena el plan; las recomendaciones no tienen plazo
export const PRIO_ICO = { 1: "🔴", 2: "🟠", 3: "🟡", 4: "⚪" };
export const PRIO_REGLA = {
  1: "Indicador obligatorio con menos de 50 %",
  2: "Indicador obligatorio con cumplimiento parcial (50 % a menos de 100 %) o no obligatorio con menos de 50 %",
  3: "No obligatorio de importancia Medio o superior con cumplimiento parcial",
  4: "Complementario con cumplimiento parcial"
};
export const REINC_TXT = "Un hallazgo reincidente (sin corregir en dos o más calificaciones seguidas) sube un nivel de prioridad, hasta alta; crítica queda solo para obligatorios con menos de 50 %";
export function prioDe(ind, pct, reinc) {
  const imp = impOf(ind), obl = imp >= ctx.PARAMS.oblDesde;
  let p = obl && pct < 50 ? 1 : (obl || pct < 50) ? 2 : imp >= 2 ? 3 : 4;
  if (reinc && ctx.PARAMS.prio.reinc && p > 2) p--;          // la reincidencia sube un nivel, sin llegar a crítica
  return p;
}
export function rachaPend(sn, idx, id) {                 // evaluaciones seguidas sin cumplir, hasta sn[idx]
  let k = idx, n = 0;
  while (k >= 0) { const x = sn[k].items.find(i => i.ind.id === id); if (!x || x.pct >= CUMPLE) break; n++; k--; }
  const o = n ? sn[idx - n + 1] : null;
  return { n, desde: o ? o.fecha : null, cod: o ? o.codigo : null, dias: o ? -diasHasta(o.fecha) : 0 };
}
export function rachas(snap) {
  if (snap._r) return snap._r;
  const sn = unitSnaps(snap.unidad), idx = sn.findIndex(s => s.codigo === snap.codigo), R = {};
  snap.items.forEach(x => { R[x.ind.id] = idx < 0 ? { n: x.pct < CUMPLE ? 1 : 0, desde: snap.fecha, cod: snap.codigo, dias: -diasHasta(snap.fecha) } : rachaPend(sn, idx, x.ind.id); });
  return (snap._r = R);
}
export function tiempoTxt(d) {
  if (d < 60) return `${d} días`;
  const m = Math.round(d / 30.4);
  return m < 24 ? `${m} meses` : `${Math.floor(m / 12)} años${m % 12 ? " y " + (m % 12) + " meses" : ""}`;
}
export const antigTxt = ra => !ra || !ra.desde ? "" : ra.n > 1 ? `Desde ${ra.desde} (${ra.cod}) · ${ra.n} evaluaciones seguidas · ${tiempoTxt(ra.dias)}` : `Identificado el ${ra.desde} · ${tiempoTxt(ra.dias)}`;

/* ---------- 4 · cantidades concretas para cada finca ---------- */
export const PLURAL = { Bebedero: "bebederos", Comedero: "comederos", Nidal: "nidales", Jaula: "jaulas", Punto: "puntos de cama", Hoja: "hojas centinela", Ave: "aves" };
export function cantidades(ind, snap) {
  const out = { sit: [], acc: [], fuente: "" }, k = ind.k, ev = snap.src === "ev" ? evById(snap.id) : null, u = unidadById(snap.unidad);
  const n = v => v === "" || v == null || isNaN(Number(v)) ? null : Number(v), C = Math.ceil, F = Math.floor;
  out.fuente = ev ? `datos registrados en ${snap.codigo}` : "inventario registrado de la unidad";
  let src;
  if (ev) src = keysFor(ind, ev).map(gk => ev.cap === "I" ? { lab: gk === "U" ? "la unidad" : "el galpón " + gk, g: galpon(ev, gk), r: getR(ev, gk, ind), gk }
    : { lab: grupoOf(ev, gk).corto.toLowerCase(), G: grupoOf(ev, gk), r: getR(ev, gk, ind), gk });
  else if (snap.cap === "I") src = (galponLevel(ind, { cap: "I" }) || ind.g === "MBR" ? u.galpones : [u.galpones[0]]).map(g => ({ lab: "el galpón " + g.cod, g, r: null, gk: g.cod }));
  else src = buildGrupos(u).filter(G => G.id === "PON" ? ind.pon : ind.pol).map(G => ({ lab: G.corto.toLowerCase(), G, r: null, gk: G.id }));
  const aves = s => s.g ? n(s.g.aves) : s.G ? s.G.n : null;

  if (k === "ratio") src.forEach(s => {
    const w = ind.what, A = n(s.r ? s.r.aves : s.g.aves), N = n(s.r ? s.r.n : (w === "bebedero" ? s.g.beb : s.g.com)), ref = n(s.r ? s.r.ref : (w === "bebedero" ? s.g.refB : s.g.refC));
    if (!A || !N || !ref) return;
    const need = C(A / ref), need1 = C(A / (ref * 1.3)); if (N >= need) return;
    out.sit.push(`En ${s.lab} hay ${int(N)} ${w}s para ${int(A)} aves: ${fmt(A / N)} aves por ${w} (la referencia es máximo ${ref}).`);
    out.acc.push(`Instalar ${int(need - N)} ${w}s más en ${s.lab} (pasar de ${int(N)} a ${int(need)}) para cumplir ${ref} aves por ${w} y obtener 2 puntos.` +
      (need1 > N ? ` Con ${int(need1)} (${int(need1 - N)} más) se obtiene 1 punto.` : " Hoy ya está en el margen de 1 punto (hasta 30 % por encima de la referencia).") + ` Otra opción: alojar máximo ${int(N * ref)} aves.`);
  });
  if (k === "dens_piso") src.forEach(s => {
    const A = n(s.r ? s.r.aves : s.g.aves), ar = n(s.r ? s.r.area : Number(s.g.area) + (ev ? 0 : Number(s.g.ext || 0))), et = s.r ? s.r.etapa : (s.g.ext ? "Pastoreo" : "Producción"), lim = ETAPA_PISO[et];
    if (!A || !ar || A / ar <= lim) return;
    const maxA = F(ar * lim), arN = C(A / lim);
    out.sit.push(`En ${s.lab}: ${int(A)} aves en ${int(ar)} m² = ${fmt(A / ar, 2)} aves/m² (máximo ${lim} en ${et.toLowerCase()}).`);
    out.acc.push(`Reducir la población de ${s.lab} en ${int(A - maxA)} aves (máximo ${int(maxA)}) o ampliar el área útil en ${int(arN - ar)} m² (a ${int(arN)} m²).`);
  });
  if (k === "dens_engorde") src.forEach(s => {
    const A = n(s.r ? s.r.aves : s.g.aves), ar = n(s.r ? s.r.area : s.g.area), pu = n(s.r ? s.r.pu : 0.042), gdp = n(s.r ? s.r.gdp : 0.06), d = n(s.r ? s.r.dias : edadDias(s.g)), tipo = (s.r ? s.r.tipo : s.g.tipo) || "ABIERTO";
    if (!A || !ar || pu == null || !gdp || d == null) return;
    const pai = pu + gdp * d, lim = TIPOS_GALPON[tipo][1], P = A * pai / ar; if (P <= lim) return;
    const maxA = F(lim * ar / pai), dMax = F((lim * ar / A - pu) / gdp);
    out.sit.push(`En ${s.lab} (${TIPOS_GALPON[tipo][0].toLowerCase()}): ${int(A)} aves de ≈ ${fmt(pai, 2)} kg en ${int(ar)} m² = ${fmt(P, 1)} kg/m² (máximo ${lim}).`);
    out.acc.push(`Alojar máximo ${int(maxA)} aves en ${s.lab} (${int(A - maxA)} menos)${dMax > 0 ? ` o sacar el lote a más tardar al día ${dMax} de edad (≈ ${fmt(pu + gdp * dMax, 2)} kg por ave)` : ""}.`);
  });
  if (k === "dens_jaula" && ev) src.forEach(s => {
    const lim = ETAPA_JAULA[s.r.etapa];
    s.r.jaulas.forEach((j, i) => { const a = n(j.area), b = n(j.aves); if (!a || !b || a / b >= lim) return;
      out.acc.push(`Jaula ${i + 1} de la muestra: ${int(b)} aves en ${int(a)} cm² (${fmt(a / b, 0)} cm² por ave). En una jaula de ese tamaño alojar máximo ${F(a / lim)} aves (≥ ${lim} cm² por ave).`); });
  });
  if (k === "dens_tras_pon") src.forEach(s => {
    const A = n(s.r ? s.r.aves : s.G.n), ar = n(s.r ? s.r.area : s.G.area); if (!A || !ar || A / ar <= 4) return;
    const maxA = F(ar * 4), arN = C(A / 4);
    out.sit.push(`${int(A)} gallinas en ${fmt(ar, 0)} m² de corral y patio = ${fmt(A / ar, 1)} por m² (máximo 4).`);
    out.acc.push(`Ampliar el corral o el patio en ${int(arN - ar)} m² (a ${int(arN)} m²) o dejar máximo ${int(maxA)} gallinas (${int(A - maxA)} menos).`);
  });
  if (k === "dens_tras_pol") src.forEach(s => {
    const A = n(s.r ? s.r.aves : s.G.n), ar = n(s.r ? s.r.area : s.G.area), w = n(s.r ? s.r.peso : 2.2); if (!A || !ar || !w || A * w / ar <= 33) return;
    const maxA = F(33 * ar / w), arN = C(A * w / 33);
    out.sit.push(`${int(A)} pollos de ${fmt(w, 1)} kg en ${fmt(ar, 0)} m² = ${fmt(A * w / ar, 1)} kg/m² (máximo 33).`);
    out.acc.push(`Ampliar el área en ${int(arN - ar)} m² (a ${int(arN)} m²) o dejar máximo ${int(maxA)} pollos (${int(A - maxA)} menos).`);
  });
  if (k === "mort" && ev) src.forEach(s => {
    const p = n(s.r.pct), pon = ev.sis !== "POLLO_ENGORDE", [a, b] = pon ? [12, 14] : [6, 9], tot = ev.inv.reduce((t, g) => t + Number(g.aves || 0), 0);
    if (p == null || p <= a) return;
    out.sit.push(`Mortalidad promedio de ${fmt(p)} % (límite ${a} %).`);
    out.acc.push(`Bajar la mortalidad de ${fmt(p)} % a ${a} % o menos: con ${int(tot)} aves equivale a ${int(Math.round(tot * (p - a) / 100))} aves muertas menos por ciclo.` + (p <= b && !s.r.corr ? " Mientras tanto, documentar las acciones correctivas da 1 punto." : ""));
  });
  if (k === "pct" && ev) src.forEach(s => {
    const p = n(s.r.pct), A = aves(s); if (p == null || p <= 40 || !A) return;
    out.sit.push(`${fmt(p, 0)} % de las aves de ${s.lab} con ${ind.n.toLowerCase()} (≈ ${int(Math.round(A * p / 100))} de ${int(A)}).`);
    out.acc.push(`Bajar a 40 % o menos (máximo ≈ ${int(F(A * 0.4))} aves con ${ind.n.toLowerCase()}): atender primero la causa en ${s.lab}.`);
  });
  if ((k === "grid" || k === "cc") && ev) src.forEach(s => {
    if (s.r.pp) { let c0 = 0, c1 = 0, tot = 0; const labs = [];
      s.r.pp.forEach((q, i) => { if (!ppEstado(q, ev).ok) return; tot += Number(q.n); c0 += Number(q.c0); c1 += Number(q.c1); if (Number(q.c0) + Number(q.c1)) labs.push(i + 1); });
      if (!tot || !(c0 + c1)) return; const A = aves(s), fr = (c0 + c1) / tot;
      out.sit.push(`En ${s.lab}: de ${int(tot)} aves revisadas en los 9 puntos, ${c0} quedaron con 0 puntos y ${c1} con 1 punto.`);
      out.acc.push(`${c0 + c1} de ${int(tot)} aves revisadas no cumplen (${fmt(fr * 100, 0)} %)${A ? `: en ${s.lab} equivale a cerca de ${int(Math.round(A * fr))} aves` : ""}${labs.length && labs.length < 9 ? `, sobre todo en los puntos ${labs.join(", ")}` : ""}. Meta: ${ind.p2}.`);
      return; }
    const pts = unitPts(ind, s.r, s.gk), tot = s.r.units.length, labs = [];
    s.r.units.forEach((v, i) => { const p = k === "cc" ? unitPts(ind, { units: [v] }, s.gk)[0] : v; if (p != null && p < 2) labs.push(ev.cap === "I" ? unitLab(ind, i) : `${ind.u} ${i + 1}`); });
    const c0 = pts.filter(x => x === 0).length, c1 = pts.filter(x => x === 1).length; if (!c0 && !c1) return;
    const pl = PLURAL[ind.u] || "unidades";
    out.sit.push(`En ${s.lab}: ${c0} de ${tot} ${pl} revisados con 0 puntos y ${c1} con 1 punto.`);
    if (ind.u === "Ave") { const A = aves(s), fr = (c0 + c1) / tot;
      out.acc.push(`${c0 + c1} de ${tot} aves revisadas no cumplen (${fmt(fr * 100, 0)} %)${A ? `: en ${s.lab} equivale a cerca de ${int(Math.round(A * fr))} aves` : ""}. Meta: ${ind.p2}.`); }
    else out.acc.push(`Corregir ${c0 + c1} de ${tot} ${pl} revisados en ${s.lab}${labs.length && labs.length <= 9 ? ` (${labs.join(", ")})` : ""}: ${ind.p2.charAt(0).toLowerCase() + ind.p2.slice(1)}.`);
  });
  return out;
}

/* ---------- medidas en el animal por punto (Ilustración 2 · numeral 6.1) ---------- */
export function PP_RANGO(ev) { return ev.sis === "PONEDORA_JAULA" ? [10, 20] : [15, 30]; }        // aves por punto
export const ppVacio = v => v === "" || v == null;
export function ppEstado(q, ev) {
  const [a, b] = PP_RANGO(ev), n = Number(q.n), c = [q.c2, q.c1, q.c0];
  if (c.every(x => !Number(x))) return { ok: false, vacio: true };          // todo en 0: punto sin registrar
  if (!(n >= a && n <= b)) return { ok: false, err: `Revise entre ${a} y ${b} aves por punto` };
  const s = c.reduce((t, x) => t + Number(x), 0);
  if (s !== n) return { ok: false, err: `La suma (${s}) no coincide con las ${n} aves revisadas` };
  return { ok: true };
}
export function scorePP(r, ev) {
  let pts = 0, aves = 0, ok = 0;
  r.pp.forEach(q => { if (ppEstado(q, ev).ok) { ok++; aves += Number(q.n); pts += 2 * Number(q.c2) + Number(q.c1); } });
  return { pts: aves ? pts / aves : null, done: ok === r.pp.length, det: aves ? `${ok} de ${r.pp.length} puntos · ${int(aves)} aves revisadas` : "" };
}
export function resueltos(uid) {          // hallazgos que pasaron a 100 % entre una calificación y la siguiente
  const sn = unitSnaps(uid), out = [];
  for (let i = 1; i < sn.length; i++) sn[i - 1].items.forEach(p => {
    if (p.pct >= CUMPLE) return; const c = sn[i].items.find(x => x.ind.id === p.ind.id); if (!c || c.pct < CUMPLE) return;
    const ra = rachaPend(sn, i - 1, p.ind.id);
    out.push({ ind: p.ind, desde: ra.desde, codDesde: ra.cod, en: sn[i].codigo, fecha: sn[i].fecha, p0: p.pct, dias: Math.round((new Date(sn[i].fecha) - new Date(ra.desde)) / 86400000) });
  });
  return out.reverse();
}
/* al finalizar: se compara con la evaluación anterior (informativo; no hay estados de seguimiento) */
export function conciliar(ev) {
  const snap = snapOfEv(ev), sn = unitSnaps(ev.unidad).filter(s => s.codigo !== ev.codigo && s.fecha <= ev.fecha), prev = sn[sn.length - 1];
  if (!prev) return;
  let ok = 0, sigue = 0;
  hallazgosOf(prev).forEach(c => { const now = snap.items.find(x => x.ind.id === c.x.ind.id); if (now && now.pct >= CUMPLE && now.doc !== "PENDIENTE") ok++; else sigue++; });
  ev.concilia = { ok, sigue, prev: prev.codigo };
}
/* ---------- filtro de indicadores en la captura (por galpón cuando hay 2) ---------- */

export const porGalpon = (ev, ind) => ev.cap === "I" && galponLevel(ind, ev);
export function pctPrevDe(ev, ind) {          // resultado anterior del indicador: el del mismo galpón si ese galpón se evaluó, si no el de la unidad
  const p = prevSnap(ev); if (!p) return null;
  const gk = ctx.ui.EV && ctx.ui.EV.gk;
  if (p.src === "ev" && porGalpon(ev, ind)) { const pe = evById(p.id); if (pe && pe.galpones.includes(gk)) { const sc = score(ind, getR(pe, gk, ind), pe, gk); if (sc.pts != null) return { pct: sc.pts / 2 * 100, gk, p }; } }
  const x = p.items.find(i => i.ind.id === ind.id); return x ? { pct: x.pct, gk: null, p } : null;
}
export function estadoActual(ev, ind) {       // lo registrado en esta visita (en el galpón activo si el indicador es por galpón)
  if (porGalpon(ev, ind)) { const gk = ctx.ui.EV.gk, sc = score(ind, getR(ev, gk, ind), ev, gk); return { done: sc.done, pct: sc.pts == null ? null : sc.pts / 2 * 100 }; }
  const r = indResult(ind, ev); return { done: r.done, pct: r.pct };
}
export const FILTROS = {
  todos: ["Todos", () => true],
  sin: ["Por registrar en esta visita", (ev, ind) => !estadoActual(ev, ind).done],
  prev: ["Con hallazgo en la evaluación anterior", (ev, ind) => { const pp = pctPrevDe(ev, ind); if (!pp || pp.pct >= CUMPLE) return false; const c = estadoActual(ev, ind); return !(c.done && c.pct >= CUMPLE); }],
  hall: ["Con hallazgos en esta visita (< 100 %)", (ev, ind) => { const c = estadoActual(ev, ind); return c.done && c.pct != null && c.pct < CUMPLE; }]
};
export function filtroInd(ev, ind) { if (ctx.ui.FILTRO === "todos" || ctx.ui.FILTRO_KEEP.has(keepKey(ind.id))) return true; if (!applies(ind, ev)) return false; if (ctx.ui.FILTRO === "prev" && !prevSnap(ev)) return true; return FILTROS[ctx.ui.FILTRO][1](ev, ind); }
export const TIPOS_DOC = { CC: ["C.C.", "Cédula de ciudadanía"], CE: ["C.E.", "Cédula de extranjería"], PPT: ["PPT", "Permiso por protección temporal"], PA: ["Pasaporte", "Pasaporte"], NIT: ["NIT", "NIT (persona jurídica)"] };

export const limpiaDoc = d => String(d || "").replace(/[.\s]/g, "").toUpperCase();
export const docValido = (t, d) => (t === "NIT" ? /^\d{9}-?\d?$/ : t === "PA" ? /^[A-Z0-9]{5,12}$/ : /^\d{5,12}$/).test(d);
export const docError = t => t === "NIT" ? "El NIT debe tener 9 dígitos y, si aplica, el dígito de verificación (900000000-1)." : t === "PA" ? "El pasaporte debe tener entre 5 y 12 letras o números." : "El número de documento debe tener solo números (entre 5 y 12), sin puntos.";
export function docTxt(u) {
  if (!u || !u.doc) return "—";
  const [n, dv] = String(u.doc).split("-"), num = /^\d+$/.test(n) ? Number(n).toLocaleString("es-CO") : n;
  return `${(TIPOS_DOC[u.tipoDoc] || [u.tipoDoc || ""])[0]} ${num}${dv ? "-" + dv : ""}`;
}
export function normDocs() {          // datos de ejemplo: "CC 1.010.000.001" → tipo CC y número 1010000001
  ctx.S.users.forEach(u => { if (u.tipoDoc) return; const m = String(u.doc).match(/^(CC|CE|NIT|PA|PPT)\s+(.*)$/); u.tipoDoc = m ? m[1] : "CC"; u.doc = limpiaDoc(m ? m[2] : u.doc); });
}
/* propietario en el formulario de la unidad: se trae de la plataforma y se puede actualizar o registrar uno nuevo */
export function propGuardar(d) {
  if (!d.id) { const u = { id: ctx.S.nextUser++, nombres: d.nombres, apellidos: d.apellidos, tipoDoc: d.tipoDoc, doc: d.doc, correo: d.correo, tel: d.tel, rol: "PROD", estado: "ACTIVO", historial: false };
    ctx.S.users.push(u); audit("Creó", `Usuario propietario ${fullName(u)}`, { m: "Usuarios", det: [{ c: "Usuario propietario", a: "—", d: `${fullName(u)} · ${docTxt(u)}` }] }); return u.id; }
  const u = userById(d.id), antes = [u.tipoDoc, u.doc, u.correo, u.tel].join("|"), ant = { tipoDoc: u.tipoDoc, doc: u.doc, correo: u.correo, tel: u.tel };
  Object.assign(u, { tipoDoc: d.tipoDoc, doc: d.doc, correo: d.correo, tel: d.tel });
  if (antes !== [u.tipoDoc, u.doc, u.correo, u.tel].join("|")) audit("Actualizó datos del propietario", fullName(u), { m: "Usuarios", det: [["Tipo de documento", "tipoDoc"], ["Número de documento", "doc"], ["Correo", "correo"], ["Teléfono", "tel"]].filter(([, k]) => String(ant[k] ?? "") !== String(u[k] ?? "")).map(([c, k]) => ({ c, a: ant[k] || "—", d: u[k] || "—" })) });
  return u.id;
}

/* ---------- filtro de captura: lo editado sigue visible hasta cambiar de filtro, fase o galpón ---------- */

export function galAvance(ev, g, gk) {
  const L = indsOf(ev).filter(i => i.g === g && applies(i, ev) && galponLevel(i, ev)); if (!L.length) return "";
  const d = L.filter(i => score(i, getR(ev, gk, i), ev, gk).done).length; return d === L.length ? `✓ ${d}/${L.length}` : `${d}/${L.length}`;
}

/* ---------- semilla de consultas técnicas (demostración) ---------- */
export function hallazgosOf(snap) {
  const R = rachas(snap);
  return snap.items.filter(x => x.doc === "PENDIENTE" || (x.pct < CUMPLE && (x.pct < 50 || esObl(x.ind) || x.ind.g === "MBG"))).map(x => {
    const tipo = x.doc === "PENDIENTE" ? ["Documento por aportar", "t-warn"] : x.pct < 50 ? ["Incumplimiento", "t-err"] : x.ind.g === "MBG" ? ["Gestión documental", "t-info"] : ["Obligatorio incompleto", "t-warn"];
    const ra = R[x.ind.id] && R[x.ind.id].n ? R[x.ind.id] : { n: 1, desde: snap.fecha, cod: snap.codigo, dias: -diasHasta(snap.fecha) }, prio = prioDe(x.ind, x.pct, ra.n > 1);
    const rec = recText(x.ind, x, snap); if (x.doc === "PENDIENTE") rec.acciones.unshift("Aportar el documento de soporte que quedó pendiente en la visita.");
    return { x, tipo: tipo[0], cls: tipo[1], prio, ra, rec };
  }).sort((a, b) => a.prio - b.prio || impOf(b.x.ind) - impOf(a.x.ind) || a.x.pct - b.x.pct);
}

/* ---------- 4 · motor de recomendaciones (parametrización vigente + datos de la finca) ---------- */
export function recText(ind, x, snap) {
  const R = (RECMAP[ind.id] || [ind.id]).map(t => REC[t]).filter(Boolean), cant = snap ? cantidades(ind, snap) : { sit: [], acc: [] }, acciones = [...cant.acc];
  (x.miss || []).forEach(c => acciones.push("Completar la condición pendiente: " + c + "."));
  R.forEach(r => r.a.slice(0, R.length > 1 ? 1 : cant.acc.length ? 2 : 3).forEach(a => acciones.push(a)));
  if (!acciones.length) acciones.push("Llevar el indicador a: " + ind.p2 + ".");
  const base = x.pct >= 75 ? `Cerca de la meta (${fmt(x.pct, 0)} %): algunas unidades revisadas quedaron en 1 punto · ${ind.p1}`
    : x.pct >= 50 ? `Nivel intermedio (${fmt(x.pct, 0)} %) · ${ind.p1}` : `Nivel deficiente (${fmt(x.pct, 0)} %) · ${ind.p0}`;
  return { meta: metaText(ind), actual: (x.det ? x.det + " → " : "") + base, sit: cant.sit, fuente: cant.fuente, acciones };
}
export function buildPlan(snap) {
  const pesos = pesosDe(snap.cap), cnt = {}, R = rachas(snap);
  snap.items.forEach(x => cnt[x.ind.g] = (cnt[x.ind.g] || 0) + 1);
  const recs = snap.items.filter(x => x.pct < CUMPLE && pesos[x.ind.g]).map(x => {
    const imp = impOf(x.ind), obl = imp >= ctx.PARAMS.oblDesde, ra = R[x.ind.id] || { n: 1 }, reinc = ra.n > 1;
    const impacto = (100 - x.pct) / cnt[x.ind.g] * pesos[x.ind.g] / 100, imp1 = x.pct < 50 ? (50 - x.pct) / cnt[x.ind.g] * pesos[x.ind.g] / 100 : 0;
    const prio = prioDe(x.ind, x.pct, reinc);
    return { ...x, imp, obl, reinc, ra, impacto, imp1, gNuevo: Math.min(100, (snap.g[x.ind.g] || 0) + (100 - x.pct) / cnt[x.ind.g]),
      score: impacto * [1, 1.25, 1.5, 2][imp - 1], prio, rec: recText(x.ind, x, snap) };
  }).sort((a, b) => a.prio - b.prio || b.score - a.score);
  const sig = NEXT_LVL(snap.total); let ruta = null;
  if (sig) {
    const need = sig.min - snap.total; let acc = 0; const pick = [];
    for (const r of recs.slice().sort((a, b) => b.score - a.score)) { pick.push(r); acc += r.impacto; if (acc >= need) break; }
    ruta = { sig, need, pick, acc, alcanza: acc >= need, esperado: Math.min(100, snap.total + acc) };
  }
  const porGrupo = {}; ["MBA", "MBR", "MBG"].forEach(g => { const L = recs.filter(r => r.ind.g === g); porGrupo[g] = { n: L.length, pp: L.reduce((s, r) => s + r.impacto, 0) }; });
  const porPrio = [1, 2, 3, 4].map(p => recs.filter(r => r.prio === p).length);
  return { recs, sig, ruta, porGrupo, porPrio, maxPot: recs.reduce((s, r) => s + r.impacto, 0) };
}
export const PLAN_ORDENES = { prio: "Nivel (de crítica a menor)", impacto: "Mayor impacto en el resultado", grupo: "Grupo de medidas (MBA → MBR → MBG)" };

/* tablero Kanban: la columna depende del estado real de la evaluación de cada unidad (las tarjetas no se arrastran) */
export const SEG_COLS = [
  { k: "EVAL", t: "Por evaluar", d: "Sin evaluación o con más de 12 meses sin evaluar", c: "var(--vino)" },
  { k: "PROG", t: "Programada", d: "Evaluación agendada, aún sin iniciar", c: "var(--petroleo)" },
  { k: "CURSO", t: "En curso", d: "Visita en diligenciamiento", c: "var(--oro)" },
  { k: "VALID", t: "Por validar", d: "Finalizada: espera la validación de la coordinación", c: "var(--navy)" },
  { k: "OK", t: "Calificación vigente", d: "Última evaluación validada o cerrada, de los últimos 12 meses", c: "var(--semilla)" }
];
export function segInfo(u) {
  const ab = evAbierta(u.id), sn = unitSnaps(u.id), last = sn[sn.length - 1] || null;
  let col;
  if (ab) col = ab.estado === "BORRADOR" ? "PROG" : "CURSO";
  else if (last && last.estado === "FINALIZADA") col = "VALID";
  else if (last && diasHasta(last.fecha) >= -365) col = "OK";
  else col = "EVAL";
  return { u, ab, last, col };
}
export const nrm = t => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!.,;:()·]/g, " ").replace(/\s+/g, " ").trim();
export const FAQ = [
  { k: ["mba", "mbr", "mbg", "grupos de medidas", "medidas basadas"], q: "¿Qué son MBA, MBR y MBG?",
    a: "La metodología agrupa los indicadores en tres tipos de medidas:<br>• <b>MBA</b>, basadas en el animal: jadeo, lesiones, plumaje, condición corporal.<br>• <b>MBR</b>, basadas en los recursos: cama, bebederos, comederos, espacio.<br>• <b>MBG</b>, basadas en la gestión: documentos y protocolos.<br>Pesan 35 %, 35 % y 30 % en aves de corral; en traspatio, 60 % y 40 % (sin MBG).", ref: "Numeral 5.1 · Tabla 1" },
  { k: ["calcula", "calculo", "formula", "puntaje", "como se saca"], q: "¿Cómo se calcula el resultado?",
    a: "Cada ave o recurso revisado recibe 2, 1 o 0 puntos.<br>• % del indicador = (promedio de puntos ÷ 2) × 100.<br>• % de cada grupo (MBA, MBR, MBG) = promedio de sus indicadores.<br>• Resultado final = suma de (% del grupo × su peso).", ref: "Numeral 5.3" },
  { k: ["nivel", "excelente", "clasificacion", "niveles"], q: "¿Qué significa cada nivel?",
    a: "Excelente ≥ 90 % · Alto ≥ 75 % y < 90 % · Medio ≥ 50 % y < 75 % · Bajo < 50 %.", ref: "Tabla 2" },
  { k: ["prioridad", "critica", "critico", "urgente", "obligatorio", "obligatorios", "importancia"], q: "¿Qué es un punto crítico, alto o medio?",
    a: () => `Cada indicador que no está en 100 % entra al plan de mejora con una prioridad. Se calcula con la importancia y el carácter definidos en Parametrización:<br>${[1, 2, 3, 4].map(p => `${PRIO_ICO[p]} <b>${PRIO[p][0]}</b>: ${PRIO_REGLA[p].toLowerCase()}.`).join("<br>")}<br>${ctx.PARAMS.prio.reinc ? REINC_TXT + "." : ""}`, ref: "Parametrización · importancia y acciones" },
  { k: ["cuantas aves se revisan", "muestra", "muestreo", "puntos de muestreo"], q: "¿Cuántas aves se revisan?",
    a: "<b>Granja:</b> 9 puntos por galpón (extremos y centro), con 15 a 30 aves por punto. En jaula, 3 a 5 jaulas con 10 a 20 aves.<br><b>Traspatio:</b> todos los corrales, 1 punto por cada 15 aves y 1 a 2 aves por punto. Con menos de 15 aves se revisan todas; sin corral, mínimo 10 aves.", ref: "Numeral 6.1 · Ilustración 2 · Numeral 11" },
  { k: ["galpon", "galpones", "tabla 3", "elige", "selecciona"], q: "¿Cómo se elige el galpón?",
    a: "La Tabla 3 fija cuántos: 1 galpón si la capacidad es menor de 50.000 aves y 2 si es mayor. La plataforma sugiere cuál, en este orden: el que tuvo incumplimientos en la evaluación anterior, el de aves de mayor edad y, si hay empate, el de más aves. El inspector puede cambiarlo indicando el motivo, que queda en el control de cambios.", ref: "Tabla 3 · numeral 6.1" },
  { k: ["estado", "estados", "en curso", "programada", "borrador", "finalizada", "validada", "anulada", "incompleta"], q: "¿Qué significa cada estado de la evaluación?",
    a: () => ESTADOS_INFO.map(([e, d]) => `<b>${EST_LAB[e]}:</b> ${d}`).join("<br>"), ref: "Estados de la evaluación" },
  { k: ["reevaluacion", "reevaluar", "nueva evaluacion", "volver a evaluar", "siguiente visita"], q: "¿Cómo funciona una nueva evaluación?",
    a: "La coordinación programa la visita; si la unidad tiene una evaluación abierta, primero se termina o se anula. En la visita, el inspector ve como referencia los hallazgos de la última evaluación y el resultado previo de cada indicador. Al finalizar, el sistema muestra cuáles hallazgos se corrigieron y cuáles persisten. Cada evaluación queda en el historial de la unidad y el resumen siempre se basa en la más reciente.", ref: "Historial de evaluaciones" },
  { k: ["gab", "certificado", "biosegura", "bioseguro"], q: "¿Qué es el certificado GAB?",
    a: "Es el certificado de Granja Avícola Biosegura que expide el ICA. En la evaluación se verifica en la medida de gestión MBG-03, junto con el plan de control de enfermedades.", ref: "MBG-03 · Tabla 28" },
  { k: ["jadeo", "jadean", "calor", "temperatura", "termico", "ventilacion"], q: "¿Qué hago si las aves jadean mucho?",
    a: "Si más de 40 % de las aves jadea hay estrés por calor (MBA-01). Revise los medios de confort térmico (MBR-10 o 13.5): ventilación, sombra, cortinas y agua fresca. En granja, el protocolo de emergencias térmicas debe estar en el POE (MBG-05).", ref: "MBA-01 · MBR-10 · MBG-05" },
  { k: ["cama", "humeda", "compacta", "apelmazada"], q: "¿Cómo se evalúa la cama?",
    a: "Se toma un puñado de cama en cada punto y se aprieta: 2 puntos si no se compacta o se desmorona, 1 si está ligeramente compactada y 0 si está muy compacta por humedad.", ref: "MBR-02 · 13.2" },
  // ---- salud: orientación general; siempre remite al médico veterinario ----
  { salud: true, k: ["mocos", "moco", "respirator", "estornud", "tos", "ronc", "secrecion", "nasal", "lagrim", "ojos hinchados", "silbido"], q: "Mis aves tienen mocos, ¿qué vacuna les sirve?",
    a: "Las descargas por la nariz o los ojos se revisan en la integridad óculo-nasal (MBA-09 en granja · 14.9 en traspatio). Pueden deberse a:<br>• <b>Enfermedades respiratorias:</b> Newcastle, bronquitis infecciosa, coriza infecciosa, micoplasmosis o influenza aviar.<br>• <b>Ambiente:</b> polvo y amoníaco por cama húmeda o poca ventilación (MBR-01, MBR-02).<br><b>Sobre las vacunas:</b> previenen, pero <b>no curan</b> a un ave que ya está enferma, y vacunar aves enfermas puede empeorar el cuadro. El plan de vacunación lo define el médico veterinario y debe estar en el POE (MBG-04).<br><b>Qué hacer ahora:</b> 1. Separe las aves con signos. 2. Revise ventilación, cama y agua. 3. Consulte al médico veterinario; no use antibióticos sin fórmula (MBG-10). 4. Si hay muchas muertes, caída fuerte de la postura o signos nerviosos, avise <b>de inmediato</b> al ICA: Newcastle e influenza aviar son de control oficial.", ref: "MBA-09 · 14.9 · MBG-04 · MBG-10" },
  { salud: true, k: ["vacuna", "vacunas", "vacunacion", "vacunar"], q: "¿Qué vacunas necesitan mis aves?",
    a: "El plan de vacunación lo define el médico veterinario según la edad, el tipo de producción, la zona y las enfermedades presentes. En granja debe estar en el POE de bienestar animal, firmado por el profesional (MBG-04). Suelen incluirse: <b>Newcastle</b> (de control oficial), bronquitis infecciosa, Gumboro, viruela aviar, Marek (en la incubadora) y, según la zona, coriza o micoplasma. En traspatio, pregunte en la oficina local del ICA o en la Secretaría de Agricultura por las jornadas contra Newcastle. Registre cada aplicación: fecha, vacuna y lote.", ref: "MBG-04 · MBG-03" },
  { salud: true, k: ["diarrea", "heces", "excremento", "coccidi"], q: "Mis aves tienen diarrea, ¿qué hago?",
    a: "La diarrea puede venir del agua o el alimento contaminados, de cambios bruscos de alimento, de coccidiosis o de infecciones. Revise bebederos limpios y agua de buena calidad (MBR-04, MBR-05, MBG-01), cama seca (MBR-02) y que el alimento corresponda a la etapa (MBG-02). Separe las aves afectadas y consulte al médico veterinario antes de dar cualquier medicamento (MBG-10).", ref: "MBR-04 · MBR-05 · MBG-01 · MBG-02 · MBG-10" },
  { salud: true, k: ["picaje", "picotean", "picoteo", "canibal", "se pican", "pierden plumas", "sin plumas"], q: "Las gallinas se picotean y pierden plumas",
    a: "El picaje suele aparecer por exceso de aves en el espacio (MBR-13 · 13.7: máximo 4 gallinas por m² en traspatio), luz muy intensa (MBG-06), falta de proteína o fibra (MBG-02) o aburrimiento. Retire las aves heridas, revise la densidad y la luz y ofrezca material para picotear. Se refleja en lesiones en piel (MBA-07 · 14.7) y plumaje (MBA-08 · 14.8).", ref: "MBR-13 · 13.7 · MBG-06 · MBA-07 · MBA-08" },
  { salud: true, k: ["murieron", "muerte", "mueren", "muertas", "se estan muriendo", "repentina"], q: "Se me murieron varias aves de un día para otro",
    a: "Una mortalidad repentina puede ser señal de una enfermedad de control oficial, como Newcastle o influenza aviar. 1. No venda ni mueva aves. 2. Separe las enfermas. 3. No abra las aves muertas. 4. Avise <b>hoy mismo</b> a la oficina local del ICA y al médico veterinario. En granja, la mortalidad se evalúa en MBA-11.", ref: "MBA-11 · MBG-03" },
  { salud: true, k: ["no ponen", "postura", "dejaron de poner", "pocos huevos"], q: "Mis gallinas dejaron de poner",
    a: "La postura baja por edad o muda, estrés por calor (MBA-01), pocas horas de luz (MBG-06), alimento que no es de postura o falta de calcio (MBG-02), nidales en mal estado (MBR-11 · 13.6) o enfermedades. Si la caída es brusca y hay aves decaídas, consulte al médico veterinario y, si hay muertes, avise al ICA.", ref: "MBG-06 · MBG-02 · MBR-11 · 13.6" },
  { salud: true, k: ["antibiotic", "medicamento", "medicina", "remedio", "desparasit"], q: "¿Puedo darles antibióticos?",
    a: "Solo con fórmula de un médico veterinario o zootecnista con matrícula, con productos con registro ICA, respetando dosis y tiempo de retiro antes de consumir carne o huevos, y registrando cada tratamiento. Es lo que verifica el uso responsable de medicamentos (MBG-10).", ref: "MBG-10 · Tabla 39" }
];
export const PERFIL_IA = {
  ADMIN: { rol: "administrador", puede: "toda la información de la plataforma: evaluaciones, unidades, permisos y parametrización", sug: ["¿Cuántas evaluaciones están abiertas?", "¿Qué unidades tienen incumplimientos?", "¿Qué evaluaciones están vencidas?", "¿Qué puede hacer cada perfil?", "¿Cómo se calcula el resultado?"] },
  COORD: { rol: "coordinador", puede: "las unidades y evaluaciones de su seccional", sug: ["¿Qué evaluaciones debo validar?", "¿Qué unidades tienen incumplimientos?", "¿Qué evaluaciones están vencidas?", "¿Cómo va Granja Demostración?", "¿Qué es un punto crítico, alto o medio?"] },
  INSP: { rol: "inspector", puede: "las unidades productivas y las evaluaciones que tiene asignadas", sug: ["¿Qué evaluaciones tengo abiertas?", "¿Qué debo revisar en Granja Demostración?", "¿Cómo se elige el galpón?", "¿Cuántas aves se revisan?"] },
  PROD: { rol: "productor", puede: "sus unidades productivas, sus evaluaciones, el historial y los planes de mejora", sug: ["¿Cómo voy?", "¿Cuántos comederos necesito?", "¿Qué debo hacer primero?", "¿Cuántas aves puedo tener por galpón?", "Mis aves tienen mocos, ¿qué vacuna les sirve?"] },
  TEN: { rol: "tenedor", puede: "el predio que tiene a cargo, sus evaluaciones y su plan de mejora", sug: ["¿Cómo voy?", "¿Qué debo mejorar primero?", "¿Cuántas gallinas puedo tener?", "Mis aves tienen mocos, ¿qué vacuna les sirve?", "Mis gallinas dejaron de poner"] },
  RT: { rol: "responsable técnico", puede: "las unidades productivas a las que está vinculado", sug: ["¿Cómo va Granja Demostración?", "¿Qué pendientes están vencidos?", "¿Cuántos bebederos necesito?", "¿Qué vacunas necesitan mis aves?"] },
  CONS: { rol: "consultor externo", puede: "información agregada y anonimizada", sug: ["¿Cuál es el promedio de bienestar?", "¿Cuántas evaluaciones hay por nivel?", "¿Cuáles son los incumplimientos más frecuentes?", "¿Cómo se calcula el resultado?"] }
};

/* ---------- datos que puede consultar el perfil ---------- */
export const lastSnapU = uid => { const s = unitSnaps(uid); return s[s.length - 1] || null; };
export const misEvals = () => ctx.S.evaluaciones.filter(e => visibleUnidades().some(u => u.id === e.unidad) && (ctx.SES.rol !== "INSP" || e.insp === ctx.SES.id) && e.estado !== "ANULADA");
export const GENERIC = ["granja", "predio", "finca", "unidad"];
export const nombreEn = (t, u) => t.includes(nrm(u.nombre)) || nrm(u.nombre).split(" ").filter(w => w.length > 4 && !GENERIC.includes(w)).some(w => t.includes(w));
export function pedirUnidad(q) {
  return { a: "Tiene varias unidades productivas. ¿Sobre cuál quiere saber?", opts: visibleUnidades().map(u => ({ lab: u.nombre, q: `${q} · ${u.nombre}` })) };
}
export function iaResumen(u) {
  const sn = unitSnaps(u.id), last = sn[sn.length - 1], prev = sn[sn.length - 2], ab = evAbierta(u.id);
  if (!last) return { a: `${esc(u.nombre)} todavía no tiene calificaciones finalizadas.${ab ? ` Tiene una evaluación ${EST_LAB[ab.estado].toLowerCase()} (${ab.codigo}): el resultado estará disponible cuando el inspector la finalice.` : ""}` };
  const pl0 = buildPlan(last), sig = NEXT_LVL(last.total);
  const d = prev ? last.total - prev.total : null, gs = ["MBA", "MBR", "MBG"].filter(g => pesosDe(last.cap)[g] && last.g[g] != null);
  const a = `<b>${esc(u.nombre)}</b> · última calificación ${last.codigo} (${last.fecha}): <b>${fmt(last.total)} %</b>, nivel <b>${nivel(last.total)}</b>${d != null ? `, ${d >= 0 ? "subió" : "bajó"} ${fmt(Math.abs(d))} puntos frente a la anterior` : ""}.<br>` +
    (false ? (["BAJO", "MEDIO"].includes(nivel(last.total)) ? "Hay aspectos por mejorar en el cuidado de sus aves; abajo le digo por dónde empezar.<br>" : "Sus aves tienen buenas condiciones. ¡Siga así!<br>") : `Por grupo: ${gs.map(g => `${g} ${fmt(last.g[g], 0)} %`).join(" · ")}.<br>`) +
    `Plan de mejora: <b>${pl0.recs.length}</b> recomendaciones${pl0.porPrio[0] ? `, <b>${pl0.porPrio[0]}</b> de prioridad crítica` : ""}.` + (sig ? `<br>Para llegar a <b>${sig.n}</b> le faltan ${fmt(sig.min - last.total)} puntos porcentuales.` : "") +
    (ab ? `<br>Hay una evaluación ${EST_LAB[ab.estado].toLowerCase()}: ${ab.codigo}.` : "");
  return { a, ref: `Resumen de ${last.codigo}`, link: { act: "irUnidad", id: u.id, lab: "Abrir resumen de la unidad" }, sug: ["¿Qué debo hacer primero?", "¿Cuánto me falta para el siguiente nivel?", "¿Qué indicadores debo revisar?"] };
}
export function iaPlan(u) {
  const last = lastSnapU(u.id); if (!last) return { a: `${esc(u.nombre)} todavía no tiene calificaciones: el plan de mejora sale de la primera evaluación finalizada.` };
  const pl = buildPlan(last); if (!pl.recs.length) return { a: `${esc(u.nombre)} tiene todos los indicadores en 100 %. No hay acciones pendientes: mantenga las prácticas y los registros.` };
  ctx.ui.CHAT.ctx.lista = { recs: pl.recs, i: 0, uid: u.id }; return iaMas(true);
}
export function iaInd(ind, u) {
  let a = `<b>${esc(codeOf(ind))} · ${esc(ind.n)}</b><br>${ind.preg ? `<i>${esc(ind.preg)}</i><br>` : ""}Para 2 puntos: ${esc(ind.p2)}<br>1 punto: ${esc(ind.p1)} · 0 puntos: ${esc(ind.p0)}`;
  if (u) {
    const last = lastSnapU(u.id), x = last && last.items.find(i => i.ind.id === ind.id);
    if (x) {
      const r = buildPlan(last).recs.find(y => y.ind.id === ind.id);
      a += `<br><br>En <b>${esc(u.nombre)}</b> (${last.codigo}) quedó en <b>${fmt(x.pct, 0)} %</b>.`;
      if (r) a += (r.rec.sit.length ? `<br>${r.rec.sit.map(esc).join(" ")}` : "") + `<br><b>Qué hacer:</b><br>${r.rec.acciones.slice(0, 4).map(s => "• " + esc(s)).join("<br>")}<br><b>Prioridad ${PRIO[r.prio][0].toLowerCase()}</b> (recomendación informativa, sin plazo).`;
      else a += " Cumple: mantenga la práctica.";
    } else if (last) a += `<br><br>Este indicador no aplica a ${esc(u.nombre)}.`;
  }
  ctx.ui.CHAT.ctx.ind = ind;
  return { a, ref: `Metodología EBA v2.0 · numeral ${ind.num} · ${ind.tab}`, sug: ["¿Cuánto sube mi puntaje?", "¿Por qué es importante?", "¿Qué debo hacer primero?"] };
}
export function iaImpacto(ind, u) {
  const last = u && lastSnapU(u.id); if (!last) return { a: "Necesito una unidad con calificación para calcular el impacto." };
  const r = buildPlan(last).recs.find(y => y.ind.id === ind.id);
  if (!r) return { a: `${esc(ind.n)} ya está en 100 % en ${esc(u.nombre)}: no suma más puntos.` };
  const nv = nivel(Math.min(100, last.total + r.impacto));
  return { a: `Si <b>${esc(ind.n)}</b> llega a 2 puntos en ${esc(u.nombre)}:<br>• El indicador pasa de ${fmt(r.pct, 0)} % a 100 %.<br>• El grupo ${r.ind.g} pasa de ${fmt(last.g[r.ind.g], 1)} % a ${fmt(r.gNuevo, 1)} %.<br>• El resultado total pasa de <b>${fmt(last.total)} %</b> a <b>${fmt(Math.min(100, last.total + r.impacto))} %</b> (+${fmt(r.impacto, 2)} pp)${nv !== nivel(last.total) ? ` y sube a nivel <b>${nv}</b>` : ""}.${r.imp1 ? `<br>Solo con llegar a 1 punto sumaría +${fmt(r.imp1, 2)} pp.` : ""}`,
    ref: "Norma 5.3 · Tabla 1", sug: ["¿Cómo lo hago?", "¿Qué debo hacer primero?", "¿Cuánto me falta para el siguiente nivel?"] };
}
export function iaRuta(u) {
  const last = lastSnapU(u.id); if (!last) return { a: "Todavía no hay calificación para calcularlo." };
  const pl = buildPlan(last); if (!pl.sig) return { a: `${esc(u.nombre)} está en nivel ${nivel(last.total)}, el máximo de la escala. Para llegar a 100 % le faltan +${fmt(pl.maxPot)} pp.` };
  return { a: `${esc(u.nombre)} está en <b>${fmt(last.total)} %</b> (${nivel(last.total)}). Para pasar a <b>${pl.sig.n}</b> (desde ${pl.sig.min} %) le faltan <b>${fmt(pl.ruta.need)} pp</b>.<br>` +
    (pl.ruta.alcanza ? `Lo logra si lleva a 2 puntos estos ${pl.ruta.pick.length} indicadores:<br>${pl.ruta.pick.map(r => `• ${esc(r.ind.n)} (+${fmt(r.impacto, 2)} pp)`).join("<br>")}<br>Con eso llegaría a cerca de ${fmt(pl.ruta.esperado)} %.` : `Con todas las acciones del plan llegaría a ${fmt(pl.ruta.esperado)} %.`),
    ref: "Tabla 2 · plan de mejora", link: { act: "irPlan", id: u.id, lab: "Ver plan completo" }, sug: ["¿Qué debo hacer primero?"] };
}
export function iaRecurso(u, what) {
  const ind = indById(what === "comedero" ? "MBR-09" : "MBR-06");
  if (totalAves(u) < 200) {
    const cod = what === "comedero" ? "13.4" : "13.3", i2 = indById(cod), x = (lastSnapU(u.id) || { items: [] }).items.find(i => i.ind.id === cod);
    ctx.ui.CHAT.ctx.ind = i2;
    return { a: `En traspatio la metodología no fija un número de ${what}s por ave. Se revisan <b>todos</b> los ${what}s del grupo, dentro y fuera del corral, y se califica su estado: ${esc(i2.p2)}.${x ? `<br>En ${esc(u.nombre)} la última calificación fue <b>${fmt(x.pct, 0)} %</b>.` : ""}<br>Como guía práctica, procure que todas las aves puedan ${what === "comedero" ? "comer" : "beber"} al tiempo sin pelear.`, ref: `Numeral ${i2.num} · ${i2.tab}` };
  }
  ctx.ui.CHAT.ctx.ind = ind;
  const L = u.galpones.map(g => { const A = Number(g.aves), N = Number(what === "comedero" ? g.com : g.beb), ref = Number(what === "comedero" ? g.refC : g.refB); if (!A || !ref) return null;
    const need = Math.ceil(A / ref), falt = Math.max(0, need - N);
    return `• <b>${esc(g.cod)}</b>: ${int(A)} aves y ${int(N)} ${what}s (${N ? fmt(A / N) : "—"} aves por ${what}). Con la referencia de ${ref} aves por ${what} necesita <b>${int(need)}</b>${falt ? ` → <b>faltan ${int(falt)}</b>` : " → cumple"}.`; }).filter(Boolean);
  return { a: `Según el inventario registrado de <b>${esc(u.nombre)}</b>:<br>${L.join("<br>")}<br>Cálculo: aves del galpón ÷ referencia de la casa genética o del fabricante, redondeado hacia arriba. Dentro de la referencia son 2 puntos; hasta 30 % por encima, 1 punto.`,
    ref: `${ind.id} · numeral ${ind.num} · ${ind.tab}`, sug: ["¿Cuánto sube mi puntaje?", "¿Qué debo hacer primero?"] };
}
export function iaDensidad(u) {
  if (totalAves(u) < 200) {
    const L = buildGrupos(u).map(G => G.id === "PON" ? `• <b>Gallinas</b>: ${G.n} en ${fmt(G.area, 0)} m² de corral y patio. Máximo ${int(Math.floor(G.area * 4))} (4 por m²)${G.n > G.area * 4 ? ` → le sobran ${int(G.n - Math.floor(G.area * 4))} o necesita ${int(Math.ceil(G.n / 4 - G.area))} m² más` : " → cumple"}.`
      : `• <b>Pollos</b>: ${G.n} de unos 2,2 kg en ${fmt(G.area, 0)} m². Máximo ${int(Math.floor(33 * G.area / 2.2))} pollos (33 kg/m²)${G.n * 2.2 / G.area > 33 ? ` → le sobran ${int(G.n - Math.floor(33 * G.area / 2.2))}` : " → cumple"}.`);
    return { a: `Espacio en <b>${esc(u.nombre)}</b>:<br>${L.join("<br>")}`, ref: "13.7 · Tabla 42 · 13.8 · Tabla 43", sug: ["¿Qué debo mejorar primero?"] };
  }
  const sis = (u.especies.find(e => !e.sis.startsWith("TRAS")) || {}).sis, past = (u.especies.find(e => e.sis === sis) || {}).pastoreo;
  const L = u.galpones.map(g => {
    if (sis === "POLLO_ENGORDE") { const lim = TIPOS_GALPON[g.tipo || "ABIERTO"][1], pai = 0.042 + 0.06 * edadDias(g), maxA = Math.floor(lim * g.area / pai);
      return `• <b>${esc(g.cod)}</b> (${TIPOS_GALPON[g.tipo || "ABIERTO"][0].toLowerCase()}, ${int(g.area)} m², máximo ${lim} kg/m²): con aves de ${int(edadDias(g))} días (≈ ${fmt(pai, 2)} kg) caben hasta <b>${int(maxA)}</b>; hoy tiene ${int(g.aves)}${g.aves > maxA ? ` → ${int(g.aves - maxA)} de más` : " → cumple"}.`; }
    if (sis === "PONEDORA_PISO") { const lim = past ? 4 : 11, ar = Number(g.area) + (past ? Number(g.ext || 0) : 0), maxA = Math.floor(ar * lim);
      return `• <b>${esc(g.cod)}</b>: ${int(ar)} m² ${past ? "(galpón + corrales exteriores)" : ""}, máximo ${lim} aves/m² → hasta <b>${int(maxA)}</b> aves; hoy tiene ${int(g.aves)}${g.aves > maxA ? ` → ${int(g.aves - maxA)} de más` : " → cumple"}.`; }
    return `• <b>${esc(g.cod)}</b>: en jaula se exigen al menos 450 cm² por ave en producción (por ejemplo, 6 aves en una jaula de 2.700 cm²).`;
  });
  return { a: `Capacidad según el espacio de <b>${esc(u.nombre)}</b>:<br>${L.join("<br>")}`, ref: "MBR-12 · MBR-13 · MBR-14 · Tablas 13 a 15", sug: ["¿Cuántos comederos necesito?", "¿Qué debo hacer primero?"] };
}
export function iaVencidos(u) {
  const last = lastSnapU(u.id); if (!last) return { a: "Todavía no hay hallazgos: falta la primera evaluación." };
  const L = hallazgosOf(last);
  return { a: `Las recomendaciones del plan de mejora son informativas: no tienen plazo ni estados, por eso no hay pendientes vencidos. ${L.length ? `Para la próxima evaluación de <b>${esc(u.nombre)}</b> conviene revisar ${L.length} puntos; los primeros:<br>` + L.slice(0, 5).map(c => `• ${PRIO_ICO[c.prio]} ${esc(c.x.ind.n)}${c.ra.n > 1 ? ` · reincidente desde ${c.ra.desde}` : ""}`).join("<br>") : "La última evaluación no dejó puntos de atención."}`,
    ref: "Puntos de atención · última evaluación", link: { act: "irUnidad", id: u.id, lab: "Ver resumen de la unidad" }, sug: ["¿Qué debo hacer primero?"] };
}
/* ---------- consultas agregadas (según el perfil) ---------- */
export function iaAbiertas() {
  const L = misEvals().filter(e => ABIERTA.includes(e.estado));
  if (["PROD", "TEN", "RT"].includes(ctx.SES.rol)) return { a: L.length ? L.map(e => `• ${e.codigo} en ${esc(unidadById(e.unidad).nombre)}: ${EST_LAB[e.estado].toLowerCase()} (visita ${e.fecha}). El resultado aparece cuando el inspector la finalice.`).join("<br>") : "No tiene evaluaciones abiertas." };
  return { a: L.length ? `Hay <b>${L.length}</b> evaluación(es) abierta(s):<br>${L.map(e => { const av = avance(e); return `• ${e.codigo} · ${esc(unidadById(e.unidad).nombre)} · ${EST_LAB[e.estado]} · ${av.h}/${av.n} indicadores${vencida(e) ? " · <b>vencida</b>" : ""}`; }).join("<br>")}` : "No hay evaluaciones abiertas.", ref: "Estados de la evaluación", link: { act: "irEvals", lab: "Ir a evaluaciones" } };
}
export function iaPorValidar() {
  if (!hasPerm("Validar evaluaciones")) return { a: "La validación de los resultados la hace la coordinación. Su perfil no valida evaluaciones." };
  const L = misEvals().filter(e => e.estado === "FINALIZADA");
  return { a: L.length ? `Hay <b>${L.length}</b> evaluación(es) finalizada(s) por validar:<br>${L.map(e => `• ${e.codigo} · ${esc(unidadById(e.unidad).nombre)} · ${fmt(resultado(e).total)} % (${nivel(resultado(e).total)})`).join("<br>")}` : "No hay evaluaciones por validar.", ref: "Estados de la evaluación", link: { act: "irEvals", lab: "Ir a evaluaciones" } };
}
export function iaVencidas() {
  const L = misEvals().filter(vencida);
  return { a: L.length ? `Hay <b>${L.length}</b> evaluación(es) abierta(s) por más de ${ctx.PARAMS.diasCierre} días desde la visita:<br>${L.map(e => `• ${e.codigo} · ${esc(unidadById(e.unidad).nombre)} · visita ${e.fecha} · ${avance(e).h}/${avance(e).n} indicadores`).join("<br>")}<br>Se deben finalizar o, si la visita no se pudo completar, anular con el motivo.` : `No hay evaluaciones vencidas (regla: finalizar dentro de ${ctx.PARAMS.diasCierre} días desde la visita).`, ref: "Estados de la evaluación" };
}
export function iaIncumplimientos() {
  const anon = ctx.SES.rol === "CONS";
  const L = visibleUnidades().map((u, i) => { const s = lastSnapU(u.id); return s ? { u, i, s, n: s.items.filter(x => x.pct < 50).length } : null; }).filter(Boolean).sort((a, b) => b.n - a.n);
  return { a: L.length ? `Incumplimientos (&lt; 50 %) en la última calificación de cada unidad:<br>${L.map(x => `• ${anon ? "Unidad " + (x.i + 1) : esc(x.u.nombre)}: <b>${x.n}</b> · resultado ${fmt(x.s.total)} % (${nivel(x.s.total)})`).join("<br>")}` : "No hay calificaciones para analizar.", ref: anon ? "Información anonimizada" : "Última calificación por unidad" };
}
export function iaFrecuentes() {
  const cnt = {};
  visibleUnidades().forEach(u => { const s = lastSnapU(u.id); if (s) s.items.filter(x => x.pct < 50).forEach(x => cnt[x.ind.n] = (cnt[x.ind.n] || 0) + 1); });
  const L = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return { a: L.length ? `Incumplimientos más frecuentes en las unidades (última calificación):<br>${L.map(([n, c]) => `• ${esc(n)}: ${c} unidad(es)`).join("<br>")}` : "No hay incumplimientos registrados.", ref: "Información agregada" };
}
export function iaPromedio() {
  const res = allResults(); if (!res.length) return { a: "No hay calificaciones registradas." };
  const avgT = res.reduce((s, x) => s + x.total, 0) / res.length, dist = ctx.PARAMS.niveles.map(n => `${n.n.charAt(0) + n.n.slice(1).toLowerCase()}: ${res.filter(x => nivel(x.total) === n.n).length}`).join(" · ");
  return { a: `Promedio de bienestar: <b>${fmt(avgT)} %</b> en ${res.length} calificaciones.<br>Por nivel: ${dist}.`, ref: "Tabla 2" };
}
export function iaPermisos() {
  if (can("ADMIN", "COORD")) return { a: `Permisos aplicados por perfil:<br>${ROLES.map(r => `• <b>${esc(r.nombre)}</b>: ${PERM_MODS.filter((m, i) => PERM[r.id][i]).join(", ").toLowerCase() || "solo consulta"}`).join("<br>")}`, ref: "Roles y permisos" };
  return { a: `Su perfil (${rolDe(ctx.SES).nombre.toLowerCase()}) puede: ${PERM_MODS.filter((m, i) => PERM[ctx.SES.rolPers || ctx.SES.rol][i]).join(", ").toLowerCase()}. Consulta ${PERFIL_IA[ctx.SES.rol].puede}.`, ref: "Roles y permisos" };
}

/* ---------- motor de respuesta ---------- */
export function responder(q) {
  const t = nrm(q), C = ctx.ui.CHAT.ctx, us = visibleUnidades(), anon = ctx.SES.rol === "CONS", has = (...w) => w.some(x => t.includes(x));
  const um = anon ? null : us.find(u => nombreEn(t, u));
  if (!um && !anon) { const otra = ctx.S.unidades.find(u => !us.includes(u) && nombreEn(t, u)); if (otra) return { a: "No tiene acceso a la información de esa unidad productiva. Solo puedo responder sobre las unidades vinculadas a su perfil.", ref: "Permisos del perfil" }; }
  if (um) C.u = um.id;
  if (!C.u && us.length === 1 && !anon) C.u = us[0].id;
  const u = C.u ? unidadById(C.u) : null;
  const necesitaU = fn => anon ? { a: "Como consultor externo solo puede consultar información agregada y anonimizada: promedios, niveles e incumplimientos más frecuentes.", ref: "Permisos del perfil" } : u ? fn(u) : us.length ? pedirUnidad(q) : { a: "Su perfil no tiene unidades productivas vinculadas." };
  // preguntas de seguimiento
  if (/^(y )?(ver )?(mas|otras?|otros|siguientes?|continua|continuar)$/.test(t) && C.lista) return iaMas(false);
  // pedir un técnico, asesor o persona: el asistente muestra los datos de contacto para confirmar o actualizar
  if (/(tecnico|asesor|humano|persona real|una persona|alguien|veterinari|zootecnista|experto|agronomo)/.test(t) && /(hablar|contact|llam|comunicar|necesito|quiero|requiero|pasar|asesor|humano|me ayude|atienda|visita)/.test(t)) return iaContacto();
  if (/(asesor|humano)/.test(t)) return iaContacto();
  if (/(mi solicitud|me van a llamar|me contacta|cuando me llaman|solicitudes de contacto|solicitudes)/.test(t)) return iaSolicitudes();
  // salud primero cuando hay palabras clave fuertes
  let best = null, bs = 0;
  const tw = " " + t;
  FAQ.forEach(f => { const s = f.k.reduce((a, k) => a + (tw.includes(" " + k) ? (k.length > 4 ? 2 : 1) : 0), 0) * (f.salud ? 2 : 1); if (s > bs) { bs = s; best = f; } });
  if (best && best.salud && bs >= 2) return { a: best.a + SALUD_NOTA, ref: best.ref, tecnico: true, sug: ["¿Qué vacunas necesitan mis aves?", "Quiero que me contacte un técnico"] };
  if (C.ind && /(por que|importante|importancia)/.test(t) && !has("vacuna")) { const i = C.ind; return { a: `<b>${esc(i.n)}</b> tiene importancia <b>${IMP_NIV[impOf(i)].n}</b> (${esc(IMP_NIV[impOf(i)].d)}) y es ${esObl(i) ? "<b>de obligatorio cumplimiento</b>" : "no obligatorio"} según la parametrización.`, ref: `Numeral ${i.num} · ${i.tab}`, sug: ["¿Cómo lo hago?", "¿Cuánto sube mi puntaje?"] }; }
  if (C.ind && /(cuanto sube|impacto|cuanto mejora|cuantos puntos)/.test(t)) return necesitaU(x => iaImpacto(C.ind, x));
  if (/(cuanto sube|cuanto mejora)/.test(t)) return necesitaU(iaRuta);
  if (C.ind && /^(y )?(como lo hago|como hago eso|como se hace|explica(me)?( mas)?|mas detalle|que hago)$/.test(t)) return necesitaU(x => iaInd(C.ind, x));
  // datos de la unidad
  if (has("comedero", "bebedero") && has("necesit", "cuantos", "faltan", "suficiente", "cuantas", "numero")) return necesitaU(x => iaRecurso(x, t.includes("comedero") ? "comedero" : "bebedero"));
  if (has("cuantas aves", "cuantas gallinas", "cuantos pollos", "puedo tener", "caben", "densidad", "por metro", "espacio")) return necesitaU(iaDensidad);
  if (has("vencid") && has("pendiente", "compromiso")) return necesitaU(iaVencidos);
  if (has("siguiente nivel", "subir de nivel", "cuanto me falta", "para llegar", "pasar a")) return necesitaU(iaRuta);
  if (has("que debo hacer", "primero", "plan de mejora", "recomendacion", "que me falta", "mejorar", "que debo revisar", "pendientes")) return necesitaU(iaPlan);
  if (has("como voy", "como va", "como esta", "mi resultado", "resumen", "mi granja", "mi predio", "mi finca")) return necesitaU(iaResumen);
  // consultas por perfil
  if (has("validar")) return iaPorValidar();
  if (has("vencid", "incomplet")) return iaVencidas();
  if (has("abiertas", "en curso", "asignadas", "programadas", "tengo abiertas")) return iaAbiertas();
  if (has("frecuente")) return iaFrecuentes();
  if (has("incumplimiento", "hallazgo") && !u) return iaIncumplimientos();
  if (has("promedio", "por nivel", "cuantas evaluaciones")) return iaPromedio();
  if (has("permiso", "perfil", "que puede hacer")) return iaPermisos();
  // indicador por código o nombre (del capítulo de la unidad en contexto)
  const cap = u ? (totalAves(u) >= 200 ? "I" : "II") : null, all = [...IND1, ...IND2].filter(i => !cap || i.cap === cap);
  const byCode = [...IND1, ...IND2].find(i => t.split(" ").includes(nrm(i.id)) || (i.cap === "II" && /traspatio/.test(t) && t.includes(nrm(i.cod))));
  const w = t.split(" ").filter(x => x.length > 3);
  let bi = null, bsc = 0; all.forEach(i => { const nw = nrm(i.n).split(" ").filter(x => x.length > 3); const s = nw.filter(x => w.some(y => y.startsWith(x.slice(0, 6)))).length / Math.max(1, nw.length); if (s > bsc) { bsc = s; bi = i; } });
  const ind = byCode || (bsc >= 0.5 ? bi : null);
  if (ind && (byCode || bs < 3)) return iaInd(ind, anon ? null : u);
  if (best && bs >= 1) { const a = typeof best.a === "function" ? best.a() : best.a; return best.salud ? { a: a + SALUD_NOTA, ref: best.ref, tecnico: true } : { a, ref: best.ref }; }
  return { a: "No tengo una respuesta precisa para esa pregunta. Puede escribirla de otra forma, elegir una de las sugerencias o pasar la consulta a un técnico experto.", tecnico: !anon };
}

/* ---------- widget: botón flotante, panel y página ---------- */
export const esTecnico = () => can("RT", "INSP", "COORD", "ADMIN");
export const misConsultas = () => (ctx.S.consultas || []).filter(c => esTecnico() ? (can("ADMIN", "COORD") || c.asignado === ctx.SES.id) && visibleUnidades().some(u => u.id === c.unidad) : c.de === ctx.SES.id);
/* ---------- contacto con un técnico: el asistente detecta los datos y el usuario los confirma o actualiza ---------- */
export const SOL_EST = { PENDIENTE: ["Por contactar", "t-warn"], CONTACTADO: ["Contactado", "t-info"], RESUELTA: ["Resuelta", "t-ok"] };
export const tecDe = u => userById(u.rt) || userById(3);
export function borrador(uid) {
  const us = visibleUnidades(), yo = userById(ctx.SES.id), u = unidadById(uid || ctx.ui.CHAT.ctx.u || (us[0] || {}).id);
  return { uid: u.id, contacto: { granja: u.nombre, persona: fullName(yo), cel: yo.tel || "", correo: yo.correo || "", medio: "WhatsApp", dias: "Lunes a viernes", desde: "08:00", hasta: "12:00", alt: { nombre: "", cel: "" } } };
}
export function iaContacto() {
  if (ctx.SES.rol === "CONS") return { a: "Como consultor externo no tiene unidades productivas vinculadas para solicitar asistencia técnica." };
  if (esTecnico()) { const n = misConsultas().filter(c => c.estado === "PENDIENTE").length; return { a: `Usted hace parte del equipo técnico. Las solicitudes de contacto de los productores están en <b>Inicio · Solicitudes de contacto</b>${n ? ` (${n} por contactar)` : ""}.`, link: { act: "irInicio", lab: "Ir a Inicio" } }; }
  if (!visibleUnidades().length) return { a: "Su perfil no tiene unidades productivas vinculadas." };
  ctx.ui.CHAT.draft = borrador(); ctx.ui.CHAT.editC = false;
  return { kind: "contacto", a: "Con gusto le pongo en contacto con un técnico. Estos son los datos que tengo de usted en la plataforma; confírmelos o actualícelos para que le contacte:" };
}
export function iaSolicitudes() {
  const L = misConsultas().sort((a, b) => b.id - a.id);
  if (esTecnico()) return { a: L.length ? `Tiene <b>${L.filter(c => c.estado === "PENDIENTE").length}</b> por contactar de ${L.length} solicitudes:<br>${L.slice(0, 5).map(c => `• ${esc(c.contacto.granja)} · ${esc(c.contacto.persona)} · ${esc(c.contacto.cel)} · ${SOL_EST[c.estado][0]}`).join("<br>")}` : "No tiene solicitudes de contacto.", link: { act: "irInicio", lab: "Ver en Inicio" } };
  return { a: L.length ? L.map(c => { const nota = c.mensajes.filter(m => m.de !== ctx.SES.id).slice(-1)[0]; return `• ${c.fecha} · ${esc(c.contacto.granja)}: <b>${SOL_EST[c.estado][0].toLowerCase()}</b> por ${esc(fullName(userById(c.asignado)))}${nota ? `<br>&nbsp;&nbsp;Nota del técnico: ${esc(nota.t)}` : ""}`; }).join("<br>") : "No tiene solicitudes de contacto. Si quiere, escriba «quiero que me contacte un técnico».", sug: ["Quiero que me contacte un técnico"] };
}
export function enviarSolicitud() {
  const d = ctx.ui.CHAT.draft, t = tecDe(unidadById(d.uid)), id = ctx.S.consultas.reduce((a, c) => Math.max(a, c.id), 0) + 1;
  const c = { id, de: ctx.SES.id, unidad: d.uid, tema: "Solicitud de contacto", fecha: stamp(), asignado: t.id, estado: "PENDIENTE", contacto: d.contacto, mensajes: [] };
  ctx.S.consultas.push(c); const m = ctx.ui.CHAT.msgs.find(x => x.kind === "contacto" && !x.sent); if (m) m.sent = c;
  ctx.S.notifs.unshift({ t: `Solicitud de contacto técnico: ${d.contacto.granja} · ${d.contacto.persona}`, d: today().slice(8, 10) + "/" + today().slice(5, 7) });
  audit("Solicitó contacto técnico", `${d.contacto.granja} · ${d.contacto.persona}`, { m: "Asistente IA" }); ctx.ui.CHAT.draft = null;
  ctx.ui.CHAT.msgs.push({ de: "ia", t: `Listo. Su solicitud quedó registrada: <b>${esc(fullName(t))}</b> le contactará por ${esc(d.contacto.medio.toLowerCase())} ${esc(d.contacto.dias.toLowerCase())}, de ${esc(d.contacto.desde)} a ${esc(d.contacto.hasta)}. Puede preguntarme «¿cómo va mi solicitud?» cuando quiera.`, sug: ["¿Cómo va mi solicitud?", "¿Cómo voy?"] });
  ctx.ui.onChat && ctx.ui.onChat();
}
/* ---------- solicitudes en el Inicio (equipo técnico y quien las pidió) ---------- */
/* ---- utilidades de texto y de iconos del asistente ---- */
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const keepKey = (id) => id + "|" + ((ctx.ui.EV || {}).gk || "");

/* icono de evaluación según el estado de la unidad y los permisos del perfil */
export const SALUD_NOTA = '<small class="ref">⚕️ Orientación general basada en la metodología. No reemplaza el diagnóstico del médico veterinario.</small>';

export function iaMas(first) {
  const L = ctx.ui.CHAT.ctx.lista; if (!L) return null;
  const part = L.recs.slice(L.i, L.i + 3); if (!part.length) return { a: "Ya le mostré todas las acciones del plan. Puede abrir el plan completo para verlas juntas.", link: { act: "irPlan", id: L.uid, lab: "Ver plan completo" } };
  ctx.ui.CHAT.ctx.ind = part[0].ind;
  const a = (first ? `Acciones para <b>${esc(unidadById(L.uid).nombre)}</b> en orden de prioridad (${L.recs.length} en total):<br>` : "") +
    part.map((r, j) => `${L.i + j + 1}. ${PRIO_ICO[r.prio]} <b>${esc(r.ind.n)}</b> · ${PRIO[r.prio][0].toLowerCase()}: ${esc(r.rec.acciones[0])} <span class="tiny">(+${fmt(r.impacto, 1)} pp)</span>`).join("<br>");
  L.i += 3;
  return { a, ref: "Plan de mejora · prioridad según la parametrización", link: { act: "irPlan", id: L.uid, lab: "Ver plan completo" },
    sug: [L.i < L.recs.length ? "Ver más" : null, `¿Cómo hago lo de ${part[0].ind.n.toLowerCase()}?`, "¿Cuánto sube mi puntaje?", "¿Por qué es importante?"].filter(Boolean) };
}
export { ROLES };
