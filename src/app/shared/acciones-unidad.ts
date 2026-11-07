import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { StoreService } from "../core/services/store.service";
import * as M from "../core/engine/motor";
import { ICONOS } from "./iconos";
import { planLink } from "./resumen";

/** Botón-icono con etiqueta accesible: enlace si recibe `ruta`, botón si no. */
@Component({
  selector: "pv-ia", imports: [RouterLink, NgTemplateOutlet], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (ruta()) { <a class="ia" [routerLink]="ruta()" [queryParams]="consulta()" [attr.data-tip]="tip()" [attr.aria-label]="tip()"><ng-container *ngTemplateOutlet="icono" /></a> }
    @else { <button type="button" class="ia" [attr.data-tip]="tip()" [attr.aria-label]="tip()" (click)="pulsar.emit()"><ng-container *ngTemplateOutlet="icono" /></button> }
    <ng-template #icono><svg viewBox="0 0 24 24" aria-hidden="true">@for (t of trazos(); track $index) { @if (t.d) { <path [attr.d]="t.d" /> } @else { <circle [attr.cx]="t.cx" [attr.cy]="t.cy" [attr.r]="t.r" /> } }</svg></ng-template>`
})
export class IconoAccion {
  tipo = input.required<string>(); tip = input.required<string>(); ruta = input<any[] | null>(null); consulta = input<Record<string, any> | null>(null);
  pulsar = output<void>();
  trazos = computed(() => ICONOS[this.tipo()] ?? []);
}

/** Iconos de acción de una unidad productiva según su estado y los permisos del perfil. */
@Component({
  selector: "pv-acciones-unidad", imports: [IconoAccion], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="ia-row">@for (a of acciones(); track a.tipo + a.tip) { <pv-ia [tipo]="a.tipo" [tip]="a.tip" [ruta]="a.ruta ?? null" [consulta]="a.consulta ?? null" /> }</div>`
})
export class AccionesUnidad {
  u = input.required<any>(); sinEditar = input(false); sinSeguir = input(false);
  private store = inject(StoreService);
  acciones = computed(() => {
    this.store.v();
    const u = this.u(), act = u.estado === "ACTIVA", sn = M.unitSnaps(u.id), last = sn[sn.length - 1], q = { u: u.id };
    const out: { tipo: string; tip: string; ruta?: any[]; consulta?: any }[] = [{ tipo: "ficha", tip: "Ver ficha", ruta: ["/unidades", u.id] }];
    if (!this.sinEditar() && act && M.can("ADMIN", "COORD", "INSP", "PROD") && M.hasPerm("Registrar o editar unidades")) out.push({ tipo: "editar", tip: "Editar unidad", ruta: ["/unidad-form", u.id] });
    out.push(...this.evaluar(u));
    if (last) out.push({ tipo: "plan", tip: "Plan de mejora", ruta: planLink(last) });
    if (!this.sinSeguir() && act && M.menuHas("seguimiento")) out.push({ tipo: "seguir", tip: "Seguimiento", ruta: ["/seguimiento"], consulta: q });
    return out;
  });
  private evaluar(u: any) {
    if (u.estado !== "ACTIVA") return [];
    const ab = M.evAbierta(u.id);
    if (ab && (M.canEdit(ab) || M.can("COORD", "ADMIN"))) return [{ tipo: "evaluar", tip: M.canEdit(ab) ? (ab.estado === "BORRADOR" ? "Iniciar evaluación programada" : "Retomar evaluación en curso") : "Ver evaluación en curso", ruta: ["/evaluacion", ab.id] }];
    if (!ab && M.hasPerm("Crear evaluaciones")) return [{ tipo: "evaluar", tip: "Nueva evaluación", ruta: ["/evaluacion-nueva"], consulta: { u: u.id } }];
    return [{ tipo: "evaluar", tip: "Evaluaciones de la unidad", ruta: ["/evaluaciones"], consulta: { u: u.id } }];
  }
}
