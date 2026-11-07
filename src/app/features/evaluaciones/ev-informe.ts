import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { StoreService } from "../../core/services/store.service";
import { EvaluacionesService } from "../../core/services/evaluaciones.service";
import { ctx } from "../../core/engine/contexto";
import * as M from "../../core/engine/motor";
import { IMP_NIV, PRIO, PRIO_ICO } from "../../core/engine/tablas";
import { LOGO } from "../../shared/logo";
import { NivelTag } from "../../shared/ui";
import { Comparativo, ImpactoImportancia } from "../../shared/resumen";

/* ------------------------------------------------------------------ Resultado y diagnóstico */
@Component({
  selector: "pv-ev-resultado", imports: [RouterLink, NivelTag, Comparativo, ImpactoImportancia], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v(); @let e = ev();
  @if (!final()) { <div class="card"><p>El resultado se calcula al finalizar la evaluación.</p></div> }
  @else {
    @let rr = r();
    <div class="card"><div class="score"><div><div class="tiny muted"><b>Resultado total</b></div><div class="big">{{ m.fmt(rr.total) }} %</div></div>
      <div><pv-nivel [pct]="rr.total" /><div class="tiny muted" style="margin-top:6px">Tabla 2 · {{ e.codigo }} · visita {{ e.fecha }}@if (e.finPor) { · finalizada {{ e.finFecha }} por {{ m.fullName(m.userById(e.finPor)) }} ({{ m.rolDe(m.userById(e.finPor)).nombre }}) }</div></div>
      <span style="flex:1"></span>
      @if (e.estado === "VALIDADA") { <span class="tag t-ok">Validada por coordinación {{ e.validada }}</span> }
      @else if (puedeValidar()) { <button type="button" class="btn" (click)="svc.validar(e)">Validar resultado</button> }
      @else { <span class="tag t-ok">Finalizada</span>&nbsp;<span class="tag t-warn">Por validar en coordinación</span> }</div></div>

    @if (e.cap === "II" && e.grupos.length > 1) {
      <div class="card"><h3>Detalle por grupo de aves (informativo)</h3><p class="tiny muted">La clasificación oficial es una sola para el predio (5.3). Este detalle ayuda al productor a saber dónde mejorar.</p>
        <table><tr><th>Grupo</th><th class="num">MBA</th><th class="num">MBR</th><th class="num">Total del grupo</th><th>Nivel</th></tr>
          @for (x of porGrupo(); track x.G.id) { <tr><td>{{ x.G.ico }} {{ m.capi(x.G.lab) }} · {{ x.G.n }} aves</td><td class="num">{{ m.fmt(x.gr.MBA) }} %</td><td class="num">{{ m.fmt(x.gr.MBR) }} %</td><td class="num"><b>{{ m.fmt(x.total) }} %</b></td><td><pv-nivel [pct]="x.total" /></td></tr> }</table></div>
    }
    <div class="grid g2">
      <div class="card"><h3>Resultado por grupo de medidas (norma 5.3)</h3>
        <table><tr><th>Grupo</th><th class="num">% grupo</th><th class="num">Peso</th><th class="num">Aporte</th></tr>
          @for (g of grupos(); track g) { <tr><td>{{ g }}</td><td class="num">{{ m.fmt(rr.grupos[g].pct) }} %</td><td class="num">{{ rr.grupos[g].peso }} %</td><td class="num"><b>{{ m.fmt(rr.grupos[g].aporte, 2) }}</b></td></tr> }
          <tr><td><b>Total</b></td><td></td><td class="num">100 %</td><td class="num"><b>{{ m.fmt(rr.total, 2) }} %</b></td></tr></table>
        <p class="tiny muted">% indicador = (promedio ÷ 2) × 100 · % grupo = promedio de sus indicadores · aporte = % grupo × peso.</p>
        @for (g of grupos(); track g) { <div class="hbar"><span>{{ g }}</span><div class="track"><div class="fill" [style.width.%]="rr.grupos[g].pct || 0"></div></div><span class="num">{{ m.fmt(rr.grupos[g].pct) }} %</span></div> }</div>
      <div class="card"><h3>Incumplimientos (&lt; 50 %)</h3><p class="tiny muted">Orden: MBA → MBR → MBG y de menor a mayor porcentaje. La prioridad de cada uno está en el plan de mejora.</p>
        @if (rr.criticos.length) { <ol>@for (x of rr.criticos; track x.ind.id) { <li style="margin-bottom:8px"><b>{{ m.codeOf(x.ind) }} · {{ x.ind.n }}</b> · {{ m.fmt(x.pct, 0) }} %<div class="tiny muted">Meta (2 puntos): {{ x.ind.p2 }}</div></li> }</ol> }
        @else { <div class="alert ok">Sin hallazgos críticos.</div> }</div>
    </div>
    <div class="card"><h3>Diagnóstico por indicador</h3><div class="grid g3">
      @for (d of diag(); track d.t) { <div><h4>{{ d.t }} <span class="tag" [class]="'tag ' + d.cls">{{ d.items.length }}</span></h4><p class="tiny muted">{{ d.rango }}</p>
        <ul class="list-clean">@for (x of d.items; track x.ind.id) { <li class="small">{{ m.codeOf(x.ind) }} · {{ x.ind.n }} <b>{{ m.fmt(x.pct, 0) }} %</b></li> } @empty { <li class="tiny muted">—</li> }</ul></div> }</div></div>

    @if (e.concilia; as c) { <div class="alert" [class]="'alert ' + (c.sigue ? 'warn' : 'ok')">Frente a {{ c.prev }}: <b>{{ c.ok }}</b> hallazgo(s) corregido(s) · <b>{{ c.sigue }}</b> persisten.</div> }
    <pv-impacto [snap]="snap()" />
    <div class="card"><div class="card-head"><h3>Plan de mejora</h3><a class="btn sm no-print" [routerLink]="['/evaluacion', e.id, 'plan']">Ver plan de mejora{{ plan().recs.length ? " (" + plan().recs.length + ")" : "" }}</a></div>
      <div class="prio-sum">
        @if (plan().recs.length) { @for (p of [1, 2, 3, 4]; track p) { @if (plan().porPrio[p - 1]) { <span class="tag" [class]="'tag ' + prio[p][1]">{{ prioIco[p] }} {{ prio[p][0] }}: {{ plan().porPrio[p - 1] }}</span> } } }
        @else { <span class="tag t-ok">Todos los indicadores en 100 %</span> }
        <span class="tiny muted">Recomendaciones informativas, sin plazo.</span></div></div>
    @if (previa(); as p) { <pv-comparativo [snap]="snap()" [prev]="p" /> }
  }`
})
export class EvResultado {
  store = inject(StoreService); svc = inject(EvaluacionesService); m: any = M; prio = PRIO as Record<number, string[]>; prioIco = PRIO_ICO as Record<number, string>;
  ev = input.required<any>();
  final = computed(() => (this.store.v(), ["FINALIZADA", "VALIDADA"].includes(this.ev().estado)));
  r = computed<any>(() => (this.store.v(), M.resultado(this.ev())));
  grupos = computed(() => ["MBA", "MBR", "MBG"].filter(g => this.r().grupos[g].peso));
  porGrupo = computed<any[]>(() => (this.store.v(), M.resultadoPorGrupo(this.ev())));
  snap = computed<any>(() => (this.store.v(), M.snapOfEv(this.ev())));
  previa = computed<any>(() => (this.store.v(), M.prevSnap(this.ev())));
  plan = computed<any>(() => M.buildPlan(this.snap()));
  puedeValidar = computed(() => (this.store.v(), M.can("COORD", "ADMIN") && M.hasPerm("Validar evaluaciones")));
  diag = computed(() => {
    const por = (t: string) => this.r().inds.filter((x: any) => x.pct != null && M.diag(x.pct)[0] === t);
    return [["Fortaleza", "≥ 90 %", 95], ["Oportunidad de mejora", "50 % a < 90 %", 60], ["Incumplimiento", "< 50 %", 10]].map(([t, rango, ej]) => ({ t: t as string, rango: rango as string, cls: M.diag(ej as number)[1], items: por(t as string) }));
  });
}

/* ------------------------------------------------------------------ Acta de cierre */
@Component({
  selector: "pv-ev-cierre", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v(); @let e = ev();
  @if (!final()) { <div class="card"><p>El acta se genera al finalizar la evaluación.</p></div> }
  @else {
    @let rr = r(); @let un = u();
    <div class="card">
      <div class="btn-row no-print" style="justify-content:flex-end"><button type="button" class="btn" (click)="imprimir()">🖨 Imprimir / guardar PDF</button></div>
      <div style="display:flex;align-items:center;gap:16px;border-bottom:3px solid var(--siembra);padding-bottom:10px;margin-bottom:12px"><img [src]="logo" alt="Logo PlumaViva" style="height:46px">
        <div><h2 style="margin:0">Acta de evaluación de bienestar animal</h2><div class="small muted">{{ lista[e.cap] }} · {{ e.codigo }} · Documento de prototipo sin validez oficial</div></div></div>
      <div class="grid g3 small">@for (c of cabecera(); track c[0]) { <div><b>{{ c[0] }}</b><br>{{ c[1] }}</div> }</div>
      <h3 style="margin-top:16px">Resultado</h3>
      <table><tr><th>Grupo</th><th class="num">%</th><th class="num">Peso</th><th class="num">Aporte</th></tr>
        @for (g of grupos(); track g) { <tr><td>{{ m.GN[g] }}</td><td class="num">{{ m.fmt(rr.grupos[g].pct) }}</td><td class="num">{{ rr.grupos[g].peso }} %</td><td class="num">{{ m.fmt(rr.grupos[g].aporte, 2) }}</td></tr> }
        <tr><td><b>Total · nivel {{ m.nivel(rr.total) }}</b></td><td></td><td></td><td class="num"><b>{{ m.fmt(rr.total, 2) }} %</b></td></tr></table>
      <h3 style="margin-top:16px">Incumplimientos (&lt; 50 %)</h3>
      @if (rr.criticos.length) { <table><tr><th>#</th><th>Indicador</th><th class="num">%</th><th>Meta (2 puntos)</th></tr>
        @for (x of rr.criticos; track x.ind.id; let i = $index) { <tr><td>{{ i + 1 }}</td><td>{{ m.codeOf(x.ind) }} · {{ x.ind.n }}</td><td class="num">{{ m.fmt(x.pct, 0) }}</td><td>{{ x.ind.p2 }}</td></tr> }</table> }
      @else { <p>Sin hallazgos críticos.</p> }
      @if (e.obsGen) { <h3 style="margin-top:16px">Observaciones</h3><p>{{ e.obsGen }}</p> }

      <h3 style="margin-top:16px">Clasificación de indicadores por importancia y obligatoriedad</h3>
      <table><tr><th>Indicador</th><th>Grupo</th><th>Importancia</th><th>Carácter</th><th class="num">%</th><th>Estado</th></tr>
        @for (x of porImportancia(); track x.ind.id) { <tr><td>{{ m.codeOf(x.ind) }} · {{ x.ind.n }}</td><td>{{ x.ind.g }}</td><td>{{ imp[m.impOf(x.ind)].n }}</td><td>{{ m.esObl(x.ind) ? "Obligatorio" : "No obligatorio" }}</td><td class="num">{{ m.fmt(x.pct, 0) }}</td><td>{{ m.estCump(x.pct)[0] }}</td></tr> }</table>
      @if (plan().recs.length) {
        <h3 style="margin-top:16px">Plan de mejora sugerido (resumen · informativo, sin plazos)</h3>
        <table><tr><th>Prioridad</th><th>Indicador</th><th class="num">%</th><th>Primera acción sugerida</th></tr>
          @for (x of plan().recs.slice(0, 10); track x.ind.id) { <tr><td>{{ prio[x.prio][0] }}</td><td>{{ m.codeOf(x.ind) }} · {{ x.ind.n }}</td><td class="num">{{ m.fmt(x.pct, 0) }}</td><td>{{ x.rec.acciones[0] }}</td></tr> }</table>
        @if (plan().recs.length > 10) { <p class="tiny muted">Se muestran 10 de {{ plan().recs.length }} acciones; el plan completo está en el resultado de la evaluación.</p> }
      }
      <div class="grid g2" style="margin-top:40px">
        <div style="border-top:1.5px solid var(--texto);padding-top:6px;text-align:center" class="small">{{ m.fullName(m.userById(e.insp)) }} · Inspector</div>
        <div style="border-top:1.5px solid var(--texto);padding-top:6px;text-align:center" class="small">{{ e.atiende || "—" }} · Quien atiende</div></div>
    </div>
  }`
})
export class EvCierre {
  store = inject(StoreService); m: any = M; logo = LOGO; imp = IMP_NIV; prio = PRIO as Record<number, string[]>;
  ev = input.required<any>();
  get lista() { return ctx.PARAMS.lista; }
  final = computed(() => (this.store.v(), ["FINALIZADA", "VALIDADA"].includes(this.ev().estado)));
  r = computed<any>(() => (this.store.v(), M.resultado(this.ev())));
  u = computed(() => M.unidadById(this.ev().unidad));
  grupos = computed(() => ["MBA", "MBR", "MBG"].filter(g => this.r().grupos[g].peso));
  snap = computed<any>(() => (this.store.v(), M.snapOfEv(this.ev())));
  plan = computed<any>(() => M.buildPlan(this.snap()));
  porImportancia = computed(() => this.snap().items.slice().sort((a: any, b: any) => M.impOf(b.ind) - M.impOf(a.ind) || a.ind.g.localeCompare(b.ind.g) || a.pct - b.pct));
  cabecera = computed<string[][]>(() => {
    const e = this.ev(), u = this.u();
    const eval_ = e.cap === "I" ? e.galpones.join(", ") + (e.galMotivo ? ` (cambio del sugerido: ${e.galMotivo})` : e.galSug ? " (sugerido por criterio)" : "") : e.grupos.map((g: any) => `${g.n} ${g.lab} (${g.corrales.join(", ")})`).join(" · ");
    return [["Unidad productiva", u.nombre], ["Ubicación", `${u.vereda}, ${u.mun} (${u.depto})`], ["Propietario", M.fullName(M.userById(u.propietario))], ["Sistema", M.sisLabel(e)], ["Fecha y hora", e.fecha + " " + e.hora],
      ["Inspector", M.fullName(M.userById(e.insp))], ["Atendió la visita", e.atiende || "—"], [e.cap === "I" ? "Galpones evaluados" : "Grupos evaluados", eval_], ["Estado", e.estado]];
  });
  imprimir() { window.print(); }
}
