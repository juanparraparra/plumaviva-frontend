import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { map } from "rxjs";
import { StoreService } from "../../core/services/store.service";
import { EvaluacionesService } from "../../core/services/evaluaciones.service";
import { ctx } from "../../core/engine/contexto";
import * as M from "../../core/engine/motor";
import { SISTEMAS } from "../../core/data/norma/catalogos";
import { EST_LAB } from "../../core/engine/tablas";
import { Migas, volverDe } from "../../shared/migas";
import { AnularEvaluacion } from "../../shared/anular-evaluacion";
import { NivelTag } from "../../shared/ui";

/** Programar una evaluación: la lista de chequeo depende del sistema productivo y cada unidad tiene una sola evaluación abierta. */
@Component({
  selector: "pv-evaluacion-nueva", imports: [RouterLink, Migas, AnularEvaluacion, NivelTag], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v();
  <div class="page-head"><div><div class="crumbs">@if (u()) { <pv-migas [uid]="u().id" cola="Nueva" /> }</div><h1>Programar evaluación</h1>
    <p class="muted">La lista de chequeo se carga según el sistema productivo. Cada unidad productiva tiene una sola evaluación abierta a la vez.</p></div>
    <a class="btn sec" [routerLink]="volver().url">{{ volver().txt }}</a></div>
  @if (!unidades().length) {
    <div class="card"><div class="alert warn">No hay unidades productivas activas disponibles para programar una evaluación.</div></div>
  } @else {
  <div class="card"><form class="form" (submit)="crear($event)">
    <div class="field"><label for="en-u">Unidad productiva *</label>
      <select id="en-u" (change)="unidad.set(+$any($event.target).value); sis.set('')">@for (x of unidades(); track x.id) { <option [value]="x.id" [selected]="x.id === u().id">{{ x.nombre }} · {{ x.mun }}</option> }</select></div>
    <div class="field"><label for="en-s">Sistema productivo a evaluar *</label>
      <select id="en-s" (change)="sis.set($any($event.target).value)">@for (o of sistemas(); track o[0]) { <option [value]="o[0]" [selected]="o[0] === sisEf()">{{ o[1] }}</option> }</select></div>
    <div class="field"><label for="en-i">Inspector asignado *</label>
      <select id="en-i" (change)="insp.set(+$any($event.target).value)">@for (x of inspectores(); track x.id) { <option [value]="x.id" [selected]="x.id === inspEf()">{{ m.fullName(x) }}</option> }</select></div>
    <div class="field"><label for="en-f">Fecha de la visita *</label><input id="en-f" type="date" [value]="fecha()" (input)="fecha.set($any($event.target).value)"></div>
    <div class="field"><label for="en-h">Hora</label><input id="en-h" type="time" [value]="hora()" (input)="hora.set($any($event.target).value)"></div>
    <div class="field"><label for="en-o">Orden de las fases (5.4)</label>
      <select id="en-o" (change)="orden.set($any($event.target).value)"><option value="MBR" [selected]="orden() === 'MBR'">Recursos (MBR) y luego animal (MBA)</option><option value="MBA" [selected]="orden() === 'MBA'">Animal (MBA) y luego recursos (MBR)</option></select>
      <span class="hint">Las fases II y III se pueden invertir según las condiciones del día.</span></div>

    <div class="field full">
      @if (ab(); as a) {
        <div class="alert err"><b>{{ u().nombre }}</b> ya tiene una evaluación abierta: <b>{{ a.codigo }}</b> · {{ estLab[a.estado] }} · visita {{ a.fecha }} · {{ av().h }} de {{ av().n }} indicadores registrados@if (m.vencida(a)) { · <b>vencida</b> }.<br>
          Una unidad solo puede tener una evaluación abierta. Continúe esa evaluación (se retoma donde quedó, con lo ya registrado) o anúlela con un motivo antes de programar una nueva.
          <div class="btn-row" style="margin-top:8px"><a class="btn sm" [routerLink]="['/evaluacion', a.id]">{{ m.canEdit(a) ? "Continuar" : "Ver" }} {{ a.codigo }}</a>
            @if (puedeAnular()) { <button type="button" class="btn danger sm" (click)="anulando.set(true)">Anular {{ a.codigo }}</button> }</div></div>
      } @else {
        <div class="alert info"><b>{{ m.tipoPredio(u()) }}</b> · {{ m.int(m.totalAves(u())) }} aves · capacidad {{ m.int(u().capacidad) }}.<br>
          Lista de chequeo: <b>{{ lista[cap()] }}</b> · pesos @for (p of pesos(); track p[0]; let i = $index) { {{ p[0] }} {{ p[1] }} %@if (i < pesos().length - 1) { · } }.
          @if (cap() === "I") { <br>Tabla 3: {{ u().capacidad > 50000 ? "más de 50.000 aves → hasta 2 galpones" : "menos de 50.000 aves → 1 galpón" }} por inspeccionar. Galpón sugerido: <b>{{ sugeridos() }}</b> ({{ motivos() }}); el inspector lo puede cambiar con motivo. }
          @else { <br>Numeral 11: se evalúan todos los corrales y todos los grupos de aves en la misma visita; el resultado es único para el predio (5.3). }
          @if (ultima(); as l) { <div style="margin-top:8px">Última evaluación: <b>{{ m.fmt(l.total) }} %</b> <pv-nivel [pct]="l.total" /> ({{ l.codigo }} · {{ l.fecha }}). Sus {{ m.hallazgosOf(l).length }} puntos de atención se mostrarán como referencia en la apertura de la visita. <a [routerLink]="['/unidades', u().id]">Ver resumen de la unidad</a></div> }
          @else { <div style="margin-top:8px">Sin evaluaciones previas: esta evaluación será la línea base de la unidad.</div> }</div>
      }
    </div>
    @if (error()) { <div class="field full"><div class="alert err" role="alert">{{ error() }}</div></div> }
    <div class="field full"><div class="btn-row"><a class="btn sec" routerLink="/evaluaciones">Cancelar</a><button class="btn" type="submit" [disabled]="!!ab()">Crear evaluación</button></div></div>
  </form></div>
  @if (anulando() && ab()) { <pv-anular-evaluacion [ev]="ab()" (cerrar)="anulando.set(false)" (anulada)="anulando.set(false)" /> }
  }`
})
export class EvaluacionNueva {
  store = inject(StoreService); private svc = inject(EvaluacionesService); private router = inject(Router); private ruta = inject(ActivatedRoute);
  m: any = M; estLab = EST_LAB as Record<string, string>;
  get lista() { return ctx.PARAMS.lista; }

  private uParam = toSignal(this.ruta.queryParamMap.pipe(map(p => Number(p.get("u")) || 0)), { initialValue: 0 });
  unidad = signal(0); sis = signal(""); insp = signal(0); orden = signal("MBR"); hora = signal("08:00"); fecha = signal(M.today());
  error = signal(""); anulando = signal(false);

  unidades = computed(() => (this.store.v(), M.visibleUnidades().filter((x: any) => x.estado === "ACTIVA")));
  inspectores = computed(() => (this.store.v(), ctx.S.users.filter((x: any) => x.rol === "INSP" && x.estado === "ACTIVO")));
  u = computed<any>(() => { const l = this.unidades(), id = this.unidad() || this.uParam(); return l.find((x: any) => x.id === id) ?? l[0]; });
  inspEf = computed(() => this.insp() || (this.inspectores().find((x: any) => x.id === ctx.SES.id) ?? this.inspectores()[0])?.id);
  cap = computed(() => (M.totalAves(this.u()) >= 200 ? "I" : "II"));
  sistemas = computed<string[][]>(() => {
    const u = this.u(); if (!u) return [];
    return this.cap() === "II" ? [["TRAS", `Todos los grupos del traspatio (${M.buildGrupos(u).map((g: any) => g.lab).join(" y ")})`]]
      : u.especies.filter((e: any) => !e.sis.startsWith("TRAS")).map((e: any) => [e.sis, (SISTEMAS as Record<string, string>)[e.sis]]);
  });
  sisEf = computed(() => { const o = this.sistemas(); return o.some(x => x[0] === this.sis()) ? this.sis() : o[0]?.[0]; });
  ab = computed(() => (this.store.v(), this.u() ? M.evAbierta(this.u().id) : null));
  av = computed(() => (this.ab() ? M.avance(this.ab()) : { h: 0, n: 0 }));
  puedeAnular = computed(() => M.can("ADMIN", "COORD"));
  pesos = computed(() => Object.entries(M.pesosDe(this.cap())).filter(x => x[1]));
  private sug = computed(() => (this.cap() === "I" ? (M.sugerirGalpones(this.u()) as any[]).filter(x => x.sug) : []));
  sugeridos = computed(() => this.sug().map(x => x.cod).join(", ")); motivos = computed(() => this.sug().map(x => x.motivo).join(" / "));
  ultima = computed<any>(() => { const s = M.unitSnaps(this.u().id); return s[s.length - 1] ?? null; });
  volver = computed(() => (this.store.v(), volverDe(this.router, this.u()?.id)));

  constructor() { effect(() => { if (!M.hasPerm("Crear evaluaciones")) this.router.navigate(["/evaluaciones"]); }); }

  async crear(e: Event) {
    e.preventDefault();
    const u = this.u();
    if (M.evAbierta(u.id)) { this.error.set("La unidad ya tiene una evaluación abierta."); return; }
    if (!this.fecha()) { this.error.set("Indique la fecha de la visita."); return; }
    try {
      const ev = await this.svc.crear({ unidad: u.id, sis: this.sisEf(), insp: this.inspEf(), fecha: this.fecha(), hora: this.hora(), orden: this.orden() });
      this.router.navigate(["/evaluacion", ev.id, "apertura"]);
    } catch { /* el servicio ya mostró el mensaje */ }
  }
}
