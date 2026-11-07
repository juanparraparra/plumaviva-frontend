import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { StoreService } from "../../core/services/store.service";
import * as M from "../../core/engine/motor";

const MODS_CF = ["Usuarios", "Roles y permisos", "Unidades productivas", "Evaluaciones", "Parametrización", "Asistente IA", "Acceso", "Sistema"];

@Component({
  selector: "pv-auditoria", imports: [FormsModule], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="page-head"><div><div class="crumbs">Administración</div><h1>Control de cambios</h1><p class="muted">Registro inmodificable de quién cambió qué y cuándo, con lo que había antes y lo que quedó después.</p></div></div>
  <div class="card"><div class="form" style="grid-template-columns:2fr 1fr 1fr;align-items:end">
    <div class="field"><label>Buscar</label><input [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="Persona, registro, dato, valor o motivo"></div>
    <div class="field"><label>Módulo</label><select [ngModel]="mod()" (ngModelChange)="mod.set($event)"><option value="">Todos</option>@for (x of modulos(); track x) { <option>{{ x }}</option> }</select></div>
    <div class="field"><label>Acción</label><select [ngModel]="acc()" (ngModelChange)="acc.set($event)"><option value="">Todas</option>@for (x of acciones(); track x) { <option>{{ x }}</option> }</select></div></div>
    <label class="check" style="margin-top:8px"><input type="checkbox" [ngModel]="sesiones()" (ngModelChange)="cambiarSesiones($event)"> Incluir inicios y cierres de sesión</label>
    <p class="tiny muted" style="margin:6px 0 0">{{ lista().length }} registro(s). Los valores muestran el dato como estaba antes del cambio y como quedó después.</p></div>
  <div class="card"><div class="table-wrap"><table class="cf"><tr><th>Fecha y hora</th><th>Quién</th><th>Módulo</th><th>Acción</th><th>Registro afectado</th><th>Dato</th><th>Antes (lo que tenía)</th><th>Después (lo que quedó)</th><th>Motivo</th></tr>
    @for (a of lista(); track $index) {
      @let det = a.det && a.det.length ? a.det : [null];
      @for (d of det; track $index; let i = $index) {
        <tr [class.first]="i === 0">
          @if (i === 0) {
            <td [attr.rowspan]="det.length" style="white-space:nowrap">{{ a.t }}</td>
            <td [attr.rowspan]="det.length" style="min-width:150px"><b>{{ a.up || '—' }}</b><div class="tiny muted">{{ rol(a) }}</div></td>
            <td [attr.rowspan]="det.length"><span class="tag t-info">{{ a.m }}</span></td><td [attr.rowspan]="det.length"><b>{{ a.a }}</b></td><td [attr.rowspan]="det.length">{{ a.o }}</td>
          }
          <td class="small">{{ d ? d.c : '—' }}</td><td class="cf-antes">{{ d ? d.a : '—' }}</td><td class="cf-desp">{{ d ? d.d : '—' }}</td>
          @if (i === 0) { <td [attr.rowspan]="det.length" class="small">@if (a.mot) { {{ a.mot }} } @else { <span class="muted">—</span> }</td> }
        </tr>
      }
    } @empty { <tr><td colspan="9" class="muted">No hay registros con estos filtros.</td></tr> }
  </table></div></div>`
})
export class Auditoria {
  private store = inject(StoreService);
  q = signal(""); mod = signal(""); acc = signal(""); sesiones = signal(false);
  base = computed(() => { this.store.v(); return this.store.S.audit.filter((a: any) => this.sesiones() || a.m !== "Acceso"); });
  modulos = computed(() => MODS_CF.filter(m => this.sesiones() || m !== "Acceso"));
  acciones = computed(() => [...new Set<string>(this.base().map((a: any) => a.a))].sort((x, y) => x.localeCompare(y, "es")));
  lista = computed(() => { const q = this.q().toLowerCase();
    const txt = (a: any) => [a.o, a.up, a.mot, a.a, a.m, M.cfRol(a), ...(a.det || []).map((d: any) => `${d.c} ${d.a} ${d.d}`)].join(" ").toLowerCase();
    return this.base().filter((a: any) => (!this.mod() || a.m === this.mod()) && (!this.acc() || a.a === this.acc()) && (!q || txt(a).includes(q))); });
  rol = (a: any) => M.cfRol(a);
  cambiarSesiones(v: boolean) { this.sesiones.set(v); if (!v && this.mod() === "Acceso") this.mod.set(""); }
}
