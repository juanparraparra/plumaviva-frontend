import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { StoreService } from "../core/services/store.service";
import { ctx } from "../core/engine/contexto";
import * as M from "../core/engine/motor";
import { EstadoTag, NivelTag, Progreso, PrioTag } from "./ui";
import { ImpTag } from "./plan";
import { Modal } from "./modal";

/** Enlace al plan de mejora de una calificación (evaluación viva o histórica). */
export const planLink = (s: any): any[] => s.src === "ev" ? ["/evaluacion", s.id, "plan"] : ["/plan", s.codigo];

/** Puntos de atención: indicadores de la última evaluación que no llegaron a 100 %. */
@Component({
  selector: "pv-atencion", imports: [PrioTag], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="card"><div class="card-head"><h2>Puntos de atención para la próxima evaluación</h2>
    <div class="btn-row">@for (p of prios; track p) { @if (cuenta(p)) { <pv-prio [p]="p" [n]="cuenta(p)" /> } }</div></div>
    <p class="muted small">Indicadores de la última evaluación ({{ snap().codigo }} · {{ snap().fecha }}) que no llegaron a 100 % y conviene revisar primero al iniciar la siguiente. Es información de referencia para el técnico, sin plazos ni estados.</p>
    @if (gab() != null && gab()! < 90) { <div [class]="'alert ' + (gab()! < 0 ? 'err' : 'warn')">Certificado GAB {{ gab()! < 0 ? 'vencido desde' : 'vence el' }} {{ u().gabVence }} @if (gab()! >= 0) { (en {{ gab() }} días) }: es un dato de la unidad que respalda MBG-03 y MBG-10.</div> }
    @if (lista().length) {
      <div class="table-wrap"><table><tr><th>Nivel</th><th>Indicador y primera acción sugerida</th><th>Desde cuándo</th><th class="num">Último %</th></tr>
        @for (c of lista(); track c.x.ind.id) { <tr><td><pv-prio [p]="c.prio" /></td><td><b>{{ m.codeOf(c.x.ind) }}</b> · {{ c.x.ind.n }}<div class="tiny muted">{{ c.rec.acciones[0] }}</div></td>
          <td class="small">{{ m.antigTxt(c.ra) }}</td><td class="num">{{ m.fmt(c.x.pct, 0) }} %</td></tr> }</table></div>
    } @else { <div class="alert ok">Sin puntos de atención: la última evaluación no dejó hallazgos relevantes.</div> }</div>`
})
export class PuntosAtencion {
  u = input.required<any>(); snap = input.required<any>();
  m: any = M; prios = [1, 2, 3, 4];
  lista = computed(() => M.hallazgosOf(this.snap()));
  gab = computed(() => this.u().gab && this.u().gabVence ? M.diasHasta(this.u().gabVence) : null);
  cuenta = (p: number) => this.lista().filter((c: any) => c.prio === p).length;
}

/** Resumen de una unidad: siempre sobre su última calificación. */
@Component({
  selector: "pv-resumen-unidad", imports: [NgTemplateOutlet, RouterLink, NivelTag, EstadoTag, Progreso, PrioTag, PuntosAtencion], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (!snaps().length) {
    <div class="card"><div class="alert info">Esta unidad productiva todavía no tiene evaluaciones finalizadas. La primera será la línea base: su resultado y su plan de mejora quedarán aquí como referencia para la siguiente visita.</div>
      <ng-container *ngTemplateOutlet="abierta" /></div>
  } @else {
    @let last = ultima()!;
    <div class="card"><div class="card-head"><h2>Resumen de la última evaluación</h2><div class="btn-row no-print">
      @if (last.src === 'ev') { <a class="btn sec sm" [routerLink]="['/evaluacion', last.id, 'resultado']">Ver informe</a> }
      @else { <button class="btn sec sm" type="button" (click)="detalle.emit(last.codigo)">Ver detalle por indicador</button> }
      @if (compact()) { <a class="btn sec sm" [routerLink]="link(last)">Ver plan de mejora</a> }</div></div>
      <p class="tiny muted" style="margin:-2px 0 10px">Este resumen se basa en la evaluación más reciente ({{ last.codigo }} · {{ last.fecha }}) y es un insumo informativo para iniciar la siguiente.
        @if (snaps().length > 1) { Las {{ snaps().length - 1 }} anterior(es) se conservan en el historial de la unidad. } @else { Es la primera evaluación: queda como línea base. }</p>
      <div class="res-grid"><div><div class="score"><div class="big">{{ m.fmt(last.total) }} %</div><pv-nivel [pct]="last.total" /></div><div class="tiny muted">{{ last.codigo }} · {{ last.fecha }} · {{ last.sisLab }}</div></div>
        <div>@for (g of grupos(); track g) { <div class="hbar"><span>{{ g }}</span><div class="track"><div class="fill" [style.width.%]="last.g[g] || 0"></div></div><span class="num">{{ m.fmt(last.g[g], 0) }} %</span></div> }</div>
        <ul class="res-kpis"><li><b>{{ plan().recs.length }}</b> recomendaciones en el plan@if (plan().porPrio[0]) { · <b>{{ plan().porPrio[0] }}</b> de prioridad crítica }</li>
          <li>@if (sig()) { Faltan <b>{{ m.fmt(sig().min - last.total) }} pp</b> para nivel {{ sig().n }} } @else { Nivel máximo: mantener }</li>
          <li><b>{{ snaps().length }}</b> evaluación(es) en el historial@if (!compact()) { · <a href="javascript:void 0" (click)="irTab.emit('evaluaciones')">ver historial</a> }</li></ul></div>
      <ng-container *ngTemplateOutlet="abierta" /></div>
    @if (!compact() && plan().recs.length) {
      <div class="card"><div class="card-head"><h2>Lo más importante ahora</h2><button class="btn sec sm" type="button" (click)="irTab.emit('plan')">Ver plan de mejora completo ({{ plan().recs.length }})</button></div>
        <ol class="top-acts">@for (r of plan().recs.slice(0, 3); track r.ind.id) { <li><pv-prio [p]="r.prio" />&ngsp;<b>{{ m.codeOf(r.ind) }} · {{ r.ind.n }}</b>&ngsp;<span class="tiny muted">{{ m.fmt(r.pct, 0) }} % · +{{ m.fmt(r.impacto, 2) }} pp</span><div class="small">{{ r.rec.acciones[0] }}</div></li> }</ol></div>
    }
    @if (tecnico) { <pv-atencion [u]="u()" [snap]="last" /> }
    @if (!compact()) {
      <details class="card"><summary><b>Detalle de la última evaluación</b> · {{ crit().length }} incumplimientos · {{ opor().length }} oportunidades · {{ fort().length }} fortalezas</summary>
        <h4 style="margin-top:10px">Incumplimientos (&lt; 50 %) <span [class]="'tag ' + (crit().length ? 't-err' : 't-ok')">{{ crit().length }}</span></h4><ng-container *ngTemplateOutlet="chips; context: { $implicit: crit() }" />
        <h4 style="margin-top:8px">Oportunidades de mejora (50 % a &lt; 90 %) <span class="tag t-warn">{{ opor().length }}</span></h4><ng-container *ngTemplateOutlet="chips; context: { $implicit: opor() }" />
        <h4 style="margin-top:8px">Fortalezas (≥ 90 %) <span class="tag t-ok">{{ fort().length }}</span></h4><ng-container *ngTemplateOutlet="chips; context: { $implicit: fort() }" /></details>
    }
  }
  <ng-template #abierta>
    @if (ab(); as e) { <div [class]="'alert ' + (m.vencida(e) ? 'err' : 'info')" style="margin-top:10px">Evaluación abierta: <b>{{ e.codigo }}</b>&ngsp;<pv-estado [estado]="e.estado" /> · visita {{ e.fecha }} · <pv-progreso [ev]="e" /></div> }
  </ng-template>
  <ng-template #chips let-l><div>@for (x of l; track x.ind.id) { <span class="chip" [title]="x.ind.n">{{ m.codeOf(x.ind) }} · {{ m.fmt(x.pct, 0) }} %</span> } @empty { <span class="tiny muted">—</span> }</div></ng-template>`
})
export class ResumenUnidad {
  u = input.required<any>(); snapsFijos = input<any[] | null>(null, { alias: "snaps" }); compact = input(false);
  detalle = output<string>(); irTab = output<string>();
  private store = inject(StoreService);
  m: any = M; link = planLink; tecnico = M.esTec();
  snaps = computed(() => (this.store.v(), this.snapsFijos() ?? M.unitSnaps(this.u().id)));
  ultima = computed(() => this.snaps()[this.snaps().length - 1] ?? null);
  ab = computed(() => (this.store.v(), this.snapsFijos() ? null : M.evAbierta(this.u().id)));
  grupos = computed(() => ["MBA", "MBR", "MBG"].filter(g => ctx.PARAMS && this.ultima() && M.pesosDe(this.ultima().cap)[g] && this.ultima().g[g] != null));
  plan = computed(() => (this.store.v(), M.buildPlan(this.ultima())));
  sig = computed(() => M.NEXT_LVL(this.ultima().total));
  crit = computed(() => this.ultima().items.filter((x: any) => x.pct < 50));
  opor = computed(() => this.ultima().items.filter((x: any) => x.pct >= 50 && x.pct < 90));
  fort = computed(() => this.ultima().items.filter((x: any) => x.pct >= 90));
}

/** Comparación de una calificación contra la anterior de la misma unidad. */
@Component({
  selector: "pv-comparativo", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="card"><div class="card-head"><h3>Comparación con la calificación anterior</h3><span class="tag t-info">{{ prev().codigo }} · {{ prev().fecha }}</span></div>
    <p>Total: <b>{{ m.fmt(prev().total) }} %</b> → <b>{{ m.fmt(snap().total) }} %</b> <ng-container *ngTemplateOutlet="delta; context: { $implicit: snap().total - prev().total }" />
      @for (g of grupos(); track g) { <span class="small" style="margin-left:10px">{{ g }}: <ng-container *ngTemplateOutlet="delta; context: { $implicit: snap().g[g] - prev().g[g] }" /></span> }</p>
    <div class="grid g2"><div><h4>Hallazgos resueltos (pasaron a 100 %) <span class="tag t-ok">{{ resueltos().length }}</span></h4><ng-container *ngTemplateOutlet="lista; context: { $implicit: resueltos(), f: 'r' }" />
      <h4 style="margin-top:10px">Mejoraron <span class="tag t-ok">{{ mejoraron().length }}</span></h4><ng-container *ngTemplateOutlet="lista; context: { $implicit: mejoraron(), f: 'm' }" /></div>
      <div><h4>Empeoraron <span class="tag t-err">{{ empeoraron().length }}</span></h4><ng-container *ngTemplateOutlet="lista; context: { $implicit: empeoraron(), f: 'e' }" />
        <h4 style="margin-top:10px">Siguen críticos (&lt; 50 % en ambas) <span class="tag t-err">{{ persisten().length }}</span></h4><ng-container *ngTemplateOutlet="lista; context: { $implicit: persisten(), f: 'p' }" /></div></div></div>
  <ng-template #delta let-d>@if (d > 0.05) { <span class="delta up">▲ +{{ m.fmt(d) }} pp</span> } @else if (d < -0.05) { <span class="delta down">▼ {{ m.fmt(d) }} pp</span> } @else { <span class="delta">■ {{ m.fmt(d) }} pp</span> }</ng-template>
  <ng-template #lista let-l let-f="f">
    @if (l.length) { <ul class="list-clean">@for (x of l.slice(0, 8); track x.ind.id) { <li class="small">{{ m.codeOf(x.ind) }} · {{ x.ind.n }} <b>@switch (f) { @case ('r') { {{ m.fmt(x.p0, 0) }} → {{ m.fmt(x.pct, 0) }} % } @case ('m') { +{{ m.fmt(x.d, 0) }} pp } @case ('e') { {{ m.fmt(x.d, 0) }} pp } @default { {{ m.fmt(x.p0, 0) }} → {{ m.fmt(x.pct, 0) }} % } }</b></li> }</ul>
      @if (l.length > 8) { <div class="tiny muted">y {{ l.length - 8 }} más</div> } } @else { <div class="tiny muted">—</div> }</ng-template>`,
  imports: [NgTemplateOutlet]
})
export class Comparativo {
  snap = input.required<any>(); prev = input.required<any>();
  m: any = M;
  grupos = computed(() => ["MBA", "MBR", "MBG"].filter(g => M.pesosDe(this.snap().cap)[g] && this.snap().g[g] != null && this.prev().g[g] != null));
  private ambos = computed(() => { const pm = Object.fromEntries(this.prev().items.map((x: any) => [x.ind.id, x.pct]));
    return this.snap().items.filter((x: any) => x.ind.id in pm).map((x: any) => ({ ...x, d: x.pct - pm[x.ind.id], p0: pm[x.ind.id] })); });
  mejoraron = computed(() => this.ambos().filter((x: any) => x.d >= 5).sort((a: any, b: any) => b.d - a.d));
  empeoraron = computed(() => this.ambos().filter((x: any) => x.d <= -5).sort((a: any, b: any) => a.d - b.d));
  resueltos = computed(() => this.ambos().filter((x: any) => x.p0 < M.CUMPLE && x.pct >= M.CUMPLE));
  persisten = computed(() => this.ambos().filter((x: any) => x.p0 < 50 && x.pct < 50));
}

/** Cumplimiento agrupado por importancia y obligatoriedad. */
@Component({
  selector: "pv-impacto", imports: [ImpTag], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="card"><div class="card-head"><h3>Cumplimiento por importancia de los indicadores</h3><span class="tag t-info">Obligatorios: importancia ≥ {{ imp[umbral()].n }}</span></div>
    <div class="grid g3"><div [class]="'kpi ' + (sinCumplir().length ? 'alt' : '')"><div class="v">{{ obOk() }}/{{ ob().length }}</div><div class="l">Indicadores obligatorios que cumplen al 100 %</div></div>
      <div class="kpi oro"><div class="v">{{ ob().length ? m.fmt(prom(ob()), 0) : '—' }} %</div><div class="l">Promedio de los obligatorios</div></div>
      <div class="kpi"><div class="v">{{ nobOk() }}/{{ nob().length }}</div><div class="l">No obligatorios que cumplen al 100 %</div></div></div>
    <div class="table-wrap" style="margin-top:12px"><table><tr><th>Importancia</th><th>Carácter</th><th class="num">Indicadores</th><th class="num">Cumplen</th><th class="num">Parcial</th><th class="num">No cumplen</th><th class="num">% promedio</th></tr>
      @for (r of filas(); track r.n) { <tr><td><span [class]="'imp i' + r.n"><span class="dots">{{ '●'.repeat(r.n) }}{{ '○'.repeat(4 - r.n) }}</span> {{ imp[r.n].n }}</span><div class="tiny muted">{{ imp[r.n].d }}</div></td>
        <td>@if (r.n >= umbral()) { <span class="tag t-err">Obligatorio</span> } @else { <span class="tag t-gray">No obligatorio</span> }</td>
        <td class="num">{{ r.L.length }}</td><td class="num">{{ r.ok }}</td><td class="num">{{ r.par }}</td><td class="num">{{ r.no }}</td><td class="num"><b>{{ r.avg == null ? '—' : m.fmt(r.avg, 0) + ' %' }}</b></td></tr> }</table></div>
    <h4 style="margin-top:14px">Obligatorios sin cumplir al 100 % @if (sinCumplir().length) { <span class="tag t-err">{{ sinCumplir().length }}</span> }</h4>
    @if (sinCumplir().length) { <ul class="list-clean">@for (x of sinCumplir(); track x.ind.id) { <li class="small"><pv-imp [ind]="x.ind" />&ngsp;<b>{{ m.codeOf(x.ind) }} · {{ x.ind.n }}</b>&ngsp;<span [class]="'tag ' + m.estCump(x.pct)[1]">{{ m.estCump(x.pct)[0] }} · {{ m.fmt(x.pct, 0) }} %</span></li> }</ul> }
    @else { <div class="alert ok">Todos los indicadores obligatorios cumplen al 100 %.</div> }
    <p class="tiny muted">La clasificación de importancia y el umbral de obligatoriedad son parámetros del sistema (Parametrización → Importancia y acciones). No cambian el puntaje oficial: sirven para priorizar. “Cumple” = 100 %, “Parcial” = 50 % a menos de 100 %, “No cumple” = menos de 50 %.</p></div>`
})
export class ImpactoImportancia {
  snap = input.required<any>();
  private store = inject(StoreService);
  m: any = M; imp = M.IMP_NIV as Record<number, { n: string; d: string }>;
  umbral = computed(() => (this.store.v(), ctx.PARAMS.oblDesde as number));
  ob = computed(() => (this.store.v(), this.snap().items.filter((x: any) => M.esObl(x.ind))));
  nob = computed(() => (this.store.v(), this.snap().items.filter((x: any) => !M.esObl(x.ind))));
  obOk = computed(() => this.ob().filter((x: any) => x.pct >= M.CUMPLE).length);
  nobOk = computed(() => this.nob().filter((x: any) => x.pct >= M.CUMPLE).length);
  sinCumplir = computed(() => this.ob().filter((x: any) => x.pct < M.CUMPLE).sort((a: any, b: any) => M.impOf(b.ind) - M.impOf(a.ind) || a.pct - b.pct));
  filas = computed(() => (this.store.v(), [4, 3, 2, 1].map(n => { const L = this.snap().items.filter((x: any) => M.impOf(x.ind) === n);
    return { n, L, avg: M.avg(L.map((x: any) => x.pct)), ok: L.filter((x: any) => x.pct >= M.CUMPLE).length, par: L.filter((x: any) => x.pct >= 50 && x.pct < M.CUMPLE).length, no: L.filter((x: any) => x.pct < 50).length }; })));
  prom = (l: any[]) => M.avg(l.map(x => x.pct));
}

/** Ventana con el detalle por indicador de una calificación (evaluación o histórico). */
@Component({
  selector: "pv-detalle-snap", imports: [RouterLink, Modal], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (s(); as s) { <pv-modal [titulo]="'Detalle · ' + s.codigo" (cerrar)="cerrar.emit()">
    <p class="small muted">{{ s.fecha }} · {{ s.sisLab }} · Cap. {{ s.cap }} · total <b>{{ m.fmt(s.total) }} %</b> {{ m.nivel(s.total) }}</p>
    <div class="table-wrap"><table><tr><th>Indicador</th><th>Grupo</th><th class="num">%</th><th>Estado</th></tr>
      @for (x of items(); track x.ind.id) { <tr><td>{{ m.codeOf(x.ind) }} · {{ x.ind.n }}</td><td>{{ x.ind.g }}</td><td class="num">{{ m.fmt(x.pct, 0) }}</td><td><span [class]="'tag ' + m.estCump(x.pct)[1]">{{ m.estCump(x.pct)[0] }}</span></td></tr> }</table></div>
    <p class="tiny muted">Evaluación cerrada del histórico: se conserva el resultado por indicador como referencia.</p>
    <ng-container pie><a class="btn sec" [routerLink]="link(s)" (click)="cerrar.emit()">Ver plan de mejora</a><button class="btn" type="button" (click)="cerrar.emit()">Cerrar</button></ng-container></pv-modal> }`
})
export class DetalleSnap {
  codigo = input.required<string>(); cerrar = output<void>();
  m: any = M; link = planLink;
  s = computed(() => M.snapByCodigo(this.codigo()));
  items = computed(() => { const ord: Record<string, number> = { MBA: 0, MBR: 1, MBG: 2 }; return (this.s()?.items ?? []).slice().sort((a: any, b: any) => ord[a.ind.g] - ord[b.ind.g] || a.pct - b.pct); });
}
