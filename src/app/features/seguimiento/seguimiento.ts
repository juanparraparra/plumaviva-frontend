import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { map } from "rxjs";
import { StoreService } from "../../core/services/store.service";
import * as M from "../../core/engine/motor";
import { NivelTag, PrioTag, Progreso } from "../../shared/ui";
import { AccionesUnidad, IconoAccion } from "../../shared/acciones-unidad";
import { DetalleSnap } from "../../shared/resumen";

/** Tablero Kanban: la columna de cada unidad depende del estado real de su evaluación (las tarjetas no se arrastran). */
@Component({
  selector: "pv-seguimiento", imports: [RouterLink, NivelTag, PrioTag, Progreso, AccionesUnidad, IconoAccion, DetalleSnap], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v();
  <div class="page-head"><div><div class="crumbs">Operación</div><h1>Seguimiento</h1><p class="muted">Tablero Kanban de las unidades productivas según el estado de su evaluación.</p></div></div>
  <div class="card"><div class="form" style="grid-template-columns:2fr 1fr;align-items:end">
    <div class="field"><label for="sg-q">Buscar</label><input id="sg-q" [value]="q()" placeholder="Nombre, municipio o propietario" (input)="q.set($any($event.target).value)"></div>
    <div class="field"><label for="sg-t">Tipo de predio</label><select id="sg-t" (change)="tipo.set($any($event.target).value)"><option value="">Todos</option><option [selected]="tipo() === 'Granja'">Granja</option><option [selected]="tipo() === 'Traspatio'">Traspatio</option></select></div></div>
    <p class="tiny muted" style="margin:8px 0 0">{{ vis().length }} unidades activas. Las tarjetas cambian de columna solas cuando avanza la evaluación (no se arrastran). Regla: una sola evaluación abierta por unidad.
      @if (hl()) { · Resaltada: <b>{{ m.unidadById(hl()).nombre }}</b> <a href="javascript:void 0" (click)="quitar(); $event.preventDefault()">quitar</a> }</p></div>
  <div class="kanban">
    @for (c of cols; track c.k) {
      @let L = col(c.k);
      <div class="kcol"><div class="kcol-h"><span>{{ c.t }}</span><span class="n">{{ L.length }}</span></div><div class="kcol-d">{{ c.d }}</div>
        @for (x of L; track x.u.id) {
          @let u = x.u; @let l = x.last;
          <div class="kcard" [class.hl]="hl() === u.id" [id]="'kc' + u.id" [style.--c]="c.c">
            <b class="kt"><a [routerLink]="['/unidades', u.id]">{{ u.nombre }}</a></b>
            <div class="tiny muted">{{ u.mun }} · {{ m.tipoPredio(u) }} · {{ m.fullName(m.userById(u.propietario)) }}</div>
            <div class="kr">
              @if (l) { Última: <b>{{ m.fmt(l.total) }} %</b> <pv-nivel [pct]="l.total" />&ngsp;<span class="tiny muted nowrap">{{ l.codigo }} · {{ l.fecha }}</span>
                @if (c.k === "EVAL" && dias(l) > 365) { <div class="tiny" style="color:var(--vino)"><b>Hace {{ m.int(dias(l)) }} días sin evaluar</b></div> } }
              @else { <span class="muted">Sin evaluaciones finalizadas</span> }</div>
            @if (x.ab; as ab) { <div class="kr"><span class="nowrap">{{ ab.codigo }}</span> · visita {{ ab.fecha }}<div class="tiny muted">Inspector: {{ m.fullName(m.userById(ab.insp)) }}</div><pv-progreso [ev]="ab" /></div> }
            @if (l) { <div class="kr">
              @if (x.plan.recs.length) { @for (p of [1, 2, 3, 4]; track p) { @if (x.plan.porPrio[p - 1]) { <pv-prio [p]="p" [n]="x.plan.porPrio[p - 1]" />&ngsp; } } }
              @else { <span class="tag t-ok">Todo en 100 %</span> }</div> }
            <div class="kf"><span></span><div class="ia-row">
              <pv-acciones-unidad [u]="u" [sinEditar]="true" [sinSeguir]="true" />
              @if (l) { @if (l.src === "ev") { <pv-ia tipo="resultado" tip="Resultado" [ruta]="['/evaluacion', l.id, 'resultado']" /> } @else { <pv-ia tipo="resultado" tip="Resultado" (pulsar)="detalle.set(l.codigo)" /> } }</div></div>
          </div>
        } @empty { <div class="kvacio">Sin unidades en esta etapa</div> }
      </div>
    }
  </div>
  @if (detalle()) { <pv-detalle-snap [codigo]="detalle()" (cerrar)="detalle.set('')" /> }`
})
export class Seguimiento {
  store = inject(StoreService); private router = inject(Router); private ruta = inject(ActivatedRoute);
  m: any = M; cols = M.SEG_COLS as { k: string; t: string; d: string; c: string }[];
  q = signal(""); tipo = signal(""); detalle = signal("");
  hl = toSignal(this.ruta.queryParamMap.pipe(map(p => Number(p.get("u")) || 0)), { initialValue: 0 });
  dias = (l: any) => -M.diasHasta(l.fecha);

  vis = computed(() => {
    this.store.v(); const q = this.q().toLowerCase();
    return M.visibleUnidades().filter((u: any) => u.estado === "ACTIVA" && (!q || (u.nombre + u.mun + M.fullName(M.userById(u.propietario))).toLowerCase().includes(q)) && (!this.tipo() || M.tipoPredio(u).startsWith(this.tipo())));
  });
  info = computed(() => this.vis().map((u: any) => { const i = M.segInfo(u); return { ...i, plan: i.last ? M.buildPlan(i.last) : { recs: [], porPrio: [] } }; }));
  private orden: Record<string, (a: any, b: any) => number> = {
    EVAL: (a, b) => (a.last ? a.last.fecha : "").localeCompare(b.last ? b.last.fecha : ""),
    PROG: (a, b) => a.ab.fecha.localeCompare(b.ab.fecha),
    CURSO: (a, b) => (Number(M.vencida(b.ab)) - Number(M.vencida(a.ab))) || a.ab.fecha.localeCompare(b.ab.fecha),
    VALID: (a, b) => a.last.fecha.localeCompare(b.last.fecha),
    OK: (a, b) => a.last.total - b.last.total };
  col(k: string) { return this.info().filter((x: any) => x.col === k).sort(this.orden[k]); }

  constructor() {
    effect(() => { const h = this.hl(); if (h) setTimeout(() => document.getElementById("kc" + h)?.scrollIntoView({ block: "center", inline: "center" }), 0); });
  }
  quitar() { this.router.navigate([], { relativeTo: this.ruta, queryParams: { u: null }, queryParamsHandling: "merge" }); }
}
