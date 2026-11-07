import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { StoreService } from "../../core/services/store.service";
import { EvaluacionesService } from "../../core/services/evaluaciones.service";
import * as M from "../../core/engine/motor";
import { TIPOS_GALPON } from "../../core/data/norma/catalogos";

/**
 * Captura de un indicador para una unidad de registro: un galpón, la unidad completa ("U") o un grupo de aves del traspatio.
 * Equivale a capBlock() del prototipo. Cada cambio queda guardado en la evaluación (autoguardado) y refresca el avance.
 */
@Component({
  selector: "pv-ev-bloque", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v();
  @let r = reg();
  @let s = pts();
  @let k = ind().k;
  <div class="muestra">📋 <b>Muestra:</b> {{ muestra() }}</div>

  @switch (k) {
    @case ("grid") {
      @if (r.pp) {
        <div class="table-wrap" style="margin-top:8px"><table class="pp">
          <tr><th>Punto</th><th>Aves revisadas{{ jaula() ? " (3 a 5 jaulas)" : "" }}</th><th>Con 2 puntos</th><th>Con 1 punto</th><th>Con 0 puntos</th><th class="num">%</th></tr>
          @for (q of r.pp; track $index; let i = $index) {
            @let st = ppEst(q);
            <tr [class.pp-ok]="st.ok" [class.pp-err]="st.err">
              <td><b>Punto {{ i + 1 }}</b></td>
              @for (f of campos; track f) {
                <td><input type="number" min="0" [attr.max]="rango()[1]" [value]="ppVal(q[f])" [disabled]="!ed()" [attr.aria-label]="'Punto ' + (i + 1) + ' · ' + etq[f]" (change)="setPP(i, f, $event)"></td>
              }
              <td class="num">@if (st.ok) { {{ m.fmt((2 * q.c2 + +q.c1) / (2 * q.n) * 100, 0) }} % } @else if (st.err) { <span class="tiny" style="color:var(--vino)">{{ st.err }}</span> } @else { — }</td>
            </tr>
          }
          <tr class="pp-tot"><td><b>Total</b></td><td><b>{{ m.int(tot().n) }}</b></td><td>{{ m.int(tot().c2) }}</td><td>{{ m.int(tot().c1) }}</td><td>{{ m.int(tot().c0) }}</td>
            <td class="num"><b>@if (tot().n) { {{ m.fmt((2 * tot().c2 + tot().c1) / (2 * tot().n) * 100, 0) }} % } @else { — }</b></td></tr>
        </table></div>
        <p class="tiny muted" style="margin:4px 0 0">En cada punto revise de {{ rango()[0] }} a {{ rango()[1] }} aves{{ jaula() ? " (3 a 5 jaulas: nivel bajo, intermedio y alto)" : "" }} y anote cuántas quedaron en cada puntaje; los valores inician en 0: cambie solo los que apliquen; la suma debe dar las aves revisadas. % = (puntos obtenidos ÷ 2 × aves revisadas) × 100.</p>
      } @else {
        <div class="units">
          @for (v of r.units; track $index; let i = $index) {
            <button type="button" class="unit" [class]="'unit ' + (v == null ? '' : 'v' + v)" [disabled]="!ed()" title="Clic: 2 → 1 → 0" [attr.aria-label]="m.unitLab(ind(), i) + ': ' + (v == null ? 'sin registrar' : v)" (click)="ciclo(i)">
              <small>{{ m.unitLab(ind(), i) }}</small><b>{{ v == null ? "·" : v }}</b></button>
          }
        </div>
      }
      @if (ed()) { <div class="btn-row" style="margin-top:6px"><button type="button" class="btn ghost sm" (click)="todas(2)">Todas en 2</button><button type="button" class="btn ghost sm" (click)="todas(null)">Limpiar</button></div> }
    }
    @case ("cc") {
      <div class="units">
        @for (v of r.units; track $index; let i = $index) {
          <label class="unit" style="width:70px"><small>Ave {{ i + 1 }}</small>
            <select [disabled]="!ed()" (change)="setCC(i, $event)"><option value="" [selected]="v == null">—</option>@for (n of [1, 2, 3, 4, 5]; track n) { <option [value]="n" [selected]="v === n">{{ n }}</option> }</select></label>
        }
      </div>
      <details class="ilus"><summary>Ver escala de condición corporal (Ilustración 3)</summary>
        <img src="assets/ilustracion3_condicion_corporal.png" alt="Ilustración 3: escala de condición corporal 1 a 5 (delgado, adecuada, bueno o ideal, musculoso, sobrepeso)" style="width:100%;max-width:760px;border:1px solid var(--linea);border-radius:8px;margin-top:8px;background:#fff">
        <p class="tiny muted">Adaptado de: University of Bristol 2020 · Metodología EBA ICA v2.0, Ilustración 3.</p>
        <table class="small"><tr><th>Puntaje</th><th>2 puntos</th><th>1 punto</th><th>0 puntos</th></tr>
          @if (gk() === "PON") { <tr><td>Gallina ponedora (Tabla 55)</td><td>Escala 2 o 3</td><td>Escala 4</td><td>Escala 1 o 5</td></tr> }
          @else { <tr><td>Pollo de engorde (Tabla 56)</td><td>Escala 3 o 4</td><td>Escala 2</td><td>Escala 1 o 5</td></tr> }</table></details>
    }
    @case ("scale") {
      <div class="seg" style="margin-top:8px">@for (n of [2, 1, 0]; track n) { <button type="button" [class]="'s' + n + (r.v === n ? ' on' : '')" [disabled]="!ed()" [attr.aria-pressed]="r.v === n" (click)="setV(n)">{{ n }} · {{ ind()["p" + n] }}</button> }</div>
    }
    @case ("check") {
      <div style="margin-top:8px">
        @for (c of ind().crit; track $index; let i = $index) {
          <label class="check"><input type="checkbox" [checked]="r.checks[i]" [disabled]="!ed()" (change)="setChk(i, $event)"> {{ c }}@if (minimos().includes(i) && ind().rule !== "all") { <span class="tag t-info">mínimo para 1 punto</span> }</label>
        }
        @if (ind().g === "MBG") {
          <div class="form" style="margin-top:8px"><div class="field"><label>Estado del documento *</label>
            <select [disabled]="!ed()" (change)="setF('doc', $event)">@for (o of docs; track o[0]) { <option [value]="o[0]" [selected]="r.doc === o[0]">{{ o[1] }}</option> }</select></div></div>
        }
        @if (ed() && !r.touched) { <button type="button" class="btn ghost sm" (click)="confirmar()">Registrar verificación (sin condiciones marcadas = 0)</button> }
      </div>
    }
    @case ("ratio") {
      <div class="form" style="margin-top:8px;grid-template-columns:repeat(3,1fr)">
        <div class="field"><label>Aves alojadas</label><input type="number" [value]="r.aves" [disabled]="!ed()" (change)="setN('aves', $event)" style="max-width:140px"></div>
        <div class="field"><label>Nº de {{ ind().what }}s</label><input type="number" [value]="r.n" [disabled]="!ed()" (change)="setN('n', $event)" style="max-width:140px"></div>
        <div class="field"><label>Referencia (aves por {{ ind().what }})</label><input type="number" [value]="r.ref" [disabled]="!ed()" (change)="setN('ref', $event)" style="max-width:140px"><span class="hint">Casa genética o fabricante</span></div></div>
    }
    @case ("dens_jaula") {
      <div class="form" style="margin-top:8px"><div class="field"><label>Etapa</label><select [disabled]="!ed()" (change)="setF('etapa', $event)">@for (e of etapasJaula; track e) { <option [selected]="r.etapa === e">{{ e }}</option> }</select></div></div>
      <table><tr><th>Jaula</th><th>Área de la jaula (cm²)</th><th>Aves en la jaula</th></tr>
        @for (j of r.jaulas; track $index; let i = $index) { <tr><td>{{ i + 1 }}</td><td><input type="number" [value]="j.area" [disabled]="!ed()" (change)="setJ(i, 'area', $event)" style="max-width:140px"></td><td><input type="number" [value]="j.aves" [disabled]="!ed()" (change)="setJ(i, 'aves', $event)" style="max-width:140px"></td></tr> }</table>
    }
    @case ("dens_piso") {
      <div class="form" style="margin-top:8px;grid-template-columns:repeat(3,1fr)">
        <div class="field"><label>Total de aves (TG)</label><input type="number" [value]="r.aves" [disabled]="!ed()" (change)="setN('aves', $event)" style="max-width:140px"></div>
        <div class="field"><label>Área útil AU (m²)</label><input type="number" [value]="r.area" [disabled]="!ed()" (change)="setN('area', $event)" style="max-width:140px">@if (ev().pastoreo) { <span class="hint">Pastoreo: galpón + corrales exteriores</span> }</div>
        <div class="field"><label>Etapa</label><select [disabled]="!ed()" (change)="setF('etapa', $event)">@for (e of etapasPiso; track e) { <option [selected]="r.etapa === e">{{ e }}</option> }</select></div></div>
    }
    @case ("dens_engorde") {
      <div class="form" style="margin-top:8px;grid-template-columns:repeat(3,1fr)">
        <div class="field"><label>Aves (AN)</label><input type="number" [value]="r.aves" [disabled]="!ed()" (change)="setN('aves', $event)" style="max-width:140px"></div>
        <div class="field"><label>Peso inicial Pu (kg)</label><input type="number" step="0.001" [value]="r.pu" [disabled]="!ed()" (change)="setN('pu', $event)" style="max-width:140px"></div>
        <div class="field"><label>Ganancia diaria GDP (kg)</label><input type="number" step="0.001" [value]="r.gdp" [disabled]="!ed()" (change)="setN('gdp', $event)" style="max-width:140px"></div>
        <div class="field"><label>Días (D)</label><input type="number" [value]="r.dias" [disabled]="!ed()" (change)="setN('dias', $event)" style="max-width:140px"></div>
        <div class="field"><label>Área total AT (m²)</label><input type="number" [value]="r.area" [disabled]="!ed()" (change)="setN('area', $event)" style="max-width:140px"></div>
        <div class="field"><label>Tipo de galpón</label><select [disabled]="!ed()" (change)="setF('tipo', $event)">@for (t of tipos; track t[0]) { <option [value]="t[0]" [selected]="r.tipo === t[0]">{{ t[1][0] }} (≤ {{ t[1][1] }})</option> }</select></div></div>
      <p class="tiny muted">Opción 1: PAI = Pu + GDP × D · P = AN × PAI ÷ AT.</p>
    }
    @case ("pct") {
      <div class="form" style="margin-top:8px"><div class="field"><label>% de aves observadas con el comportamiento</label><input type="number" min="0" max="100" [value]="r.pct" [disabled]="!ed()" (change)="setN('pct', $event)" style="max-width:140px"></div></div>
    }
    @case ("mort") {
      <div class="form" style="margin-top:8px"><div class="field"><label>Mortalidad promedio de los últimos 5 ciclos (%)</label><input type="number" step="0.1" [value]="r.pct" [disabled]="!ed()" (change)="setN('pct', $event)" style="max-width:140px"></div>
        <div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" [checked]="r.corr" [disabled]="!ed()" (change)="setB('corr', $event)"> Hay evidencia de acciones correctivas</label></div></div>
    }
    @case ("dens_tras_pon") {
      <div class="form" style="margin-top:8px"><div class="field"><label>Gallinas</label><input type="number" [value]="r.aves" [disabled]="!ed()" (change)="setN('aves', $event)" style="max-width:140px"></div>
        <div class="field"><label>Área de corral + patio (m²)</label><input type="number" [value]="r.area" [disabled]="!ed()" (change)="setN('area', $event)" style="max-width:140px"></div></div>
    }
    @case ("dens_tras_pol") {
      <div class="form" style="margin-top:8px;grid-template-columns:repeat(3,1fr)">
        <div class="field"><label>Pollos</label><input type="number" [value]="r.aves" [disabled]="!ed()" (change)="setN('aves', $event)" style="max-width:140px"></div>
        <div class="field"><label>Peso promedio (kg)</label><input type="number" step="0.1" [value]="r.peso" [disabled]="!ed()" (change)="setN('peso', $event)" style="max-width:140px"></div>
        <div class="field"><label>Área (m²)</label><input type="number" [value]="r.area" [disabled]="!ed()" (change)="setN('area', $event)" style="max-width:140px"></div></div>
    }
  }
  @if (s.det) { <p class="small" style="margin:8px 0 0"><b>Cálculo:</b> {{ s.det }} → {{ s.pts == null ? "—" : m.fmt(s.pts, 2) }} pts</p> }`
})
export class EvBloque {
  store = inject(StoreService); private svc = inject(EvaluacionesService);
  m: any = M;
  ev = input.required<any>(); ind = input.required<any>(); gk = input.required<string>(); ed = input(false);

  campos = ["n", "c2", "c1", "c0"]; etq: Record<string, string> = { n: "aves revisadas", c2: "con 2 puntos", c1: "con 1 punto", c0: "con 0 puntos" };
  docs = [["", "Seleccione"], ["APORTADO", "Aportado y verificado"], ["PENDIENTE", "Pendiente (se solicita al productor)"], ["NO_APORTADO", "No aportado"]];
  etapasJaula = Object.keys(M.ETAPA_JAULA); etapasPiso = Object.keys(M.ETAPA_PISO);
  tipos = Object.entries(TIPOS_GALPON as Record<string, [string, number]>);

  /** Registro de este indicador (lo crea si no existe) y su puntaje; se recalculan tras cada cambio. */
  reg = computed<any>(() => (this.store.v(), M.getR(this.ev(), this.gk(), this.ind())));
  pts = computed<any>(() => (this.store.v(), M.score(this.ind(), this.reg(), this.ev(), this.gk())));
  muestra = computed(() => M.muestraTxt(this.ind(), this.ev(), this.gk()));
  jaula = computed(() => this.ev().sis === "PONEDORA_JAULA");
  rango = computed(() => M.PP_RANGO(this.ev()));
  minimos = computed<number[]>(() => (M as any).MIN_REQ[this.ind().id] || this.ind().min || []);
  tot = computed(() => { const T = { n: 0, c2: 0, c1: 0, c0: 0 }; (this.reg().pp || []).forEach((q: any) => { if (this.ppEst(q).ok) (["n", "c2", "c1", "c0"] as const).forEach(f => T[f] += Number(q[f])); }); return T; });

  ppEst = (q: any) => M.ppEstado(q, this.ev()) as { ok: boolean; err?: string };
  ppVal = (v: any) => (M.ppVacio(v) ? 0 : v);

  private cambio() { this.svc.guardado(this.ev()); }
  private num(e: Event) { const v = (e.target as HTMLInputElement).value; return v === "" ? "" : Number(v); }

  ciclo(i: number) { const r = this.reg(), v = r.units[i]; r.units[i] = v == null ? 2 : v === 0 ? 2 : v - 1; this.cambio(); }
  todas(v: number | null) {
    const r = this.reg();
    if (r.pp) r.pp = r.pp.map((q: any) => v == null ? { n: 15, c2: 0, c1: 0, c0: 0 } : { n: Number(q.n) || 15, c2: Number(q.n) || 15, c1: 0, c0: 0 });
    else r.units = r.units.map(() => v);
    this.cambio();
  }
  setPP(i: number, f: string, e: Event) { const v = (e.target as HTMLInputElement).value; this.reg().pp[i][f] = v === "" ? 0 : Math.max(0, Math.round(Number(v))); this.cambio(); }
  setCC(i: number, e: Event) { const v = (e.target as HTMLSelectElement).value; this.reg().units[i] = v ? Number(v) : null; this.cambio(); }
  setV(n: number) { this.reg().v = n; this.cambio(); }
  setChk(i: number, e: Event) { const r = this.reg(); r.checks[i] = (e.target as HTMLInputElement).checked; r.touched = true; this.cambio(); }
  confirmar() { this.reg().touched = true; this.cambio(); }
  setF(f: string, e: Event) { this.reg()[f] = (e.target as HTMLSelectElement).value; this.cambio(); }
  setN(f: string, e: Event) { this.reg()[f] = this.num(e); this.cambio(); }
  setB(f: string, e: Event) { this.reg()[f] = (e.target as HTMLInputElement).checked; this.cambio(); }
  setJ(i: number, f: "area" | "aves", e: Event) { this.reg().jaulas[i][f] = this.num(e); this.cambio(); }
}
