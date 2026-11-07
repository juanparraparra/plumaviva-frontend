import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { map } from "rxjs";
import { StoreService } from "../../core/services/store.service";
import { ctx } from "../../core/engine/contexto";
import * as M from "../../core/engine/motor";
import { EST_LAB } from "../../core/engine/tablas";
import { EstadoTag, NivelTag, Progreso } from "../../shared/ui";
import { IconoAccion } from "../../shared/acciones-unidad";
import { AnularEvaluacion } from "../../shared/anular-evaluacion";
import { DetalleSnap, ResumenUnidad, planLink } from "../../shared/resumen";
import { Modal } from "../../shared/modal";

/** Evaluaciones: abiertas, unidades evaluadas con su última calificación e historial. Los filtros viajan en la URL (?u=&est=&nivel=). */
@Component({
  selector: "pv-evaluaciones-lista",
  imports: [RouterLink, EstadoTag, NivelTag, Progreso, IconoAccion, AnularEvaluacion, DetalleSnap, ResumenUnidad, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v();
  <div class="page-head"><div><div class="crumbs">Operación</div><h1>Evaluaciones</h1>
    <p class="muted">Programación, diligenciamiento por fases, resultados y actas. Filtre por unidad productiva para ver su resumen e historial y retomar la siguiente calificación.</p></div>
    @if (puedeCrear()) { <a class="btn" routerLink="/evaluacion-nueva" [queryParams]="uSel() ? { u: uSel() } : null">+ Nueva evaluación</a> }</div>

  <div class="card"><div class="form" style="grid-template-columns:2fr 1fr 1fr auto;align-items:end">
    <div class="field"><label for="ef-u">Unidad productiva</label><select id="ef-u" (change)="filtrar('u', $any($event.target).value)"><option value="">Todas ({{ vis().length }})</option>
      @for (x of vis(); track x.id) { <option [value]="x.id" [selected]="uSel() === x.id">{{ x.nombre }} · {{ x.mun }}</option> }</select></div>
    <div class="field"><label for="ef-e">Estado</label><select id="ef-e" (change)="filtrar('est', $any($event.target).value)"><option value="">Todos</option>
      @for (s of estados; track s) { <option [value]="s" [selected]="est() === s">{{ estLab[s] }}</option> }</select></div>
    <div class="field"><label for="ef-n">Nivel de bienestar</label><select id="ef-n" (change)="filtrar('nivel', $any($event.target).value)"><option value="">Todos</option>
      @for (n of niveles; track n.n) { <option [selected]="nivel() === n.n">{{ n.n }}</option> }</select></div>
    <button type="button" class="btn sec" [disabled]="!filtrado()" (click)="limpiar()">Limpiar</button></div>
    <p class="tiny muted" style="margin:8px 0 0">{{ total() }} evaluaciones@if (uSel()) { de <b>{{ m.unidadById(uSel()).nombre }}</b> }{{ filtrado() ? " con los filtros aplicados" : "" }}.</p></div>

  @if (uSel()) {
    <div class="card" style="background:#FBFCFA"><div class="card-head"><h2 style="margin:0">Resumen de la unidad · {{ m.unidadById(uSel()).nombre }}</h2><a class="btn sec sm" [routerLink]="['/unidades', uSel()]">Abrir ficha completa</a></div></div>
    <pv-resumen-unidad [u]="m.unidadById(uSel())" [compact]="true" (detalle)="detalle.set($event)" />
  }

  <div class="card"><div class="card-head"><h3>Evaluaciones abiertas · programadas y en curso</h3><span class="tag t-info">{{ abiertas().length }}</span></div>
    <div class="table-wrap"><table><tr><th>Código</th><th>Unidad productiva</th><th>Lista de chequeo</th><th>Inspector</th><th>Visita</th><th>Estado</th><th>Avance</th><th></th></tr>
      @for (e of abiertas(); track e.id) {
        <tr><td><b>{{ e.codigo }}</b></td><td>{{ m.unidadById(e.unidad).nombre }}</td><td>{{ m.sisLabel(e) }} · Cap. {{ e.cap }}</td><td>{{ m.fullName(m.userById(e.insp)) }}</td><td>{{ e.fecha }}</td>
          <td><pv-estado [estado]="e.estado" /></td><td style="min-width:140px"><pv-progreso [ev]="e" /></td>
          <td class="num"><div class="btn-row" style="justify-content:flex-end">
            @if (externo()) { <span class="tiny muted">Resultado al finalizar</span> }
            @else { <a class="btn sec sm" [routerLink]="['/evaluacion', e.id, 'apertura']">{{ m.canEdit(e) ? "Continuar" : "Ver" }}</a> }
            @if (gestiona()) { <button type="button" class="btn danger sm" (click)="anular.set(e)">Anular</button> }</div></td></tr>
      } @empty { <tr><td colspan="8" class="muted">No hay evaluaciones abiertas con estos filtros.</td></tr> }</table></div></div>

  <div class="card"><div class="card-head"><h3>Unidades productivas evaluadas</h3><span class="tag t-info">{{ filas().length }}</span></div>
    <div class="table-wrap"><table><tr><th>Unidad productiva</th><th class="num">Evaluaciones</th><th>Última evaluación</th><th class="num">MBA</th><th class="num">MBR</th><th class="num">MBG</th><th class="num">Total</th><th>Nivel</th><th>Frente a la anterior</th><th>Evaluación abierta</th><th class="num">Acciones</th></tr>
      @for (r of filas(); track r.u.id) {
        @let l = r.last;
        <tr><td><b>{{ r.u.nombre }}</b>@if (r.u.estado !== "ACTIVA") { &nbsp;<span class="tag t-err">Inhabilitada</span> }<div class="tiny muted">{{ r.u.mun }} · {{ m.tipoPredio(r.u) }}</div></td>
          <td class="num">{{ r.sn.length }}@if (r.anul.length) { <div class="tiny muted">{{ r.anul.length }} anulada(s)</div> }</td>
          <td>@if (l) { {{ l.codigo }}<div class="tiny muted">{{ l.fecha }}</div><pv-estado [estado]="l.estado" /> } @else { <span class="muted">Sin calificación</span> }</td>
          <td class="num nowrap">{{ pc(r, "MBA") }}</td><td class="num nowrap">{{ pc(r, "MBR") }}</td><td class="num nowrap">{{ pc(r, "MBG") }}</td>
          <td class="num nowrap">@if (l) { <b>{{ m.fmt(l.total) }} %</b> } @else { — }</td><td>@if (l) { <pv-nivel [pct]="l.total" /> } @else { — }</td>
          <td>@if (r.delta == null) { <span class="tiny muted">—</span> } @else { <span class="tag" [class]="'tag ' + (r.delta >= 0 ? 't-ok' : 't-warn')" [title]="'Frente a ' + r.prev.codigo">{{ r.delta >= 0 ? "▲" : "▼" }} {{ m.fmt(abs(r.delta)) }} pp</span> }</td>
          <td>@if (r.ab) { {{ r.ab.codigo }} <pv-estado [estado]="r.ab.estado" /><div class="tiny muted">Inspector: {{ m.fullName(m.userById(r.ab.insp)) }}</div><pv-progreso [ev]="r.ab" /> } @else { <span class="tiny muted">Ninguna</span> }</td>
          <td class="num"><div class="ia-row">
            @if (l) {
              @if (l.src === "ev") { <pv-ia tipo="resultado" tip="Resultado" [ruta]="['/evaluacion', l.id, 'resultado']" /> } @else { <pv-ia tipo="resultado" tip="Resultado" (pulsar)="detalle.set(l.codigo)" /> }
              <pv-ia tipo="plan" tip="Plan de mejora" [ruta]="link(l)" />
            }
            <pv-ia tipo="historial" tip="Historial de evaluaciones" (pulsar)="hist.set(r.u.id)" />
            <pv-ia tipo="ficha" tip="Ver ficha de la unidad" [ruta]="['/unidades', r.u.id]" /></div></td></tr>
      } @empty { <tr><td colspan="11" class="muted">No hay unidades evaluadas con estos filtros.</td></tr> }</table></div>
    <p class="tiny muted" style="margin:8px 0 0">La calificación vigente de cada unidad es la de su <b>última evaluación finalizada o validada</b>, sea mayor o menor que las anteriores; las demás se conservan en el historial y su plan de mejora se puede consultar. Íconos: resultado, plan de mejora, historial y ficha.</p></div>

  <details class="card"><summary><b>¿Cómo funcionan los estados de la evaluación?</b></summary>
    <div class="table-wrap" style="margin-top:10px"><table><tr><th>Estado</th><th>Qué significa</th></tr>
      @for (x of info; track x[0]) { <tr><td><pv-estado [estado]="x[0]" /></td><td class="small">{{ x[1] }}</td></tr> }
      <tr><td><span class="tag t-info">Resumen de la unidad</span></td><td class="small">Se basa siempre en la última evaluación finalizada o validada. Las anteriores se conservan en el historial y su plan de mejora se puede consultar. Las recomendaciones del plan son informativas: no tienen plazo, estados ni comentarios de seguimiento.</td></tr></table></div>
    <p class="tiny muted">Regla: cada unidad productiva tiene una sola evaluación abierta (programada o en curso) a la vez. La calificación vigente de la unidad es la última finalizada o validada.</p></details>

  @if (anular(); as a) { <pv-anular-evaluacion [ev]="a" (cerrar)="anular.set(null)" (anulada)="anular.set(null)" /> }
  @if (detalle()) { <pv-detalle-snap [codigo]="detalle()" (cerrar)="detalle.set('')" /> }
  @if (hist(); as h) {
    <pv-modal [titulo]="'Historial · ' + m.unidadById(h).nombre" (cerrar)="hist.set(0)">
      <div class="table-wrap"><table><tr><th>Código</th><th>Fecha</th><th>Estado</th><th class="num">MBG</th><th class="num">MBA</th><th class="num">MBR</th><th class="num">Total</th><th></th></tr>
        @for (x of historial(); track x.codigo) {
          @if (x.anulada) { <tr><td><b>{{ x.codigo }}</b></td><td>{{ x.fecha }}</td><td><pv-estado estado="ANULADA" /></td><td colspan="4" class="small muted">{{ x.anulada.motivo }}</td><td></td></tr> }
          @else { <tr><td><b>{{ x.codigo }}</b></td><td>{{ x.fecha }}</td><td><pv-estado [estado]="x.estado" /></td><td class="num">{{ x.cap === "II" ? "N/A" : m.fmt(x.g.MBG) + " %" }}</td><td class="num">{{ m.fmt(x.g.MBA) }} %</td><td class="num">{{ m.fmt(x.g.MBR) }} %</td>
            <td class="num"><b>{{ m.fmt(x.total) }} %</b> <pv-nivel [pct]="x.total" /></td>
            <td class="num"><div class="ia-row">
              @if (x.src === "ev") { <pv-ia tipo="resultado" tip="Resultado" [ruta]="['/evaluacion', x.id, 'resultado']" /> } @else { <pv-ia tipo="resultado" tip="Resultado" (pulsar)="hist.set(0); detalle.set(x.codigo)" /> }
              <pv-ia tipo="plan" tip="Plan de mejora" [ruta]="link(x)" /></div></td></tr> }
        } @empty { <tr><td colspan="8" class="muted">Sin evaluaciones.</td></tr> }</table></div>
      <ng-container pie><button class="btn sec" type="button" (click)="hist.set(0)">Cerrar</button></ng-container>
    </pv-modal>
  }`
})
export class EvaluacionesLista {
  store = inject(StoreService); private router = inject(Router); private ruta = inject(ActivatedRoute);
  m: any = M; estLab = EST_LAB as Record<string, string>; info = M.ESTADOS_INFO; link = planLink; abs = Math.abs;
  estados = ["BORRADOR", "EN_PROCESO", "FINALIZADA", "VALIDADA", "ANULADA", "CERRADA"];
  get niveles() { return ctx.PARAMS.niveles as { n: string }[]; }

  private q = toSignal(this.ruta.queryParamMap.pipe(map(p => ({ u: p.get("u") || "", est: p.get("est") || "", nivel: p.get("nivel") || "" }))), { initialValue: { u: "", est: "", nivel: "" } });
  est = computed(() => this.q().est); nivel = computed(() => this.q().nivel);
  anular = signal<any>(null); detalle = signal(""); hist = signal(0);

  vis = computed(() => (this.store.v(), M.visibleUnidades() as any[]));
  uSel = computed(() => { const n = Number(this.q().u); return n && this.vis().some(x => x.id === n) ? n : 0; });
  filtrado = computed(() => !!(this.uSel() || this.est() || this.nivel()));
  externo = computed(() => ["PROD", "TEN", "RT"].includes(ctx.SES.rol));
  gestiona = computed(() => M.can("COORD", "ADMIN"));
  puedeCrear = computed(() => (this.store.v(), M.hasPerm("Crear evaluaciones")));

  private okU = (id: number) => this.vis().some(x => x.id === id) && (!this.uSel() || id === this.uSel());
  private okN = (t: number | null) => !this.nivel() || (t != null && M.nivel(t) === this.nivel());
  private porFecha = (a: any, b: any) => b.fecha.localeCompare(a.fecha);
  evs = computed(() => { this.store.v(); return ctx.S.evaluaciones.filter((e: any) => this.okU(e.unidad) && (ctx.SES.rol !== "INSP" || e.insp === ctx.SES.id) && (!this.est() || e.estado === this.est()) && (!this.nivel() || (M.FINAL.includes(e.estado) && this.okN(M.resultado(e).total as number)))).sort(this.porFecha); });
  abiertas = computed(() => this.evs().filter((e: any) => M.ABIERTA.includes(e.estado)));
  hist_ = computed(() => (this.store.v(), this.est() && this.est() !== "CERRADA" ? [] : ctx.S.historico.filter((h: any) => this.okU(h.unidad) && this.okN(h.total))));
  total = computed(() => this.evs().length + this.hist_().length);

  filas = computed(() => {
    this.store.v(); const est = this.est(), nivel = this.nivel();
    return this.vis().filter(u => !this.uSel() || u.id === this.uSel()).map(u => {
      const sn = M.unitSnaps(u.id), anul = ctx.S.evaluaciones.filter((e: any) => e.unidad === u.id && e.estado === "ANULADA"), last = sn[sn.length - 1], prev = sn[sn.length - 2];
      return { u, sn, anul, last, prev, delta: last && prev ? last.total - prev.total : null, ab: M.evAbierta(u.id) };
    }).filter(r => (r.sn.length || r.anul.length)
      && (!est || (est === "ANULADA" ? r.anul.length : M.ABIERTA.includes(est) ? false : r.sn.some((x: any) => x.estado === est)))
      && (!nivel || (r.last && M.nivel(r.last.total) === nivel)));
  });
  pc(r: any, g: string) { return r.last ? (r.last.cap === "II" && g === "MBG" ? "N/A" : r.last.g[g] == null ? "—" : M.fmt(r.last.g[g]) + " %") : "—"; }
  historial = computed<any[]>(() => {
    this.store.v(); const id = this.hist(); if (!id) return [];
    return [...M.unitSnaps(id).slice().reverse(), ...ctx.S.evaluaciones.filter((e: any) => e.unidad === id && e.estado === "ANULADA")];
  });

  filtrar(k: "u" | "est" | "nivel", v: string) { this.router.navigate([], { relativeTo: this.ruta, queryParams: { [k]: v || null }, queryParamsHandling: "merge" }); }
  limpiar() { this.router.navigate([], { relativeTo: this.ruta, queryParams: { u: null, est: null, nivel: null }, queryParamsHandling: "merge" }); }
}
