import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from "@angular/core";
import { StoreService } from "../../core/services/store.service";
import { ctx } from "../../core/engine/contexto";
import * as M from "../../core/engine/motor";
import { EvIndicador } from "./ev-indicador";

/** Fases de captura MBA / MBR / MBG: pestañas por galpón, filtros y tarjetas de indicador. Equivale a stGrupo(). */
@Component({
  selector: "pv-ev-fase", imports: [EvIndicador], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v();
  @let e = ev();
  <div (click)="mantener($event)" (change)="mantener($event)">
  <div class="card">
    <div class="card-head"><h2>{{ m.GN[g()] }} ({{ g() }})</h2><span class="tag t-info">Peso {{ m.pesosDe(e.cap)[g()] }} %</span></div>
    <p class="muted small">{{ g() === "MBG"
      ? "Revisión documental: marque las condiciones que se verifican; el puntaje se calcula automáticamente (el inspector no lo digita)."
      : "Haga clic en cada unidad de muestreo para registrar el puntaje: 2 → 1 → 0. El porcentaje se calcula con (promedio ÷ 2) × 100." }}</p>
    @if (porGalpon()) {
      <p class="small">Galpón en evaluación: <b>{{ gk() }}</b>@if (e.galpones.length > 1) { · cambie de galpón con las pestañas; debe evaluar todos los galpones para pasar a la siguiente fase }</p>
      @if (e.galpones.length > 1) {
        <div class="tabs" role="tablist">@for (k of e.galpones; track k) { <button type="button" role="tab" [class.on]="gk() === k" [attr.aria-selected]="gk() === k" (click)="galpon.emit(k)">Galpón {{ k }} <span class="tiny">{{ m.galAvance(e, g(), k) }}</span></button> }</div>
      }
    }
    @if (alcance().length) {
      @if (g() === "MBG") { <div class="alert info" style="margin-top:8px">Se están evaluando <b>2 galpones ({{ e.galpones.join(" y ") }})</b>. Las medidas basadas en la gestión son documentales (POE, registros, certificados, protocolos): la metodología las verifica <b>una sola vez para toda la unidad productiva</b> y el resultado aplica a los dos galpones. Por eso en esta fase no hay una pestaña por galpón.</div> }
      @else { <p class="tiny muted" style="margin-top:6px">{{ alcance().join(", ") }} se registran una sola vez para toda la unidad (aplican a {{ e.galpones.join(" y ") }}); los demás indicadores se registran en cada galpón con las pestañas.</p> }
    }
    <div class="filtro-bar no-print"><span class="tiny muted">Mostrar:</span>
      @for (k of claves(); track k) { <button type="button" [class.on]="filtro() === k" (click)="setFiltro(k)">{{ filtros[k][0] }} <b>{{ cuenta(k) }}</b></button> }</div>
    @if (ayudaFiltro()) { <p class="tiny muted" style="margin:4px 0 0">{{ ayudaFiltro() }}@if (mantenidos()) { Los indicadores que acaba de diligenciar siguen visibles hasta que cambie de filtro, de fase o de galpón. }</p> }
  </div>
  @for (i of visibles(); track i.id) { <pv-ev-indicador [ev]="e" [ind]="i" [ed]="ed()" [gk]="gk()" /> }
  @empty { <div class="alert ok">{{ vacio() }}</div> }
  </div>`
})
export class EvFase {
  store = inject(StoreService); m: any = M; filtros = M.FILTROS as unknown as Record<string, [string, any]>;
  get pesos() { return ctx.PARAMS.pesos; }
  ev = input.required<any>(); g = input.required<string>(); ed = input(false); gk = input("U");
  galpon = output<string>();
  filtro = signal<string>(ctx.ui.FILTRO || "todos");

  lista = computed(() => M.indsOf(this.ev()).filter((i: any) => i.g === this.g()));
  aplicables = computed(() => this.lista().filter((i: any) => M.applies(i, this.ev())));
  porGalpon = computed(() => this.aplicables().some((i: any) => M.galponLevel(i, this.ev())));
  alcance = computed(() => this.ev().cap !== "I" || this.ev().galpones.length < 2 ? [] : this.aplicables().filter((i: any) => !M.galponLevel(i, this.ev())).map((i: any) => M.codeOf(i)));
  hayPrev = computed(() => (this.store.v(), !!M.prevSnap(this.ev())));
  claves = computed(() => Object.keys(this.filtros).filter(k => k !== "prev" || this.hayPrev()));
  private efectivo = computed(() => this.filtro() === "prev" && !this.hayPrev() ? "todos" : this.filtro());

  cuenta(k: string) { this.store.v(); return k === "todos" ? this.lista().length : this.aplicables().filter((i: any) => this.filtros[k][1](this.ev(), i)).length; }
  visibles = computed(() => {
    this.store.v(); this.gk(); this.efectivo();
    ctx.ui.FILTRO = this.efectivo();
    return this.lista().filter((i: any) => M.filtroInd(this.ev(), i));
  });
  mantenidos = computed(() => (this.store.v(), this.efectivo() !== "todos" && this.aplicables().some((i: any) => ctx.ui.FILTRO_KEEP.has(M.keepKey(i.id)) && !this.filtros[this.efectivo()][1](this.ev(), i))));
  ayudaFiltro = computed(() => {
    const p = M.prevSnap(this.ev()), gk = this.ev().cap === "I" && this.ev().galpones.length > 1 && this.aplicables().some((i: any) => M.porGalpon(this.ev(), i)) ? ` en el galpón ${this.gk()}` : "";
    return ({ todos: "", sin: `Indicadores que todavía no tienen todas sus unidades registradas${gk}.`,
      prev: `Indicadores que no estaban en 100 % en ${p ? p.codigo : "la anterior"}${gk} y que en esta visita todavía no llegan a 100 % (si llegan, salen del filtro).`,
      hall: `Indicadores ya registrados${gk} que quedaron por debajo de 100 %, incluidos los que antes cumplían.` } as Record<string, string>)[this.efectivo()] || "";
  });
  vacio = computed(() => ({ sin: "Todos los indicadores de este grupo ya están registrados.", prev: "No quedan hallazgos de la evaluación anterior en este grupo: ya se corrigieron o cumplían.", hall: "Ningún indicador registrado quedó por debajo de 100 %." } as Record<string, string>)[this.efectivo()] || "");

  setFiltro(k: string) { ctx.ui.FILTRO = k; ctx.ui.FILTRO_KEEP.clear(); this.filtro.set(k); this.store.touch(); }
  /** Lo que el inspector acaba de diligenciar sigue visible aunque el filtro lo excluya. */
  mantener(e: Event) {
    const t = e.target as HTMLElement, c = t.closest?.(".ind[id^='c-']");
    if (c && t.closest("input, select, .unit, .seg button, .btn.ghost")) { ctx.ui.FILTRO_KEEP.add(M.keepKey(c.id.slice(2))); }
  }
}
