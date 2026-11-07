import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from "@angular/core";
import { StoreService } from "../core/services/store.service";
import { ctx } from "../core/engine/contexto";
import * as M from "../core/engine/motor";
import { GCORTO, IMP_NIV, PRIO, PRIO_ICO } from "../core/engine/tablas";
import { PrioTag } from "./ui";

export const nombreGrupo: Record<string, string> = { MBA: "Animal", MBR: "Recursos", MBG: "Gestión" };
const ordenes: Record<string, string> = { prio: "Nivel (de crítica a menor)", impacto: "Mayor impacto en el resultado", grupo: "Grupo de medidas (MBA → MBR → MBG)" };
const ORDEN_G: Record<string, number> = { MBA: 0, MBR: 1, MBG: 2 };

/** Etiqueta de importancia de un indicador (4 niveles) con su carácter obligatorio. */
@Component({
  selector: "pv-imp", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let n = nivel(); <span [class]="'imp i' + n" [title]="d[n].d"><span class="dots">{{ puntos(n) }}</span> {{ d[n].n }}</span>
    @if (conCaracter()) { @if (obligatorio()) { <span class="tag t-err">Obligatorio</span> } @else { <span class="tag t-gray">No obligatorio</span> } }`
})
export class ImpTag {
  ind = input.required<any>(); conCaracter = input(false);
  private store = inject(StoreService);
  d = IMP_NIV;
  nivel = computed(() => (this.store.v(), M.impOf(this.ind())));
  obligatorio = computed(() => (this.store.v(), M.esObl(this.ind())));
  puntos = (n: number) => "●".repeat(n) + "○".repeat(4 - n);
}

/** Plan de mejora de una calificación: ruta al siguiente nivel, filtros por grupo y prioridad, y tarjetas de recomendación. */
@Component({
  selector: "pv-plan", imports: [PrioTag], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let pl = plan(); @let sn = snap();
  @if (!pl.recs.length) { <div class="alert ok">Todos los indicadores están en 100 %. Mantenga las prácticas, los registros y los soportes al día.</div> }
  @else if (!pl.sig) { <div class="alert ok">Nivel <b>{{ nivelActual() }}</b>: ya está en el máximo de la escala. El plan reúne los ajustes que faltan para llegar a 100 % (hasta +{{ m.fmt(pl.maxPot) }} pp) y sostener el resultado.</div> }
  @else { <div class="alert info">Está en nivel <b>{{ nivelActual() }}</b> ({{ m.fmt(sn.total) }} %). Para pasar a <b>{{ pl.sig.n }}</b> (desde {{ pl.sig.min }} %) necesita sumar <b>{{ m.fmt(pl.ruta.need) }} pp</b>.
    @if (pl.ruta.alcanza) { Si lleva a 2 puntos los <b>{{ pl.ruta.pick.length }}</b> indicadores de mayor impacto ({{ codigos() }}) llegaría a cerca de <b>{{ m.fmt(pl.ruta.esperado) }} %</b>. }
    @else { Con todas las acciones del plan llegaría a {{ m.fmt(pl.ruta.esperado) }} %. }
    Cumplir toda la norma sumaría hasta <b>+{{ m.fmt(pl.maxPot) }} pp</b>.</div> }

  @if (pl.recs.length && limit()) {
    <div class="prio-sum">@for (p of prios; track p) { <pv-prio [p]="p" [n]="pl.porPrio[p - 1]" /> }
      <span class="tiny muted">El nivel solo sirve para ordenar el plan. Son recomendaciones informativas: no tienen plazo ni son de cumplimiento obligatorio.</span></div>
  }
  @if (pl.recs.length) {
    <div class="tabs no-print" role="tablist"><button type="button" [class.on]="!g()" (click)="g.set('')">Todos ({{ pl.recs.length }})</button>
      @for (k of grupos(); track k) { <button type="button" [class.on]="g() === k" (click)="g.set(k)">{{ nombres[k] }} · {{ k }} ({{ pl.porGrupo[k].n }})</button> }</div>
    @if (!limit()) {
      <div class="plan-filtros no-print"><div class="filtro-bar"><span class="tiny muted">Prioridad:</span>
        <button type="button" [class.on]="!p()" (click)="p.set(0)">Todas <b>{{ pl.recs.length }}</b></button>
        @for (q of prios; track q) { <button type="button" [class.on]="p() === q" [disabled]="!pl.porPrio[q - 1]" (click)="p.set(q)">{{ ico[q] }} {{ prio[q][0] }} <b>{{ pl.porPrio[q - 1] }}</b></button> }</div>
        <div class="plan-ord"><label class="tiny muted" for="planOrd">Ordenar por</label>
          <select id="planOrd" [value]="ord()" (change)="ord.set($any($event.target).value)">@for (o of ordenesLista; track o[0]) { <option [value]="o[0]">{{ o[1] }}</option> }</select></div></div>
      <p class="tiny muted" style="margin:2px 0 0">Mostrando <b>{{ lista().length }}</b> de {{ pl.recs.length }} recomendaciones@if (hayFiltro()) { · <a href="javascript:void 0" (click)="limpiar()">quitar filtros</a> }.</p>
    }
  }
  @for (r of mostradas(); track r.ind.id) {
    <div [class]="'rec p' + r.prio"><div class="rec-h"><div style="flex:1;min-width:220px"><b>{{ m.codeOf(r.ind) }} · {{ r.ind.n }}</b><div class="tiny muted">{{ gcorto[r.ind.g] }} ({{ r.ind.g }}) · numeral {{ r.ind.num }} · {{ r.ind.tab }}</div></div>
      <div class="rec-tags"><pv-prio [p]="r.prio" /></div>
      <div class="rec-pct"><b>{{ m.fmt(r.pct, 0) }} % → 100 %</b><div class="tiny muted">+{{ m.fmt(r.impacto, 2) }} pp en el total</div></div></div>
      @if (r.rec.sit.length) { <div class="small"><b>En esta finca:</b> {{ r.rec.sit.join(" ") }} <span class="tiny muted">({{ r.rec.fuente }})</span></div> }
      @else { <div class="small"><b>Situación:</b> {{ r.rec.actual }}</div> }
      <div class="small" style="margin-top:4px"><b>Qué hacer:</b></div><ul class="rec-acts">@for (a of r.rec.acciones; track a) { <li>{{ a }}</li> }</ul>
      <div class="rec-foot"><span>📘 <b>Sustento:</b> Metodología EBA v2.0, numeral {{ r.ind.num }} ({{ r.ind.tab }}). Para 2 puntos: {{ r.rec.meta }}.</span>
        <span>📈 <b>Impacto estimado:</b> {{ r.ind.g }} {{ m.fmt(sn.g[r.ind.g], 1) }} % → {{ m.fmt(r.gNuevo, 1) }} % · total {{ m.fmt(sn.total) }} % → {{ m.fmt(min100(sn.total + r.impacto)) }} %
          @if (m.nivel(sn.total) !== m.nivel(min100(sn.total + r.impacto))) { · <b>pasa a nivel {{ m.nivel(min100(sn.total + r.impacto)) }}</b> }
          @if (r.imp1) { · con 1 punto: +{{ m.fmt(r.imp1, 2) }} pp }</span>
        @if (r.reinc) { <span>🔁 <b>Antigüedad:</b> {{ m.antigTxt(r.ra) }}</span> }</div></div>
  } @empty { @if (pl.recs.length) { <p class="muted">Ninguna recomendación coincide con los filtros. <button class="btn sec sm" type="button" (click)="limpiar()">Quitar filtros</button></p> } }
  @if (limit() && lista().length > limit()!) { <p class="tiny muted">Se muestran las {{ limit() }} acciones más prioritarias de {{ lista().length }}.</p> }
  <p class="tiny muted">Recomendaciones calculadas con la parametrización vigente (pesos de la Tabla 1, niveles de la Tabla 2, escala de cada indicador, importancia y prioridad) y con los datos de la finca (inventario y valores registrados en la visita). Los pp son puntos porcentuales del resultado total si el indicador llega a 2 puntos. Son informativas y no sustituyen la norma oficial ni el criterio del responsable técnico.</p>`
})
export class PlanMejora {
  snap = input.required<any>(); limit = input<number>();
  private store = inject(StoreService);
  m: any = M; prio = PRIO; ico = PRIO_ICO; gcorto = GCORTO; nombres = nombreGrupo; prios = [1, 2, 3, 4];
  ordenesLista = Object.entries(ordenes);
  g = signal(""); p = signal(0); ord = signal("prio"); ob = signal(false);
  plan = computed(() => (this.store.v(), M.buildPlan(this.snap()) as any));
  nivelActual = computed(() => M.nivel(this.snap().total));
  grupos = computed(() => ["MBA", "MBR", "MBG"].filter(k => M.pesosDe(this.snap().cap)[k]));
  codigos = computed(() => this.plan().ruta.pick.map((r: any) => M.codeOf(r.ind)).join(", "));
  hayFiltro = computed(() => !!(this.g() || this.p() || this.ob()));
  lista = computed(() => {
    const o = this.ord();
    const cmp: Record<string, (a: any, b: any) => number> = {
      prio: (a, b) => a.prio - b.prio || b.score - a.score, impacto: (a, b) => b.impacto - a.impacto || a.prio - b.prio,
      grupo: (a, b) => ORDEN_G[a.ind.g] - ORDEN_G[b.ind.g] || a.prio - b.prio || b.score - a.score };
    return this.plan().recs.filter((r: any) => (!this.g() || r.ind.g === this.g()) && (!this.p() || r.prio === this.p()) && (!this.ob() || r.obl)).sort(cmp[o]);
  });
  mostradas = computed(() => this.limit() ? this.lista().slice(0, this.limit()) : this.lista());
  min100 = (v: number) => Math.min(100, v);
  limpiar() { this.g.set(""); this.p.set(0); this.ob.set(false); }
}
