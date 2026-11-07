import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { StoreService } from "../../core/services/store.service";
import * as M from "../../core/engine/motor";
import { AccionesUnidad } from "../../shared/acciones-unidad";

@Component({
  selector: "pv-unidades-lista", imports: [FormsModule, RouterLink, AccionesUnidad], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="page-head"><div><div class="crumbs">Operación</div><h1>Unidades productivas</h1><p class="muted">Registro, ubicación, especies e inventario.</p></div>
    @if (puedeCrear()) { <a class="btn" routerLink="/unidad-form">+ Nueva unidad productiva</a> }</div>
  <div class="card"><div class="form" style="grid-template-columns:2fr 1fr">
    <div class="field"><label for="pQ">Buscar</label><input id="pQ" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="Nombre, municipio o propietario"></div>
    <div class="field"><label for="pT">Tipo de predio</label><select id="pT" [ngModel]="tipo()" (ngModelChange)="tipo.set($event)"><option value="">Todos</option><option>Granja</option><option>Traspatio</option></select></div></div></div>
  <div class="card"><div class="table-wrap"><table><tr><th>Unidad productiva</th><th>Ubicación</th><th>Tipo de predio</th><th class="num">Aves</th><th>Estado</th><th class="num">Acciones</th></tr>
    @for (u of lista(); track u.id) {
      <tr><td><b>{{ u.nombre }}</b><div class="tiny muted">{{ m.fullName(m.userById(u.propietario)) }}</div></td>
        <td>{{ u.mun }}, {{ u.depto }}<div class="tiny muted">{{ u.vereda }}</div></td>
        <td><span class="tag" [class]="m.totalAves(u) >= 200 ? 'tag t-ok' : 'tag t-info'">{{ m.tipoPredio(u) }}</span></td>
        <td class="num">{{ m.int(m.totalAves(u)) }}</td>
        <td><span class="tag" [class]="u.estado === 'ACTIVA' ? 'tag t-ok' : 'tag t-err'">{{ m.estU(u) }}</span>@if (u.estado !== 'ACTIVA' && u.inhab) { <div class="tiny muted">{{ u.inhab.tipo }} · {{ u.inhab.motivo }}</div> }</td>
        <td class="num"><pv-acciones-unidad [u]="u" /></td></tr>
    } @empty { <tr><td colspan="6" class="muted">Sin unidades productivas.</td></tr> }
  </table></div></div>`
})
export class UnidadesLista {
  private store = inject(StoreService); m: any = M;
  q = signal(""); tipo = signal("");
  puedeCrear = computed(() => (this.store.v(), M.can("ADMIN", "COORD", "INSP", "PROD") && M.hasPerm("Registrar o editar unidades")));
  lista = computed(() => { this.store.v(); const q = this.q().toLowerCase();
    return M.visibleUnidades().filter((u: any) => (!q || (u.nombre + u.mun + M.fullName(M.userById(u.propietario))).toLowerCase().includes(q)) && (!this.tipo() || M.tipoPredio(u).startsWith(this.tipo()))); });
}
