import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { StoreService } from "../../core/services/store.service";
import { UsuariosService } from "../../core/services/usuarios.service";
import { DialogService } from "../../core/services/dialog.service";
import { ROLES } from "../../core/engine/contexto";
import * as M from "../../core/engine/motor";
import { Modal } from "../../shared/modal";

const MOTIVOS = ["Retiro de la entidad", "Vacaciones o licencia", "Fin del acceso temporal", "Otro"];

@Component({
  selector: "pv-usuarios", imports: [FormsModule, Modal], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="page-head"><div><div class="crumbs">Administración</div><h1>Usuarios</h1><p class="muted">Crear, editar, activar e inactivar. Eliminar solo si no tiene historial.</p></div>
    <button class="btn" type="button" (click)="abrir()">+ Nuevo usuario</button></div>
  <div class="card"><div class="form" style="grid-template-columns:2fr 1fr 1fr">
    <div class="field"><label for="uQ">Buscar</label><input id="uQ" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="Nombre, documento o correo"></div>
    <div class="field"><label for="uR">Rol</label><select id="uR" [ngModel]="rol()" (ngModelChange)="rol.set($event)"><option value="">Todos ({{ roles.length }} roles)</option>@for (r of roles; track r.id) { <option [value]="r.id">{{ r.nombre }}</option> }</select></div>
    <div class="field"><label for="uE">Estado</label><select id="uE" [ngModel]="estado()" (ngModelChange)="estado.set($event)"><option value="">Todos</option><option>ACTIVO</option><option>INACTIVO</option></select></div></div></div>
  <div class="card"><div class="table-wrap"><table><tr><th>Usuario</th><th>Correo</th><th>Rol en la plataforma</th><th>Rol en la guía</th><th>Estado</th><th class="num">Acciones</th></tr>
    @for (u of lista(); track u.id) {
      <tr><td><b>{{ m.fullName(u) }}</b><div class="tiny muted">{{ m.docTxt(u) }}</div></td><td>{{ u.correo }}</td><td>{{ m.rolDe(u).plat }}</td><td>{{ m.rolDe(u).guia }}</td>
        <td><span class="tag" [class]="u.estado === 'ACTIVO' ? 'tag t-ok' : 'tag t-gray'">{{ u.estado }}</span></td>
        <td class="num"><div class="btn-row" style="justify-content:flex-end"><button class="btn sec sm" type="button" (click)="abrir(u)">Editar</button>
          @if (u.estado === 'ACTIVO') { <button class="btn danger sm" type="button" (click)="inactivar(u)">Inactivar</button> } @else { <button class="btn sec sm" type="button" (click)="activar(u)">Activar</button> }
          <button class="btn danger sm" type="button" (click)="eliminar(u)">Eliminar</button></div></td></tr>
    } @empty { <tr><td colspan="6" class="muted">Sin resultados.</td></tr> }
  </table></div><p class="tiny muted">Con historial (accesos, visitas, actas o registros) no se elimina: se inactiva y se conserva (regla de negocio).</p></div>

  @if (form(); as f) {
    <pv-modal [titulo]="f.id ? 'Editar usuario' : 'Nuevo usuario'" (cerrar)="form.set(null)">
      <form class="form" (ngSubmit)="guardar()" id="fUser">
        <div class="field"><label>Nombres *</label><input name="nombres" [(ngModel)]="f.nombres"></div>
        <div class="field"><label>Apellidos *</label><input name="apellidos" [(ngModel)]="f.apellidos"></div>
        <div class="field"><label>Tipo de documento *</label><select name="tipoDoc" [(ngModel)]="f.tipoDoc">@for (t of tiposDoc; track t[0]) { <option [value]="t[0]">{{ t[1][0] }} · {{ t[1][1] }}</option> }</select></div>
        <div class="field"><label>Número de documento *</label><input name="doc" [(ngModel)]="f.doc" inputmode="numeric" placeholder="Solo números, sin puntos"><span class="hint">NIT con dígito de verificación: 900000000-1</span></div>
        <div class="field"><label>Correo *</label><input name="correo" [(ngModel)]="f.correo"></div>
        <div class="field"><label>Teléfono</label><input name="tel" [(ngModel)]="f.tel"></div>
        <div class="field"><label>Rol *</label><select name="rol" [(ngModel)]="f.rolSel">@for (r of roles; track r.id) { <option [value]="r.id">{{ r.plat }} ({{ r.guia }})</option> }</select></div>
        <div class="field"><label>Seccional</label><input name="seccional" [(ngModel)]="f.seccional"></div>
        <div class="field"><label>Matrícula profesional</label><input name="matricula" [(ngModel)]="f.matricula" placeholder="Solo inspector o responsable técnico"></div>
        @if (errores().length) { <div class="field full"><div class="alert err">@for (e of errores(); track e) { {{ e }}<br> }</div></div> }
      </form>
      <ng-container pie><button class="btn sec" type="button" (click)="form.set(null)">Cancelar</button><button class="btn" type="button" (click)="guardar()">Guardar</button></ng-container>
    </pv-modal>
  }`
})
export class Usuarios {
  store = inject(StoreService); private usuarios = inject(UsuariosService); private dlg = inject(DialogService); m: any = M; roles = ROLES;
  tiposDoc: [string, string[]][] = Object.entries((M as any).TIPOS_DOC) as [string, string[]][];
  q = signal(""); rol = signal(inject(ActivatedRoute).snapshot.queryParamMap.get("rol") || ""); estado = signal("");
  form = signal<any>(null); errores = signal<string[]>([]);
  lista = computed(() => { this.store.v(); const q = this.q().toLowerCase();
    return this.store.S.users.filter((u: any) => (!q || (M.fullName(u) + u.correo + u.doc).toLowerCase().includes(q)) && (!this.rol() || M.rolEf(u) === this.rol()) && (!this.estado() || u.estado === this.estado())); });

  abrir(u?: any) {
    this.errores.set([]);
    this.form.set(u ? { ...u, rolSel: M.rolEf(u), seccional: u.seccional || "", matricula: u.matricula || "" }
      : { id: 0, nombres: "", apellidos: "", tipoDoc: "CC", doc: "", correo: "", tel: "", rolSel: "INSP", seccional: "", matricula: "" });
  }
  async guardar() {
    const f = this.form(), S = this.store.S, id = f.id, u = id ? M.userById(id) : null, errs: string[] = [];
    f.doc = M.limpiaDoc(f.doc);
    if (!f.nombres.trim() || !f.apellidos.trim() || !String(f.doc).trim()) errs.push("Nombres, apellidos y documento son obligatorios.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.correo)) errs.push("Correo con formato inválido.");
    if (f.doc && !M.docValido(f.tipoDoc, f.doc)) errs.push(M.docError(f.tipoDoc));
    if (S.users.some((x: any) => x.id !== id && x.tipoDoc === f.tipoDoc && x.doc === f.doc)) errs.push("Ya existe un usuario con ese tipo y número de documento.");
    if (f.correo && S.users.some((x: any) => x.id !== id && x.correo === f.correo.toLowerCase())) errs.push("Ya existe un usuario con ese correo.");
    if (u && u.id === this.store.SES.id && f.rolSel !== M.rolEf(u)) errs.push("No puede cambiar su propio rol.");
    if (u && u.rol === "ADMIN" && M.baseRol(f.rolSel) !== "ADMIN" && S.users.filter((x: any) => x.rol === "ADMIN" && x.estado === "ACTIVO").length <= 1) errs.push("Debe existir al menos un administrador activo.");
    this.errores.set(errs); if (errs.length) return;
    const datos = { nombres: f.nombres, apellidos: f.apellidos, tipoDoc: f.tipoDoc, doc: f.doc, correo: f.correo.toLowerCase(), tel: f.tel, seccional: f.seccional, matricula: f.matricula,
      rol: M.baseRol(f.rolSel), rolPers: M.role(f.rolSel).base ? f.rolSel : "" };
    if (!u) {
      try {
        const r = await this.usuarios.crear({ ...datos, estado: "ACTIVO" });
        M.audit("Creó", "Usuario " + f.nombres + " " + f.apellidos, { m: "Usuarios", det: [{ c: "Usuario", a: "—", d: `${f.nombres} ${f.apellidos} · ${M.roleName(f.rolSel)} · ACTIVO` }] });
        this.store.toast(r.aviso || (r.correo_enviado
          ? `Usuario creado. La clave temporal se envió a ${f.correo}.`
          : "Usuario creado en estado ACTIVO: ya puede ingresar."), r.aviso ? 12000 : 6000);
        this.form.set(null); this.store.touch();
      } catch (e: any) { this.errores.set([e?.message || "No se pudo crear el usuario."]); }
      return;
    }
    const df = M.diffUsuario(u, datos, f.rolSel), cambiaRol = df.some((d: any) => d.rol);
    if (!df.length) { this.form.set(null); this.store.toast("No hay cambios para guardar."); return; }
    const aplicar = async (mot: string) => {
      try {
        await this.usuarios.actualizar(u, datos);
        M.audit(cambiaRol ? "Cambió el rol" : "Editó", "Usuario " + M.fullName(u), { m: "Usuarios", mot, det: df.map(({ c, a, d }: any) => ({ c, a, d })) });
        this.form.set(null); this.store.touch(); this.store.toast(cambiaRol ? "Rol actualizado." : "Cambios guardados.");
      } catch (e: any) { this.errores.set([e?.message || "No se pudieron guardar los cambios."]); }
    };
    if (!cambiaRol) { aplicar(""); return; }
    const nUni = S.unidades.filter((x: any) => x.propietario === u.id).length, nRt = S.unidades.filter((x: any) => x.rt === u.id).length, nEv = S.evaluaciones.filter((e: any) => e.insp === u.id && M.ABIERTA.includes(e.estado)).length, av: string[] = [];
    if (nUni && datos.rol !== "PROD") av.push(`Es propietario de ${nUni} unidad(es) productiva(s): con el nuevo rol dejará de verlas como propietario.`);
    if (nRt && datos.rol !== "RT") av.push(`Figura como responsable técnico en ${nRt} unidad(es).`);
    if (nEv && datos.rol !== "INSP") av.push(`Tiene ${nEv} evaluación(es) abierta(s) asignada(s) como inspector: reasígnelas o anúlelas.`);
    av.push("El menú, los permisos y la información que ve cambian desde su próximo ingreso.");
    const mot = await this.dlg.confirmarCambios({ titulo: "Confirmar cambio de rol", introHtml: `Va a cambiar el rol de <b>${M.esc(M.fullName(u))}</b>. El cambio no se aplica hasta que lo confirme.`, cambios: df, avisos: av, okTxt: "Confirmar cambio de rol" });
    if (mot !== null) aplicar(mot);
  }
  async inactivar(u: any) {
    const S = this.store.S;
    if (u.id === this.store.SES.id) { this.store.toast("No puede inactivar su propia cuenta."); return; }
    if (u.rol === "ADMIN" && S.users.filter((x: any) => x.rol === "ADMIN" && x.estado === "ACTIVO").length <= 1) { this.store.toast("Debe existir al menos un administrador activo."); return; }
    const r = await this.dlg.abrir({ titulo: "Inactivar usuario", html: `<p>¿Inactivar a <b>${M.esc(M.fullName(u))}</b>? Conserva su historial y pierde el acceso.</p>`, okTxt: "Inactivar", okClase: "btn danger",
      campos: [{ id: "mot", label: "Motivo *", tipo: "select", opciones: MOTIVOS }] });
    if (!r) return;
    const antes = u.estado;
    try {
      await this.usuarios.cambiarEstado(u, "INACTIVO");
      M.audit("Inactivó", "Usuario " + M.fullName(u), { m: "Usuarios", mot: r["mot"], det: [{ c: "Estado", a: antes, d: "INACTIVO" }] });
      this.store.touch(); this.store.toast("Usuario inactivado.");
    } catch (e: any) { this.store.toast(e?.message || "No se pudo inactivar el usuario."); }
  }
  async activar(u: any) {
    const antes = u.estado;
    try {
      await this.usuarios.cambiarEstado(u, "ACTIVO");
      M.audit("Activó", "Usuario " + M.fullName(u), { m: "Usuarios", det: [{ c: "Estado", a: antes, d: "ACTIVO" }] });
      this.store.touch(); this.store.toast("Usuario activado.");
    } catch (e: any) { this.store.toast(e?.message || "No se pudo activar el usuario."); }
  }
  async eliminar(u: any) {
    if (u.historial) {
      const r = await this.dlg.abrir({ titulo: "No se puede eliminar", html: `<div class="alert err"><b>${M.esc(M.fullName(u))}</b> tiene historial (accesos, visitas, actas o registros). No se puede eliminar.</div><p>Puede inactivarlo: conserva el historial y pierde el acceso.</p>`, okTxt: u.estado === "ACTIVO" ? "Inactivar" : "Cerrar", okClase: u.estado === "ACTIVO" ? "btn danger" : "btn", cancelTxt: "Cerrar" });
      if (r && u.estado === "ACTIVO") this.inactivar(u); return;
    }
    if (!(await this.dlg.confirmar("Eliminar usuario", `¿Eliminar definitivamente a ${M.fullName(u)}? No tiene historial.`, "Eliminar", "btn danger"))) return;
    try {
      await this.usuarios.eliminar(u);
      M.audit("Eliminó", "Usuario " + M.fullName(u), { m: "Usuarios", det: [{ c: "Usuario", a: `${M.fullName(u)} · ${M.roleName(u.rolPers || u.rol)} · ${M.docTxt(u)}`, d: "Eliminado" }] });
      this.store.touch(); this.store.toast("Usuario eliminado.");
    } catch (e: any) { this.store.toast(e?.message || "No se pudo eliminar el usuario."); }
  }
}
