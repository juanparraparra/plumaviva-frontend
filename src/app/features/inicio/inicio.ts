import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { StoreService } from "../../core/services/store.service";
import { ctx } from "../../core/engine/contexto";
import * as M from "../../core/engine/motor";
import { Solicitudes } from "../../shared/asistente";
import { BarrasH, Columnas, EstadoTag, Kpi, LineaAcum, NivelTag, Progreso, PrioTag, Tendencia } from "../../shared/ui";

/** Tablero de inicio: cambia según el perfil (ADMIN, COORD, INSP, CONS, PROD, RT). */
@Component({
  selector: "pv-inicio", changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Solicitudes, NgTemplateOutlet, RouterLink, Kpi, Columnas, BarrasH, LineaAcum, NivelTag, EstadoTag, PrioTag, Progreso, Tendencia],
  templateUrl: "./inicio.html"
})
export class Inicio {
  store = inject(StoreService); m: any = M;
  rolId = computed(() => (this.store.v(), this.store.sesion()?.rol as string));
  rol = computed(() => (this.store.v(), M.rolDe(this.store.sesion())));
  nombre = computed(() => { this.store.v(); const s = this.store.sesion(); const u = s ? M.userById(s.id) : null; return u ? String(u.nombres).split(" ")[0] : ""; });
  sub = computed(() => ({ ADMIN: "visión general de la plataforma", COORD: "seguimiento de evaluaciones y unidades", INSP: "mis visitas y evaluaciones", CONS: "información agregada y anonimizada", PROD: "mis unidades productivas", TEN: "el predio a mi cargo", RT: "unidades a mi cargo" } as any)[this.rolId()] || "tablero con los datos que su rol puede consultar");
  puedeCrear = computed(() => (this.store.v(), M.hasPerm("Crear evaluaciones")));
  /** vista de datos común a todos los perfiles */
  d = computed(() => {
    this.store.v();
    const S = ctx.S, R = ctx.SES.rol, res = M.allResults(), vis = M.visibleUnidades();
    const uAct = S.unidades.filter((u: any) => u.estado === "ACTIVA");
    const base = ["PROD", "TEN", "RT"].includes(R) ? vis : R === "CONS" ? S.unidades : uAct;
    const ult = M.ultimasPorUnidad(base);
    const ab = S.evaluaciones.filter((e: any) => M.ABIERTA.includes(e.estado));
    const pend = M.pendientesInicio();
    const prom = ult.length ? M.avg(ult.map((x: any) => x.s.total)) : null;
    const o: any = { res, vis, uAct, ult, ab, pend, prom, venc: ab.filter(M.vencida).length, serie: M.serieMensual(res), niveles: M.distNiveles(ult.map((x: any) => x.s.total)), top: this.top(R === "CONS" ? S.unidades : uAct, R === "CONS") };
    if (R === "ADMIN") {
      const us = S.users, act = us.filter((u: any) => u.estado === "ACTIVO").length, anul = S.evaluaciones.filter((e: any) => e.estado === "ANULADA").length;
      Object.assign(o, { nUs: us.length, act, nUni: S.unidades.length, anul, porRol: M.ROLES.map((r: any) => ({ lab: r.nombre, v: M.nUsuariosRol(r.id) })).filter((x: any) => x.v).sort((a: any, b: any) => b.v - a.v), nRoles: M.ROLES.length, cambios: S.audit.filter((a: any) => a.m !== "Acceso").slice(0, 5) });
    }
    if (R === "COORD") {
      const xval = S.evaluaciones.filter((e: any) => e.estado === "FINALIZADA").length;
      const sinEv = uAct.filter((u: any) => { const x = ult.find((y: any) => y.u.id === u.id); return !x || M.diasHasta(x.s.fecha) < -365; }).length;
      const insp = S.users.filter((u: any) => u.rol === "INSP" && u.estado !== "INACTIVO").map((u: any) => { const v = S.evaluaciones.filter((e: any) => e.insp === u.id && M.ABIERTA.includes(e.estado)).length, fin = S.evaluaciones.filter((e: any) => e.insp === u.id && ["FINALIZADA", "VALIDADA"].includes(e.estado)).length; return { lab: M.fullName(u), v, txt: `${v} abiertas · ${fin} finalizadas` }; });
      Object.assign(o, { xval, sinEv, insp });
    }
    if (R === "INSP") {
      const mias = S.evaluaciones.filter((e: any) => e.insp === ctx.SES.id), abm = mias.filter((e: any) => M.ABIERTA.includes(e.estado)), fin = mias.filter((e: any) => ["FINALIZADA", "VALIDADA"].includes(e.estado));
      const tot = fin.map((e: any) => ({ e, t: M.resultado(e).total }));
      Object.assign(o, { abm, vencm: abm.filter(M.vencida).length, fin, prox: abm.map((e: any) => e.fecha).sort()[0], nivInsp: M.distNiveles(tot.map((x: any) => x.t)), ultFin: tot.slice().sort((a: any, b: any) => b.e.fecha.localeCompare(a.e.fecha)).slice(0, 5) });
    }
    if (R === "CONS") {
      const rr = res, gavg = (k: string) => { const v = rr.map((x: any) => x.g[k]).filter((v: any) => v != null && !(k === "MBG" && v === 0)); return v.length ? M.avg(v) : null; };
      const pm = rr.length ? M.avg(rr.map((x: any) => x.total)) : null;
      Object.assign(o, { promTodas: pm, altos: ult.filter((x: any) => x.s.total >= 75).length, grupos: [["MBA", "Animal (MBA)"], ["MBR", "Recursos (MBR)"], ["MBG", "Gestión (MBG)"]].map(([k, t]) => ({ t, v: gavg(k) })) });
    }
    if (R === "PROD" || R === "TEN" || R === "RT") {
      const pls = ult.map((x: any) => M.buildPlan(x.s));
      const urg = pls.reduce((s: number, q: any) => s + q.porPrio[0] + q.porPrio[1], 0);
      const crit = ult.reduce((s: number, x: any) => s + x.s.items.filter((i: any) => i.pct < 50).length, 0);
      const enCurso = S.evaluaciones.filter((e: any) => vis.some((u: any) => u.id === e.unidad) && M.ABIERTA.includes(e.estado)).length;
      const primeros = M.planesDe(vis).slice(0, R === "RT" ? 5 : 3);
      const cards = vis.map((u: any) => { const sn = M.unitSnaps(u.id), last = sn[sn.length - 1], pl = last ? M.buildPlan(last) : null; return { u, sn, last, pl, ab: M.evAbierta(u.id), prios: pl ? [1, 2, 3, 4].filter(q => pl.porPrio[q - 1]).map(q => ({ q, n: pl.porPrio[q - 1] })) : [] }; });
      Object.assign(o, { urg, crit, enCurso, primeros, cards });
    }
    return o;
  });
  private top(us: any[], anon: boolean) { return M.ultimasPorUnidad(us).sort((a: any, b: any) => a.s.total - b.s.total).slice(0, 5).map((x: any, i: number) => ({ ...x, i, anon })); }
  letra(i: number) { return String.fromCharCode(65 + i); }
  planHref(s: any) { return s.src === "ev" ? ["/evaluacion", s.id, "plan"] : ["/plan", s.codigo]; }
  ruta(q: string) { return q.replace(/^#/, "").split("/").filter(Boolean); }
  esTecnico = () => ["ADMIN", "COORD", "INSP", "RT"].includes(ctx.SES.rol);
}
