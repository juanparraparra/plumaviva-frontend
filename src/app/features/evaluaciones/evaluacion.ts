import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { map } from "rxjs";
import { StoreService } from "../../core/services/store.service";
import { EvaluacionesService } from "../../core/services/evaluaciones.service";
import { ctx } from "../../core/engine/contexto";
import * as M from "../../core/engine/motor";
import { Modal } from "../../shared/modal";
import { EstadoTag } from "../../shared/ui";
import { PlanMejora } from "../../shared/plan";
import { Migas, volverDe } from "../../shared/migas";
import { EvApertura, EvMuestreo, EvRevision } from "./ev-pasos";
import { EvFase } from "./ev-fase";
import { EvCierre, EvResultado } from "./ev-informe";

const FASES = ["MBR", "MBA", "MBG"];

/** Asistente de evaluación: apertura → muestreo → fases → revisión → resultado → plan → acta. Equivale a vEval()/renderEval(). */
@Component({
  selector: "pv-evaluacion",
  imports: [RouterLink, Modal, EstadoTag, PlanMejora, Migas, EvApertura, EvMuestreo, EvFase, EvRevision, EvResultado, EvCierre],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v(); @let _ui = sync();
  @if (ev(); as e) {
    @let un = u();
    @if (soloResultado() && !fin()) {
      <div class="card"><h2>{{ e.codigo }}</h2><p>La evaluación está {{ estLab(e.estado).toLowerCase() }}. El resultado estará disponible cuando el inspector la finalice.</p><a class="btn sec" routerLink="/evaluaciones">Volver</a></div>
    } @else {
      <div class="page-head no-print"><div><div class="crumbs"><pv-migas [uid]="e.unidad" [cola]="e.codigo" /></div><h1>{{ un.nombre }}</h1>
        <p class="muted">{{ m.sisLabel(e) }} · Capítulo {{ e.cap }} · {{ lista[e.cap] }}</p></div></div>

      <div class="quickbar no-print"><a class="btn sec sm" [routerLink]="volver().url">{{ volver().txt }}</a>
        @if (!volver().unidad && verUnidades()) { <a class="btn sec sm" [routerLink]="['/unidades', un.id]">Ver unidad productiva</a> }
        @if (fin() && externo()) { <span style="flex:1"></span>
          <div class="viewsw">@for (v of vistas; track v[0]) { <a [class.on]="paso() === v[0]" [routerLink]="['/evaluacion', e.id, v[0]]">{{ v[1] }}</a> }</div> }
      </div>

      @if (!externo()) {
        <div class="statusbar"><pv-estado [estado]="e.estado" /><span>Inspector: <b>{{ m.fullName(m.userById(e.insp)) }}</b></span><span>Visita: {{ e.fecha }} {{ e.hora }}</span>
          @if (abierta()) { <span>Avance: <b>{{ av().h }}/{{ av().n }}</b> indicadores</span> }
          <span class="muted" aria-live="polite">{{ e.saved ? "✓ Guardado automáticamente " + e.saved : "Sin cambios" }}</span><span style="flex:1"></span>
          @if (!ed() && abierta()) { <span class="tag t-gray">Solo lectura</span> }
          @if (ed() && e.estado === "EN_PROCESO" && store.modoDemo) { <button type="button" class="btn ghost sm" title="Ayuda para la presentación" (click)="svc.demo(e)">⚡ Demo: completar valores</button> }
        </div>
      }
      @if (e.estado === "ANULADA" && e.anulada) { <div class="alert err no-print">Evaluación anulada el {{ e.anulada.fecha }} por {{ e.anulada.por }}: {{ e.anulada.motivo }}. Se conserva para la trazabilidad y no cuenta en los resultados.</div> }
      @if (m.vencida(e)) { <div class="alert warn no-print">Esta evaluación lleva más de {{ params.diasCierre }} días abierta desde la visita ({{ e.fecha }}). Complete lo pendiente y finalícela; si la visita no se puede completar, la coordinación la anula con el motivo.</div> }
      @if (ses.rol === "ADMIN" && e.insp !== ses.id && ed()) { <div class="alert warn no-print">Está diligenciando como <b>Administrador</b> una evaluación asignada a <b>{{ m.fullName(m.userById(e.insp)) }}</b>. Las acciones quedan en el control de cambios y el inspector recibe la notificación al finalizar.</div> }

      @if (!externo()) {
        <div class="steps" role="tablist" aria-label="Fases de la evaluación">
          @for (s of pasos(); track s[0]) {
            <div class="step" role="tab" tabindex="0" [class.on]="s[0] === paso()" [class.done]="s[0] !== paso() && hecho(s[0])" [attr.aria-selected]="s[0] === paso()" (click)="ir(s[0])" (keydown.enter)="ir(s[0])" (keydown.space)="ir(s[0]); $event.preventDefault()">
              <b>{{ s[1] }}</b><span>{{ s[2] }}@if (fases.includes(s[0])) { · {{ rr().grupos[s[0]].hechos }}/{{ rr().grupos[s[0]].n }} }</span></div>
          }
        </div>
      }

      @switch (paso()) {
        @case ("apertura") { <pv-ev-apertura [ev]="e" [ed]="ed()" /> }
        @case ("muestreo") { <pv-ev-muestreo [ev]="e" [ed]="ed()" (galponCambiado)="gk.set($event)" /> }
        @case ("revision") { <pv-ev-revision [ev]="e" [ed]="ed()" (ir)="ir($event)" /> }
        @case ("resultado") { <pv-ev-resultado [ev]="e" /> }
        @case ("cierre") { <pv-ev-cierre [ev]="e" /> }
        @case ("plan") {
          <div class="card"><div class="card-head"><h2>Plan de mejora · {{ e.codigo }}</h2><button type="button" class="btn sec sm no-print" (click)="imprimir()">🖨 Imprimir</button></div>
            <p class="muted small no-print">Recomendaciones informativas generadas con el resultado de esta evaluación ({{ m.fmt(snap().total) }} %). No tienen plazo ni son de cumplimiento obligatorio. {{ esUltima() ? "Es la evaluación más reciente de la unidad." : "Existe una evaluación más reciente: el resumen de la unidad se basa en ella." }}</p>
            <pv-plan [snap]="snap()" /></div>
        }
        @default { <pv-ev-fase [ev]="e" [g]="paso()" [ed]="ed()" [gk]="gkAct()" (galpon)="gk.set($event)" /> }
      }

      @if (!externo()) {
        <div class="btn-row no-print" style="justify-content:space-between;margin-top:6px">
          @if (previo(); as p) { <button type="button" class="btn sec" (click)="ir(p[0])">← Anterior · {{ etq(p) }}</button> } @else { <span></span> }
          @if (siguiente(); as n) { @if (puedeSeguir()) { <button type="button" class="btn" (click)="ir(n[0])">Siguiente · {{ etq(n) }} →</button> } }
          @else { <a class="btn" [routerLink]="volver().url">{{ volver().txt.replace("← V", "V") }}</a> }
        </div>
      }

      @if (bloqueo(); as b) {
        <pv-modal titulo="Falta evaluar todos los galpones seleccionados" (cerrar)="bloqueo.set(null)">
          <div class="alert warn"><b>{{ un.nombre }}</b> supera las 50.000 aves: se evalúan <b>{{ e.galpones.length }} galpones</b> ({{ e.galpones.join(" y ") }}). Antes de pasar a la siguiente fase debe terminar de evaluar <b>todos</b> los galpones seleccionados.</div>
          <p class="small" style="margin-top:10px">Pendiente en <b>{{ b.st[1] }} · {{ b.st[2] }}</b>:</p>
          <ul class="list-clean">@for (x of b.pend; track x.k) { <li><b>Galpón {{ x.k }}</b>: faltan {{ x.falta }} de {{ x.n }} indicadores por registrar.</li> }</ul>
          <ng-container pie><button class="btn sec" type="button" (click)="bloqueo.set(null)">Cerrar</button>
            @for (x of b.pend; track x.k) { <button class="btn" type="button" (click)="irGalpon(x.k, b.g)">Ir al galpón {{ x.k }}</button> }</ng-container>
        </pv-modal>
      }
    }
  }`
})
export class Evaluacion {
  store = inject(StoreService); svc = inject(EvaluacionesService); private router = inject(Router); private ruta = inject(ActivatedRoute);
  m: any = M; fases = FASES; vistas = [["resultado", "Resultado"], ["plan", "Plan de mejora"], ["cierre", "Acta"]];
  get ses() { return ctx.SES; } get params() { return ctx.PARAMS; } get lista() { return ctx.PARAMS.lista; }
  estLab = (e: string) => (M.EST_LAB as Record<string, string>)[e];

  private id = toSignal(this.ruta.paramMap.pipe(map(p => Number(p.get("a")))), { initialValue: 0 });
  private pasoRuta = toSignal(this.ruta.paramMap.pipe(map(p => p.get("paso") || "")), { initialValue: "" });
  gk = signal("");
  bloqueo = signal<any>(null);

  ev = computed<any>(() => (this.store.v(), M.evById(this.id())));
  u = computed(() => M.unidadById(this.ev().unidad));
  fin = computed(() => (this.store.v(), ["FINALIZADA", "VALIDADA"].includes(this.ev()?.estado)));
  abierta = computed(() => M.ABIERTA.includes(this.ev().estado));
  externo = computed(() => ["PROD", "TEN", "RT"].includes(this.ses.rol));
  soloResultado = computed(() => ["PROD", "TEN", "RT", "CONS"].includes(this.ses.rol));
  ed = computed(() => (this.store.v(), M.canEdit(this.ev())));
  verUnidades = computed(() => (this.store.v(), M.menuHas("unidades")));
  volver = computed(() => (this.store.v(), volverDe(this.router, this.ev().unidad)));

  /** Fase activa tras aplicar las reglas de acceso (igual que vEval). */
  paso = computed(() => {
    let p = this.pasoRuta();
    if (!p) p = this.fin() ? "resultado" : "apertura";
    if ((p === "plan" || p === "resultado") && !this.fin()) p = "apertura";
    if (["PROD", "TEN", "RT"].includes(this.ses.rol) && !["resultado", "plan", "cierre"].includes(p)) p = "resultado";
    return p;
  });
  gkAct = computed(() => { const e = this.ev(); return e.galpones.includes(this.gk()) ? this.gk() : e.galpones[0]; });
  /** El motor lee el galpón y la evaluación activos desde ctx.ui.EV: se mantiene sincronizado antes de dibujar. */
  sync() { const e = this.ev(); if (e) ctx.ui.EV = { id: e.id, paso: this.paso(), gk: this.gkAct() }; return 0; }

  rr = computed<any>(() => (this.store.v(), M.resultado(this.ev())));
  av = computed(() => (this.store.v(), M.avance(this.ev())));
  pasos = computed<string[][]>(() => (this.store.v(), M.stepsOf(this.ev())));
  snap = computed<any>(() => (this.store.v(), M.snapOfEv(this.ev())));
  esUltima = computed(() => { const a = M.unitSnaps(this.ev().unidad); return !!a.length && a[a.length - 1].codigo === this.ev().codigo; });
  idx = computed(() => this.pasos().findIndex(s => s[0] === this.paso()));
  previo = computed(() => this.pasos()[this.idx() - 1] ?? null);
  siguiente = computed(() => this.pasos()[this.idx() + 1] ?? null);
  puedeSeguir = computed(() => { const n = this.siguiente(), e = this.ev(); return !!n && !(n[0] === "resultado" && !this.fin()) && !(this.paso() === "apertura" && e.estado === "BORRADOR"); });
  etq = (s: string[]) => (s[1] === s[2] ? s[1] : `${s[1]} · ${s[2]}`);

  constructor() { effect(() => { if (this.store.v() >= 0 && this.id() && !this.ev()) this.router.navigate(["/evaluaciones"]); }); }

  hecho(k: string): boolean {
    const e = this.ev(), r = this.rr();
    return k === "apertura" ? e.estado !== "BORRADOR" : k === "muestreo" ? e.estado !== "BORRADOR" && e.galpones.length > 0 : FASES.includes(k) ? r.grupos[k].hechos === r.grupos[k].n : this.fin();
  }
  /** Cambio de fase: con dos galpones no se avanza sin completar ambos (Tabla 3). */
  ir(k: string) {
    const b = M.bloqueoFase(this.ev(), this.paso(), k);
    if (b) { this.bloqueo.set(b); return; }
    this.router.navigate(["/evaluacion", this.ev().id, k]);
  }
  irGalpon(k: string, g: string) { this.bloqueo.set(null); this.gk.set(k); if (this.paso() !== g) this.router.navigate(["/evaluacion", this.ev().id, g]); else this.store.touch(); }
  imprimir() { window.print(); }
}
