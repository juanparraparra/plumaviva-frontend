import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { StoreService } from "../../core/services/store.service";
import { DialogService } from "../../core/services/dialog.service";
import { ROLES } from "../../core/engine/contexto";
import { MENU } from "../../core/data/menu";
import * as M from "../../core/engine/motor";
import { Modal } from "../../shared/modal";

@Component({
  selector: "pv-roles", imports: [FormsModule, Modal], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="page-head"><div><div class="crumbs">Administración</div><h1>Roles y permisos</h1><p class="muted">Cree roles y ajuste su nombre, descripción y permisos. Todo cambio pide confirmación antes de aplicarse y queda en el control de cambios.</p></div>
    <button class="btn" type="button" (click)="abrir()">+ Nuevo rol</button></div>
  <div class="grid g2">
    @for (r of roles; track r.id) {
      <div class="card"><div class="card-head"><h3>{{ r.plat }}</h3>
        @if (r.base) { <span class="tag t-warn">Personalizado · base: {{ m.role(r.base).nombre }}</span> } @else { <span class="tag t-info">Guía: {{ r.guia }}</span> }</div>
        <p class="small">{{ r.desc || 'Sin descripción.' }}</p>
        <p class="tiny muted">Usuarios: {{ m.nUsuariosRol(r.id) }} · Menú: {{ menuTxt(r.menu) }}</p>
        <div class="btn-row"><button class="btn sec sm" type="button" (click)="abrir(r)">Editar</button>
          @if (r.base) { <button class="btn danger sm" type="button" (click)="eliminar(r)">Eliminar</button> } @else { <span class="tiny muted">Rol de la guía: se puede renombrar, no eliminar</span> }</div></div>
    }
  </div>
  <div class="card"><h3>Matriz de permisos</h3><div class="table-wrap"><table><tr><th>Permiso</th>@for (r of roles; track r.id) { <th>{{ r.nombre }}</th> }</tr>
    @for (p of mods; track p; let i = $index) {
      <tr><td><b>{{ p }}</b></td>
        @for (r of roles; track r.id) { <td><label class="check" [title]="sinTope(r, i) ? 'No disponible para el perfil base de este rol' : ''">
          <input type="checkbox" [checked]="!!perm[r.id][i]" [disabled]="r.id === 'ADMIN' || sinTope(r, i)" (click)="$event.preventDefault(); cambiarPermiso(r, i)"></label></td> }
      </tr>
    }
  </table></div><p class="tiny muted">El rol Administrador conserva todos sus permisos. Un rol personalizado nunca puede tener más permisos que su perfil base. Cada cambio de permiso pide confirmación.</p></div>

  @if (f(); as x) {
    <pv-modal [titulo]="x.id ? 'Editar rol' : 'Nuevo rol'" (cerrar)="f.set(null)">
      <form class="form" (submit)="$event.preventDefault()">
        <div class="field"><label>Nombre del rol *</label><input name="nombre" [(ngModel)]="x.nombre" maxlength="40"></div>
        <div class="field"><label>Nombre completo en la plataforma</label><input name="plat" [(ngModel)]="x.plat" maxlength="60"><span class="hint">Si lo deja vacío se usa el nombre del rol.</span></div>
        <div class="field full"><label>Descripción</label><textarea name="desc" rows="3" maxlength="260" [(ngModel)]="x.desc"></textarea></div>
        @if (x.custom) {
          <div class="field full"><label>Perfil base *</label>
            @if (x.id) { <input [value]="m.role(x.base).nombre" disabled> } @else { <select name="base" [ngModel]="x.base" (ngModelChange)="cambiarBase(x, $event)">@for (b of bases; track b.id) { <option [value]="b.id">{{ b.nombre }}</option> }</select> }
            <span class="hint">El perfil base define qué información ve y qué acciones puede hacer como máximo: {{ m.role(x.base).desc }}</span></div>
          <div class="field full"><label>Menú que verá</label><div class="rf-checks">@for (mn of m.role(x.base).menu; track mn) { <label class="check"><input type="checkbox" [checked]="mn === 'inicio' || x.menu.includes(mn)" [disabled]="mn === 'inicio'" (change)="alternar(x.menu, mn)"> {{ menu[mn] }}</label> }</div></div>
          <div class="field full"><label>Permisos</label><div class="rf-checks">@for (p of mods; track p; let i = $index) { <label class="check"><input type="checkbox" [checked]="!!x.perm[i] && !!tope(x.base)[i]" [disabled]="!tope(x.base)[i]" (change)="x.perm[i] = x.perm[i] ? 0 : 1"> {{ p }}</label> }</div></div>
        } @else { <div class="field full"><div class="alert info">Es un rol de la guía: puede ajustar su nombre y descripción. Su menú y la información que ve son fijos; los permisos se cambian en la matriz.</div></div> }
        @if (errores().length) { <div class="field full"><div class="alert err">@for (e of errores(); track e) { {{ e }}<br> }</div></div> }
      </form>
      <ng-container pie><button class="btn sec" type="button" (click)="f.set(null)">Cancelar</button><button class="btn" type="button" (click)="guardar()">Revisar y guardar</button></ng-container>
    </pv-modal>
  }`
})
export class Roles {
  store = inject(StoreService); private router = inject(Router); private dlg = inject(DialogService); m: any = M; menu: any = MENU;
  roles = ROLES; perm = (M as any).PERM; mods: string[] = (M as any).PERM_MODS;
  f = signal<any>(null); errores = signal<string[]>([]);
  get bases() { return ROLES.filter(x => !x.base && x.id !== "ADMIN"); }
  tope = (b: string) => (M as any).PERM[b] || [];
  sinTope = (r: any, i: number) => !!r.base && !this.tope(r.base)[i];
  menuTxt = (a: string[]) => a.map(x => MENU[x]).join(" · ");
  alternar(a: string[], mn: string) { const i = a.indexOf(mn); if (i >= 0) a.splice(i, 1); else a.push(mn); }

  async cambiarPermiso(r: any, i: number) {
    const quiere = this.perm[r.id][i] ? 0 : 1, n = M.nUsuariosRol(r.id);
    const cam = [{ c: `${this.mods[i]} · ${r.nombre}`, a: quiere ? "No" : "Sí", d: quiere ? "Sí" : "No" }];
    const mot = await this.dlg.confirmarCambios({ titulo: "Confirmar cambio de permiso", introHtml: `Va a <b>${quiere ? "otorgar" : "retirar"}</b> el permiso <b>${M.esc(this.mods[i])}</b> al rol <b>${M.esc(r.nombre)}</b>.`, cambios: cam, avisos: [`Afecta a ${n} usuario(s) con este rol y se aplica de inmediato.`] });
    if (mot === null) return;
    this.perm[r.id][i] = quiere;
    // Si se retira un permiso a un rol base, sus roles personalizados no pueden conservarlo.
    if (!r.base) {
      for (const c of ROLES) {
        if (c.base !== r.id) continue;
        this.perm[c.id] = (this.perm[c.id] || []).map((v: number, j: number) => v && this.perm[r.id][j] ? 1 : 0);
      }
    }
    M.audit(quiere ? "Otorgó permiso" : "Retiró permiso", `${this.mods[i]} · ${r.nombre}`, { m: "Roles y permisos", mot, det: cam });
    this.store.toast("Permiso actualizado.");
    this.store.touch();
    void this.store.guardarRoles();
  }
  abrir(r?: any) {
    this.errores.set([]);
    const custom = !r || !!r.base, base = r ? r.base : this.bases[0].id;
    this.f.set({ id: r?.id || "", nombre: r?.nombre || "", plat: r?.plat || "", desc: r?.desc || "", custom, base,
      menu: r ? [...r.menu] : [...M.role(base).menu], perm: r ? [...this.perm[r.id]] : [...this.tope(base)] });
  }
  cambiarBase(x: any, b: string) { x.base = b; x.menu = [...M.role(b).menu]; x.perm = [...this.tope(b)]; this.f.set({ ...x }); }
  async guardar() {
    const x = this.f(), r = x.id ? M.role(x.id) : null, custom = x.custom, errs: string[] = [];
    const nombre = (x.nombre || "").trim(), plat = (x.plat || "").trim() || nombre, desc = (x.desc || "").trim();
    if (nombre.length < 3) errs.push("El nombre debe tener al menos 3 caracteres.");
    if (ROLES.some(o => o.id !== x.id && [M.normTxt(o.nombre), M.normTxt(o.plat)].includes(M.normTxt(nombre)))) errs.push("Ya existe un rol con ese nombre.");
    this.errores.set(errs); if (errs.length) return;
    const baseId = r ? r.base : x.base;
    const menu = custom ? ["inicio", ...x.menu.filter((k: string) => k !== "inicio" && M.role(baseId).menu.includes(k))] : (r ? r.menu : []);
    const perm = custom ? this.mods.map((_, i) => x.perm[i] && this.tope(baseId)[i] ? 1 : 0) : null;
    const permTxt = (a: number[]) => this.mods.filter((_, i) => a[i]).join(", ") || "Solo consulta", menuTxt = (a: string[]) => a.map(k => MENU[k]).join(", "), cam: any[] = [];
    if (!r) cam.push({ c: "Rol", a: "—", d: `${nombre} · perfil base: ${M.role(baseId).nombre}` }, { c: "Descripción", a: "—", d: desc || "—" }, { c: "Menú", a: "—", d: menuTxt(menu) }, { c: "Permisos", a: "—", d: permTxt(perm!) });
    else {
      if (r.nombre !== nombre) cam.push({ c: "Nombre del rol", a: r.nombre, d: nombre });
      if (r.plat !== plat) cam.push({ c: "Nombre completo", a: r.plat, d: plat });
      if ((r.desc || "") !== desc) cam.push({ c: "Descripción", a: r.desc || "—", d: desc || "—" });
      if (custom && menuTxt(r.menu) !== menuTxt(menu)) cam.push({ c: "Menú", a: menuTxt(r.menu), d: menuTxt(menu) });
      if (custom && permTxt(this.perm[r.id]) !== permTxt(perm!)) cam.push({ c: "Permisos", a: permTxt(this.perm[r.id]), d: permTxt(perm!) });
    }
    if (!cam.length) { this.f.set(null); this.store.toast("No hay cambios para guardar."); return; }
    const n = r ? M.nUsuariosRol(r.id) : 0, ren = r && (r.nombre !== nombre || r.plat !== plat), avisos: string[] = [];
    if (ren) avisos.push(`El nuevo nombre se aplica en todos los registros conectados: ${n} usuario(s), el menú, la matriz de permisos, el control de cambios y el asistente.`);
    if (r && custom && n && cam.some(c => c.c === "Menú" || c.c === "Permisos")) avisos.push(`Los ${n} usuario(s) con este rol verán el cambio de menú y permisos desde su próximo ingreso.`);
    const mot = await this.dlg.confirmarCambios({ titulo: r ? "Confirmar cambios del rol" : "Confirmar nuevo rol", introHtml: r ? `Va a modificar el rol <b>${M.esc(r.nombre)}</b>. Nada se aplica hasta que confirme.` : `Va a crear el rol <b>${M.esc(nombre)}</b>.`, cambios: cam, avisos, okTxt: r ? "Confirmar cambios" : "Crear rol" });
    if (mot === null) return;
    const S = this.store.S;
    if (!r) { const nid = "R" + (S.nextRol = (S.nextRol || 0) + 1); ROLES.push({ id: nid, nombre, plat, guia: "Personalizado", desc, menu, base: baseId }); this.perm[nid] = perm; M.audit("Creó", "Rol " + nombre, { m: "Roles y permisos", mot, det: cam }); this.store.toast("Rol creado."); }
    else { const ant = r.nombre; r.nombre = nombre; r.plat = plat; r.desc = desc; if (custom) { r.menu = menu; this.perm[r.id] = perm; } M.audit("Editó", "Rol " + ant, { m: "Roles y permisos", mot, det: cam }); this.store.toast("Rol actualizado en todos los registros conectados."); }
    this.f.set(null); this.store.touch(); void this.store.guardarRoles();
  }
  async eliminar(r: any) {
    const n = M.nUsuariosRol(r.id);
    if (n) { const x = await this.dlg.abrir({ titulo: "No se puede eliminar", html: `<div class="alert err">El rol <b>${M.esc(r.nombre)}</b> está asignado a ${n} usuario(s). Cambie primero el rol de esos usuarios.</div>`, okTxt: "Ver usuarios con este rol", cancelTxt: "Cerrar" }); if (x) this.router.navigate(["/usuarios"], { queryParams: { rol: r.id } }); return; }
    const mot = await this.dlg.confirmarCambios({ titulo: "Eliminar rol", introHtml: `Va a eliminar el rol <b>${M.esc(r.nombre)}</b>. No tiene usuarios.`, cambios: [{ c: "Rol", a: `${r.nombre} · base: ${M.role(r.base).nombre}`, d: "Eliminado" }], okTxt: "Eliminar rol", peligro: true });
    if (mot === null) return;
    const i = ROLES.findIndex(x => x.id === r.id); ROLES.splice(i, 1); delete this.perm[r.id];
    M.audit("Eliminó", "Rol " + r.nombre, { m: "Roles y permisos", mot, det: [{ c: "Rol", a: `${r.nombre} · base: ${M.role(r.base).nombre}`, d: "Eliminado" }] }); this.store.toast("Rol eliminado."); this.store.touch(); void this.store.guardarRoles();
  }
}
