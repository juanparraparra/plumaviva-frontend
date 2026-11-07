import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from "@angular/core";
import { StoreService } from "../../core/services/store.service";
import { EvaluacionesService } from "../../core/services/evaluaciones.service";
import * as M from "../../core/engine/motor";
import { SISTEMAS } from "../../core/data/norma/catalogos";
import { ImpTag } from "../../shared/plan";
import { Modal } from "../../shared/modal";
import { EvBloque } from "./ev-bloque";

/** Ilustración 2: nueve puntos de muestreo en planta. */
@Component({
  selector: "pv-galpon-plano", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="galpon"><span class="lab">Galpón (vista en planta)</span>@for (fila of filas; track $index) { <div class="row">@for (p of fila; track p) { <div class="pt">{{ p }}</div> }</div> }<div class="door"></div></div>
    <p class="tiny muted" style="max-width:520px;text-align:center">Ilustración 2 · 9 puntos en extremos y centro, iniciando por la entrada más cercana (franja dorada).</p>`
})
export class GalponPlano { filas = [[7, 8, 9], [4, 5, 6], [1, 2, 3]]; }

/** Ayuda de un indicador: pregunta orientadora, método, fórmula, escala y condiciones a verificar. */
@Component({
  selector: "pv-ev-ayuda", imports: [Modal, ImpTag, GalponPlano], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let i = ind();
  <pv-modal [titulo]="'Ayuda · ' + m.codeOf(i) + ' ' + i.n" (cerrar)="cerrar.emit()">
    <p class="small muted">Metodología EBA v2.0 · numeral {{ i.num }} · {{ i.tab }} · Capítulo {{ i.cap }} · {{ aplica() }}</p>
    @if (i.preg) { <p><b>Pregunta orientadora:</b> {{ i.preg }}</p> }
    <p><b>Método:</b> {{ i.met }}</p>
    @if (i.uni && i.uni !== i.met) { <p><b>Unidad de muestreo:</b> {{ i.uni }}</p> }
    <p><b>Fórmula:</b> {{ i.f || "(Promedio ÷ 2) × 100" }}</p>
    <p><b>Importancia:</b> <pv-imp [ind]="i" [conCaracter]="true" /></p>
    <div class="legend-scale"><div class="ls2"><b>2 puntos</b><br>{{ i.p2 }}</div><div class="ls1"><b>1 punto</b><br>{{ i.p1 }}</div><div class="ls0"><b>0 puntos</b><br>{{ i.p0 }}</div></div>
    @if (i.crit) { <p style="margin-top:12px"><b>Condiciones a verificar:</b></p><ul>@for (c of i.crit; track $index) { <li>{{ c }}</li> }</ul> }
    @if (muestreo()) { <p style="margin-top:12px"><b>Puntos de muestreo (Ilustración 2):</b></p><pv-galpon-plano /> }
    @if (i.ilus === 3) {
      <p style="margin-top:12px"><b>Ilustración 3 · Escala de medición de condición corporal en pollo de engorde y gallina ponedora de traspatio</b></p>
      <img src="assets/ilustracion3_condicion_corporal.png" alt="Ilustración 3: escala de condición corporal" style="width:100%;max-width:760px;border:1px solid var(--linea);border-radius:8px;margin-top:8px;background:#fff">
      <table class="small"><tr><th>Puntaje</th><th>2 puntos</th><th>1 punto</th><th>0 puntos</th></tr>
        <tr><td>Gallina ponedora (Tabla 55)</td><td>Escala 2 o 3</td><td>Escala 4</td><td>Escala 1 o 5</td></tr><tr><td>Pollo de engorde (Tabla 56)</td><td>Escala 3 o 4</td><td>Escala 2</td><td>Escala 1 o 5</td></tr></table>
    }
    <ng-container pie><button class="btn" type="button" (click)="cerrar.emit()">Entendido</button></ng-container>
  </pv-modal>`
})
export class EvAyuda {
  m: any = M; ind = input.required<any>(); cerrar = output<void>();
  muestreo = computed(() => /con muestreo/i.test(this.ind().met) && this.ind().cap === "I");
  aplica = computed(() => {
    const i = this.ind(), n: Record<string, string> = { jaula: "ponedora en jaula", piso: "ponedora en piso", engorde: "pollo de engorde" };
    return i.cap === "I" ? ["jaula", "piso", "engorde"].filter(k => i[k]).map(k => n[k]).join(", ")
      : [i.pon ? "gallina ponedora" : "", i.pol ? "pollo de engorde" : ""].filter(Boolean).join(" y ") + " de traspatio";
  });
}

/** Tarjeta de un indicador dentro de una fase: encabezado con resultado, captura, escala, ayuda, observación y evidencia. Equivale a cardInd(). */
@Component({
  selector: "pv-ev-indicador", imports: [EvBloque, EvAyuda], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v();
  @let i = ind();
  @if (!aplica()) {
    <div class="ind na"><div class="ind-head"><div><h3>{{ m.codeOf(i) }} · {{ i.n }}</h3><div class="meta">Numeral {{ i.num }} · {{ i.tab }}</div></div>
      <span class="tag t-gray">No aplica a {{ noAplica() }}</span></div></div>
  } @else {
    @let rs = resumen();
    <div class="ind" [id]="'c-' + i.id">
      <div class="ind-head"><div>
        <h3>{{ m.codeOf(i) }} · {{ i.n }}</h3>
        <div class="meta">Numeral {{ i.num }} · {{ i.tab }} · {{ i.met }}</div>
        <div style="margin-top:5px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          @if (prev(); as p) {
            <span class="tag" [class]="'tag ' + (p.pct < 50 ? 't-err' : p.pend ? 't-warn' : 't-ok')" [title]="'Resultado de ' + p.cod + (p.gk ? ' en el galpón ' + p.gk : '')">Anterior{{ p.gk ? " en " + p.gk : "" }} ({{ p.fecha }}): {{ m.fmt(p.pct, 0) }} %{{ p.pend ? " · con hallazgo" : "" }}</span>
            @if (p.racha; as ra) { <span class="tag t-err" [title]="ra.txt">Sin corregir desde {{ ra.desde }}</span> }
          }
          @if (ev().cap === "I" && ev().galpones.length > 1 && !m.galponLevel(i, ev())) { <span class="tag t-info" title="Se registra una sola vez y aplica a todos los galpones evaluados">Toda la unidad · {{ ev().galpones.join(" y ") }}</span> }
        </div>
        @if (i.preg) { <div class="small" style="margin-top:4px"><i>{{ i.preg }}</i></div> }
      </div>
      <div class="ind-res"><div class="p">{{ rs.pct == null ? "—" : m.fmt(rs.pct, 0) + " %" }}</div><div class="tiny muted">{{ rs.pts == null ? "sin registrar" : m.fmt(rs.pts, 2) + " pts" }}</div>
        @if (rs.done) { <span class="tag t-ok">Completo</span> } @else { <span class="tag t-gray">Pendiente</span> }</div></div>

      @if (ev().cap === "II") {
        @for (b of bloques(); track b.gk) {
          <div class="grp-block"><div class="grp-head">{{ b.G.ico }} <b>{{ b.G.corto }}</b> · {{ b.G.n }} aves · {{ b.G.corrales.join(", ") }}{{ b.G.corral ? "" : " (sin corral)" }}
            <span class="grp-pct">{{ b.pts == null ? "sin registrar" : m.fmt(b.pts / 2 * 100, 0) + " %" }}</span></div>
            <pv-ev-bloque [ev]="ev()" [ind]="i" [gk]="b.gk" [ed]="ed()" /></div>
        }
        @if (omitidos().length) { <p class="tiny muted" style="margin-top:6px">No aplica a {{ omitidos().join(", ") }} (Tabla 35{{ i.id === "13.5" ? " · sin corral no se mide" : "" }}).</p> }
        @if (bloques().length > 1 && (i.k === "grid" || i.k === "cc")) { <p class="tiny muted" style="margin-top:4px">Resultado del indicador: promedio de todas las unidades revisadas en los {{ bloques().length }} grupos.</p> }
      } @else {
        <pv-ev-bloque [ev]="ev()" [ind]="i" [gk]="gkUnico()" [ed]="ed()" />
      }

      <div class="legend-scale"><div class="ls2"><b>2</b> · {{ i.p2 }}</div><div class="ls1"><b>1</b> · {{ i.p1 }}</div><div class="ls0"><b>0</b> · {{ i.p0 }}</div></div>
      <div class="ind-tools">
        <button type="button" class="btn sec sm" (click)="ayuda.set(true)">❓ Ayuda</button>
        <input class="obs" placeholder="Observación del inspector" [attr.aria-label]="'Observación · ' + m.codeOf(i)" [value]="regObs().obs" [disabled]="!ed()" (change)="obs($event)">
        <label class="btn sec sm" [style.cursor]="ed() ? 'pointer' : 'default'">📎 {{ regObs().file ? regObs().file : i.id === "MBG-09" ? "Evidencia (obligatoria)" : "Evidencia" }}
          <input type="file" accept="image/*,.pdf" [disabled]="!ed()" hidden (change)="archivo($event)"></label>
        @if (i.id === "MBG-09" && !regObs().file) { <span class="tag t-err">Requiere evidencia</span> }
      </div>
    </div>
    @if (ayuda()) { <pv-ev-ayuda [ind]="i" (cerrar)="ayuda.set(false)" /> }
  }`
})
export class EvIndicador {
  store = inject(StoreService); private svc = inject(EvaluacionesService);
  m: any = M;
  ev = input.required<any>(); ind = input.required<any>(); ed = input(false); gk = input("U");
  ayuda = signal(false);

  aplica = computed(() => M.applies(this.ind(), this.ev()));
  noAplica = computed(() => this.ev().cap === "I" ? (SISTEMAS as Record<string, string>)[this.ev().sis].toLowerCase() : "los grupos de aves del predio");
  /** unidad de registro de los indicadores de granja: el galpón activo o la unidad completa */
  gkUnico = computed(() => M.galponLevel(this.ind(), this.ev()) ? this.gk() : "U");
  private ks = computed(() => M.keysFor(this.ind(), this.ev()) as string[]);
  bloques = computed(() => (this.store.v(), this.ks().map(gk => ({ gk, G: M.grupoOf(this.ev(), gk), pts: M.score(this.ind(), M.getR(this.ev(), gk, this.ind()), this.ev(), gk).pts }))));
  omitidos = computed(() => this.ev().grupos.filter((g: any) => !this.ks().includes(g.id)).map((g: any) => g.lab));
  regObs = computed<any>(() => (this.store.v(), M.getR(this.ev(), this.ev().cap === "II" ? this.ks()[0] : this.gkUnico(), this.ind())));
  resumen = computed(() => {
    this.store.v();
    if (this.ev().cap === "II") { const r = M.indResult(this.ind(), this.ev()); return { pts: r.pts as number | null, done: r.done as boolean, pct: r.pts == null ? null : r.pts / 2 * 100 }; }
    const s = M.score(this.ind(), M.getR(this.ev(), this.gkUnico(), this.ind()), this.ev(), this.gkUnico());
    return { pts: s.pts as number | null, done: s.done as boolean, pct: s.pts == null ? null : s.pts / 2 * 100 };
  });
  /** resultado de la evaluación anterior para este indicador (y desde cuándo no se corrige) */
  prev = computed(() => {
    this.store.v(); this.gk();
    const pp = M.pctPrevDe(this.ev(), this.ind()); if (!pp) return null;
    const p = pp.p, x = p.items.find((i: any) => i.ind.id === this.ind().id), pend = pp.pct < M.CUMPLE;
    const ra = x && x.pct < M.CUMPLE ? M.rachas(p)[this.ind().id] : null;
    return { pct: pp.pct, pend, cod: p.codigo, fecha: p.fecha, gk: this.ev().galpones.length < 2 ? null : pp.gk,
      racha: pend && ra && ra.n > 1 ? { desde: ra.desde, txt: M.antigTxt(ra) } : null };
  });

  obs(e: Event) { this.regObs().obs = (e.target as HTMLInputElement).value; this.svc.guardado(this.ev()); }
  archivo(e: Event) { const el = e.target as HTMLInputElement, f = el.files?.[0]; if (!f) return; this.svc.adjuntar(this.ev(), this.regObs(), f); el.value = ""; }
}
