import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { map } from "rxjs";
import { StoreService } from "../../core/services/store.service";
import * as M from "../../core/engine/motor";
import { Migas, volverDe } from "../../shared/migas";
import { PlanMejora } from "../../shared/plan";
import { DetalleSnap } from "../../shared/resumen";
import { NivelTag } from "../../shared/ui";

/** Plan de mejora de una evaluación cerrada del histórico (no tiene visita en la plataforma). */
@Component({
  selector: "pv-plan-historico", imports: [RouterLink, Migas, PlanMejora, DetalleSnap, NivelTag], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v();
  @if (sn(); as s) {
    <div class="page-head no-print"><div><div class="crumbs"><pv-migas [uid]="s.unidad" [cola]="'Plan de mejora · ' + s.codigo" /></div><h1>Plan de mejora · {{ u().nombre }}</h1>
      <p class="muted">{{ s.codigo }} · {{ s.fecha }} · {{ s.sisLab }} · resultado <b>{{ m.fmt(s.total) }} %</b> <pv-nivel [pct]="s.total" /></p></div>
      <button type="button" class="btn sec" (click)="imprimir()">🖨 Imprimir</button></div>
    <div class="quickbar no-print"><a class="btn sec sm" [routerLink]="volver().url">{{ volver().txt }}</a>
      <button type="button" class="btn sec sm" (click)="detalle.set(true)">Ver detalle por indicador</button>
      @if (!volver().unidad && verUnidades()) { <a class="btn sec sm" [routerLink]="['/unidades', u().id]">Ver unidad productiva</a> }</div>
    <div class="card"><p class="muted small no-print">Recomendaciones informativas derivadas de esta evaluación: no tienen plazo ni son de cumplimiento obligatorio. {{ esUltima() ? "Es la evaluación más reciente de la unidad." : "Existe una evaluación más reciente: el resumen de la unidad se basa en ella." }}</p>
      <pv-plan [snap]="s" /></div>
    @if (detalle()) { <pv-detalle-snap [codigo]="s.codigo" (cerrar)="detalle.set(false)" /> }
  }`
})
export class PlanHistorico {
  store = inject(StoreService); private router = inject(Router); private ruta = inject(ActivatedRoute); m: any = M;
  private cod = toSignal(this.ruta.paramMap.pipe(map(p => decodeURIComponent(p.get("a") || ""))), { initialValue: "" });
  detalle = signal(false);
  sn = computed<any>(() => (this.store.v(), M.snapByCodigo(this.cod())));
  u = computed(() => M.unidadById(this.sn().unidad));
  verUnidades = computed(() => (this.store.v(), M.menuHas("unidades")));
  volver = computed(() => (this.store.v(), volverDe(this.router, this.sn().unidad)));
  esUltima = computed(() => { const a = M.unitSnaps(this.u().id); return !!a.length && a[a.length - 1].codigo === this.sn().codigo; });
  constructor() {
    effect(() => { const s = this.sn(); if (!s) this.router.navigate(["/evaluaciones"]); else if (s.src === "ev") this.router.navigate(["/evaluacion", s.id, "plan"], { replaceUrl: true }); });
  }
  imprimir() { window.print(); }
}
