import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { StoreService } from "../core/services/store.service";

@Component({
  selector: "pv-sin-permiso", imports: [RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="card"><h2>Sin permiso</h2><p>{{ store.denegado() || 'Su perfil no tiene acceso a esta sección.' }}</p><a class="btn sec" routerLink="/inicio">Volver al inicio</a></div>`
})
export class SinPermiso { store = inject(StoreService); }
