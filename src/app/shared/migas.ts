import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { Router, RouterLink, UrlTree } from "@angular/router";
import { StoreService } from "../core/services/store.service";
import * as M from "../core/engine/motor";

/** Destino del botón «Volver» en el flujo de evaluación: la unidad, el inicio o la lista, según de dónde llegó la persona. */
export function volverDe(router: Router, uid: number): { url: UrlTree; txt: string; unidad: boolean } {
  const v = M.volverEval(uid);
  return { url: router.parseUrl(String(v.href).slice(1)), txt: v.txt, unidad: !!v.unidad };
}

/** Migas de pan del flujo de evaluación (Unidades › Unidad › cola, o Evaluaciones › cola). */
@Component({
  selector: "pv-migas", imports: [RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let v = volver();
    @if (v.unidad) { <a routerLink="/unidades">Unidades productivas</a> › <a [routerLink]="v.url">{{ nombre() }}</a> › {{ cola() }} }
    @else { <a routerLink="/evaluaciones">Evaluaciones</a> › {{ cola() }} }`
})
export class Migas {
  private store = inject(StoreService); private router = inject(Router);
  uid = input.required<number>(); cola = input.required<string>();
  volver = computed(() => (this.store.v(), volverDe(this.router, this.uid())));
  nombre = computed(() => M.unidadById(this.uid())?.nombre ?? "");
}
