import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from "@angular/core";
import { Router } from "@angular/router";
import { StoreService } from "../../core/services/store.service";
import { EvaluacionesService } from "../../core/services/evaluaciones.service";
import { ctx } from "../../core/engine/contexto";
import * as M from "../../core/engine/motor";
import { TIPOS_GALPON } from "../../core/data/norma/catalogos";
import { ResumenUnidad } from "../../shared/resumen";
import { MotivoModal } from "../../shared/motivo-modal";
import { Modal } from "../../shared/modal";
import { NivelTag } from "../../shared/ui";
import { GalponPlano } from "./ev-indicador";

/* ------------------------------------------------------------------ Fase I · apertura */
@Component({
  selector: "pv-ev-apertura", imports: [ResumenUnidad], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v(); @let e = ev();
  @if (!previas().length) { <div class="card"><div class="alert info">Esta unidad no tiene evaluaciones previas: esta visita será la línea base.</div></div> }
  @else {
    <div class="card"><div class="card-head"><h2>Antecedentes de la unidad · referencia de la última evaluación</h2></div>
      <p class="muted small">Información de apoyo para iniciar la visita. En cada indicador verá el resultado de la evaluación anterior. No hay compromisos ni estados que actualizar: el resultado de esta visita quedará como una nueva evaluación en el historial.</p></div>
    <pv-resumen-unidad [u]="u()" [snaps]="previas()" [compact]="true" />
  }
  <div class="card"><h2>Fase I · Apertura de la visita</h2>
    <p class="muted small">Presentación del inspector, objeto de la visita, consentimiento y verificación del inventario.</p>
    <div class="form">
      <div class="field"><label for="ap-atiende">Persona que atiende la visita *</label><input id="ap-atiende" [value]="e.atiende" [disabled]="!ed()" (input)="texto('atiende', $event)"></div>
      <div class="field"><label for="ap-hora">Hora de inicio</label><input id="ap-hora" type="time" [value]="e.hora" [disabled]="!ed()" (input)="texto('hora', $event)"></div>
      <div class="field full"><label id="ap-orden">Orden de las fases de campo (5.4)</label>
        <div class="radio-row" role="radiogroup" aria-labelledby="ap-orden">
          <label><input type="radio" name="orden" value="MBR" [checked]="e.orden === 'MBR'" [disabled]="!ed()" (change)="orden('MBR')"> Primero recursos (MBR), luego animal (MBA)</label>
          <label><input type="radio" name="orden" value="MBA" [checked]="e.orden === 'MBA'" [disabled]="!ed()" (change)="orden('MBA')"> Primero animal (MBA), luego recursos (MBR)</label></div>
        <span class="hint">Se recomienda iniciar por MBA cuando el manejo de las aves en los recursos pueda alterar su comportamiento (jadeo, amontonamiento).</span></div>
      <div class="field full"><label class="check"><input type="checkbox" [checked]="e.consent" [disabled]="!ed()" (change)="consentimiento($event)"> El productor autoriza la visita y el registro de evidencias fotográficas (tratamiento de datos, Ley 1581 de 2012).</label></div>
    </div></div>
  <div class="card"><h3>Inventario a la fecha de la visita</h3><p class="tiny muted">Copia del inventario de la unidad productiva: los cambios posteriores no alteran esta evaluación.</p>
    <div class="table-wrap"><table><tr><th>Galpón / corral</th><th>Grupo etario</th><th class="num">Edad</th><th class="num">Área m²</th><th class="num">Aves</th></tr>
      @for (g of e.inv; track g.cod) { <tr><td>{{ g.cod }}</td><td>{{ g.grupo }}</td><td class="num">{{ g.edad }} {{ g.unidad }}</td><td class="num">{{ m.int(g.area) }}</td><td class="num">{{ m.int(g.aves) }}</td></tr> }</table></div>
    @if (ed() && e.estado === "BORRADOR") {
      @if (error()) { <div class="alert err" role="alert" style="margin-top:12px">Registre quién atiende la visita y el consentimiento.</div> }
      <div class="btn-row" style="margin-top:12px"><button type="button" class="btn" (click)="iniciar()">Iniciar evaluación en campo</button></div> }
  </div>`
})
export class EvApertura {
  store = inject(StoreService); private svc = inject(EvaluacionesService); private router = inject(Router); m: any = M;
  ev = input.required<any>(); ed = input(false);
  error = signal(false);
  u = computed(() => M.unidadById(this.ev().unidad));
  previas = computed(() => (this.store.v(), M.unitSnaps(this.u().id).filter((s: any) => s.codigo !== this.ev().codigo && s.fecha <= this.ev().fecha)));
  texto(f: string, e: Event) { this.ev()[f] = (e.target as HTMLInputElement).value; this.svc.guardado(this.ev(), false); }
  consentimiento(e: Event) { this.ev().consent = (e.target as HTMLInputElement).checked; this.svc.guardado(this.ev(), false); this.error.set(false); }
  orden(o: string) { this.svc.cambioOrden(this.ev(), o); }
  async iniciar() {
    const e = this.ev();
    if (!String(e.atiende).trim() || !e.consent) { this.error.set(true); return; }
    await this.svc.iniciar(e); this.router.navigate(["/evaluacion", e.id, "muestreo"]);
  }
}

/* ------------------------------------------------------------------ Plan de muestreo y galpones */
@Component({
  selector: "pv-ev-muestreo", imports: [MotivoModal, GalponPlano], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v(); @let e = ev(); @let un = u();
  @if (e.cap === "II") {
    <div class="card"><h2>Grupos de aves y muestreo · traspatio (numeral 11)</h2>
      <p class="muted small">En la misma visita se evalúan todos los corrales y todos los grupos de aves del predio. Cada indicador se aplica al grupo que indica la Tabla 35 y el resultado final es uno solo para el predio (5.3).</p>
      <div class="table-wrap"><table><tr><th>Grupo</th><th>Corral / lugar</th><th class="num">Aves</th><th>Regla del numeral 11</th><th class="num">Puntos</th><th class="num">Aves a inspeccionar</th><th class="num">Bebederos</th><th class="num">Comederos</th></tr>
        @for (G of e.grupos; track G.id) {
          <tr><td>{{ G.ico }} <b>{{ m.capi(G.lab) }}</b></td><td>{{ G.corrales.join(", ") }}@if (!G.corral) { <span class="tag t-warn">sin corral</span> }</td><td class="num">{{ G.n }}</td>
            <td class="small">{{ G.corral ? (G.n < 15 ? "Menos de 15 aves: se evalúan todas" : "1 punto por cada 15 aves · 1 a 2 aves por punto") : "Sin corral: mínimo 10 aves (todas si hay menos)" }}</td>
            <td class="num">{{ G.corral ? G.puntos : "—" }}</td><td class="num"><b>{{ G.aves }}</b></td><td class="num">{{ G.beb }}</td><td class="num">{{ G.com }}</td></tr> }</table></div>
      <ul class="list-clean small" style="margin-top:10px"><li>Se priorizan las aves de mayor edad.</li><li>Se evalúan todos los recursos del grupo (bebederos, comederos, nidales, sombra), dentro o fuera del corral.</li>
        <li>Sin corral, partículas en el aire (13.1) se califica con 2 puntos y confort térmico (13.5) no se mide.</li></ul>
      <div class="alert info">Pesos del capítulo II: MBA {{ pesos.II.MBA }} % · MBR {{ pesos.II.MBR }} %. No se evalúan medidas de gestión (MBG).</div></div>
  } @else {
    <div class="card"><h2>Selección del galpón (Tabla 3)</h2>
      <div class="alert info">Capacidad instalada <b>{{ m.int(un.capacidad) }}</b> aves → @if (un.capacidad > 50000) { más de 50.000: inspeccionar hasta <b>2 galpones</b> } @else { menos de 50.000: inspeccionar <b>1 galpón</b> }.<br>
        El sistema sugiere el galpón con este criterio, en orden: 1) incumplimientos en la evaluación anterior, 2) aves de mayor edad, 3) más aves. El inspector lo puede cambiar indicando el motivo.</div>
      <div class="table-wrap"><table><tr><th><span class="sr-only">Evaluar</span></th><th>Galpón</th><th>Tipo</th><th class="num">Aves</th><th>Edad</th><th>Criterio</th></tr>
        @for (x of filas(); track x.cod) {
          <tr [class.gal-sug]="x.sug"><td><input type="checkbox" [checked]="e.galpones.includes(x.cod)" [disabled]="!ed()" [attr.aria-label]="'Evaluar galpón ' + x.cod" (change)="marcar(x.cod, $event)"></td>
            <td><b>{{ x.cod }}</b></td><td>{{ x.g.tipo ? tipos[x.g.tipo][0] : "—" }}</td><td class="num">{{ m.int(x.g.aves) }}</td><td>{{ x.g.edad }} {{ x.g.unidad }}</td>
            <td class="small">@if (x.sug) { <span class="tag t-ok">Sugerido</span> } @else { {{ x.orden }}.º · } {{ x.motivo }}</td></tr> }</table></div>
      @if (cambio()) { <div class="alert warn" style="margin-top:8px">Se evalúa un galpón distinto al sugerido ({{ e.galSug.join(", ") }}). Motivo: <b>{{ e.galMotivo || "—" }}</b></div> }
      @else { <p class="tiny muted">{{ max() === 1 ? "Máximo 1 galpón: al marcar otro se reemplaza el anterior." : "Máximo 2 galpones: para cambiar uno, desmarque primero el que no va a evaluar." }}</p> }</div>
    <div class="card"><h2>Plan de muestreo (6.1)</h2><div class="grid g2"><div><pv-galpon-plano /></div><div>
      <ul class="list-clean">
        @if (e.sis === "PONEDORA_JAULA") { <li><b>Jaula:</b> en cada punto seleccionar 3 a 5 jaulas (nivel bajo, intermedio y alto) para observar de 10 a 20 aves en total.</li> }
        @else { <li><b>Piso:</b> en cada punto observar de 15 a 30 aves.</li> }
        <li>Recorrer los 9 puntos en el mismo orden para todas las medidas con muestreo.</li><li>Medidas sin muestreo (densidad, mortalidad, documentos) se toman una vez por galpón o por unidad productiva.</li>
        <li>Medidas en el animal: en cada punto se anota cuántas aves se revisaron y cuántas quedaron en 2, 1 y 0 puntos. Medidas en los recursos: cada casilla es la calificación del punto.</li></ul></div></div></div>
  }
  @if (pendiente()) {
    <pv-motivo-modal titulo="Cambiar el galpón sugerido" okTxt="Confirmar cambio" etiquetaDetalle="Detalle (opcional)" [minimo]="0" [campos]="campos" (confirmar)="confirmar($event)" (cerrar)="mantener()">
      <p>El sistema sugirió <b>{{ e.galSug.join(", ") }}</b>. Va a evaluar <b>{{ e.galpones.join(", ") }}</b>. Indique el motivo: queda en el acta y en el control de cambios. Cancelar mantiene el galpón sugerido.</p>
    </pv-motivo-modal>
  }`
})
export class EvMuestreo {
  store = inject(StoreService); private svc = inject(EvaluacionesService); m: any = M; tipos = TIPOS_GALPON as Record<string, [string, number]>;
  ev = input.required<any>(); ed = input(false);
  galponCambiado = output<string>();
  pendiente = signal<string[] | null>(null);
  get pesos() { return ctx.PARAMS.pesos; }
  campos = [{ id: "motivo", etiqueta: "Motivo", opciones: ["Riesgo o problema observado en campo", "El galpón sugerido no tiene aves o está en limpieza", "Solicitud de la coordinación", "Restricción de acceso o de bioseguridad", "Otro"] }];

  u = computed(() => M.unidadById(this.ev().unidad));
  max = computed(() => M.maxGalpones(this.u()));
  filas = computed(() => {
    this.store.v(); const u = this.u(), sug = M.sugerirGalpones(u, this.max()) as any[], sugC = sug.filter(x => x.sug).map(x => x.cod);
    return sug.map(x => ({ ...x, sug: sugC.includes(x.cod), g: this.ev().inv.find((y: any) => y.cod === x.cod) || u.galpones.find((y: any) => y.cod === x.cod) }));
  });
  cambio = computed(() => (this.store.v(), this.svc.difiereDelSugerido(this.ev())));

  marcar(cod: string, ev: Event) {
    const el = ev.target as HTMLInputElement, e = this.ev(), antes = e.galpones.slice(), marcado = el.checked;
    const aviso = this.svc.marcarGalpon(e, cod, marcado);
    if (aviso) { this.store.toast(aviso); el.checked = !marcado; return; }
    this.galponCambiado.emit(e.galpones[0]);
    if (!this.svc.difiereDelSugerido(e)) { this.svc.volvioAlSugerido(e); return; }
    this.pendiente.set(antes); this.store.touch();
  }
  confirmar(r: { valores: Record<string, string>; detalle: string }) {
    this.svc.confirmarCambioGalpon(this.ev(), r.valores["motivo"] + (r.detalle ? " · " + r.detalle : "")); this.pendiente.set(null);
  }
  mantener() {
    const antes = this.pendiente(); if (antes) { this.ev().galpones = antes; this.galponCambiado.emit(antes[0]); }
    this.pendiente.set(null); this.store.touch();
  }
}

/* ------------------------------------------------------------------ Revisión de completitud */
@Component({
  selector: "pv-ev-revision", imports: [Modal, NivelTag], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v(); @let e = ev(); @let rr = r();
  <div class="card"><h2>Revisión de completitud</h2>
    <div class="grid g3">@for (g of grupos(); track g) { <div class="kpi" [class.alt]="rr.grupos[g].hechos !== rr.grupos[g].n"><div class="v">{{ rr.grupos[g].hechos }}/{{ rr.grupos[g].n }}</div><div class="l">{{ m.GN[g] }}</div></div> }</div><br>
    @if (rr.faltan.length) {
      <div class="alert warn"><b>Faltan {{ rr.faltan.length }} indicadores:</b><br>
        @for (x of rr.faltan; track x.ind.id; let i = $index) { <a href="javascript:void 0" (click)="ir.emit(x.ind.g); $event.preventDefault()">{{ m.codeOf(x.ind) }} · {{ x.ind.n }}</a>@if (i < rr.faltan.length - 1) { &nbsp;·&nbsp; } }</div>
    } @else { <div class="alert ok">Todos los indicadores aplicables están registrados.</div> }
    @if (sinEvidencia()) { <div class="alert err">MBG-09 exige adjuntar evidencia (certificados o matrícula).</div> }
    @if (!e.consent) { <div class="alert err">Falta registrar el consentimiento en la apertura.</div> }
    @if (pendientes().length) { <div class="alert info">Documentos pendientes: {{ pendientes().join(", ") }}. Quedan como pendientes en el tablero del productor.</div> }
    <div class="field"><label for="rv-obs">Observaciones generales de la visita</label><textarea id="rv-obs" rows="3" [value]="e.obsGen" [disabled]="!ed()" (input)="obs($event)"></textarea></div>
    @if (ed()) { <div class="btn-row" style="margin-top:12px"><button type="button" class="btn" [disabled]="!listo()" (click)="confirmando.set(true)">Finalizar evaluación y calcular resultado</button>
      @if (!listo()) { <span class="hint">Complete lo pendiente para finalizar.</span> }</div> }
  </div>
  @if (confirmando()) {
    <pv-modal titulo="Finalizar evaluación" (cerrar)="confirmando.set(false)">
      <p>Al finalizar, el resultado se calcula y la evaluación ya no se puede editar.</p>
      <div class="score"><div class="big">{{ m.fmt(rr.total) }} %</div><pv-nivel [pct]="rr.total" /></div>
      <p class="small">{{ rr.criticos.length }} incumplimiento(s) (&lt; 50 %). Los pendientes de la calificación anterior se verifican automáticamente.</p>
      <ng-container pie><button class="btn sec" type="button" (click)="confirmando.set(false)">Cancelar</button><button class="btn" type="button" (click)="finalizar()">Finalizar</button></ng-container>
    </pv-modal>
  }`
})
export class EvRevision {
  store = inject(StoreService); private svc = inject(EvaluacionesService); private router = inject(Router); m: any = M;
  ev = input.required<any>(); ed = input(false); ir = output<string>();
  confirmando = signal(false);
  r = computed<any>(() => (this.store.v(), M.resultado(this.ev())));
  grupos = computed(() => ["MBA", "MBR", "MBG"].filter(g => this.r().grupos[g].peso));
  sinEvidencia = computed(() => { this.store.v(); const e = this.ev(), i = M.indById("MBG-09"); return e.cap === "I" && M.applies(i, e) && !M.getR(e, "U", i).file; });
  pendientes = computed(() => this.r().inds.filter((x: any) => x.ind.g === "MBG" && M.getR(this.ev(), "U", x.ind).doc === "PENDIENTE").map((x: any) => M.codeOf(x.ind)));
  listo = computed(() => !this.r().faltan.length && !this.sinEvidencia() && this.ev().consent);
  obs(e: Event) { this.ev().obsGen = (e.target as HTMLTextAreaElement).value; this.svc.guardado(this.ev(), false); }
  async finalizar() { const e = this.ev(); this.confirmando.set(false); await this.svc.finalizar(e); this.router.navigate(["/evaluacion", e.id, "resultado"]); }
}
