import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { StoreService } from "../../core/services/store.service";
import { AuthMarco } from "./auth-marco";

const REGLAS: [RegExp, string][] = [
  [/.{10,}/, "Mínimo 10 caracteres"],
  [/[A-Z]/, "Una mayúscula"],
  [/[a-z]/, "Una minúscula"],
  [/\d/, "Un número"],
  [/[^A-Za-z0-9]/, "Un carácter especial"]
];

/** Cambio obligatorio de la clave temporal antes del primer ingreso. */
@Component({
  selector: "pv-cambiar-clave", imports: [FormsModule, AuthMarco], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <pv-auth-marco>
    <h1>Cambie su contraseña temporal</h1>
    <p class="muted small">Ingresó con una clave temporal. Por seguridad, debe reemplazarla por una propia antes de continuar.</p>
    <form class="form one" autocomplete="off" (ngSubmit)="guardar()">
      <div class="field"><label for="cActual">Contraseña actual (temporal) *</label>
        <div class="pw"><input id="cActual" name="actual" [type]="ver() ? 'text' : 'password'" required [(ngModel)]="actual" autocomplete="current-password"><button type="button" (click)="ver.set(!ver())">{{ ver() ? 'Ocultar' : 'Mostrar' }}</button></div></div>
      <div class="field"><label for="cNueva">Nueva contraseña *</label>
        <div class="pw"><input id="cNueva" name="nueva" [type]="ver() ? 'text' : 'password'" required [(ngModel)]="nueva" autocomplete="new-password"><button type="button" (click)="ver.set(!ver())">{{ ver() ? 'Ocultar' : 'Mostrar' }}</button></div></div>
      <ul class="req">@for (r of reglas(); track r.t) { <li [class]="r.ok ? 'ok' : 'no'">{{ r.ok ? '✓' : '○' }} {{ r.t }}</li> }</ul>
      <div class="field"><label for="cConf">Confirmar nueva contraseña *</label><input id="cConf" name="confirmar" type="password" required [(ngModel)]="confirmar" autocomplete="new-password"></div>
      @if (msg()) { <div class="alert err">{{ msg() }}</div> }
      <button class="btn" type="submit" [disabled]="cargando()">{{ cargando() ? 'Guardando…' : 'Cambiar contraseña y continuar' }}</button>
      <p class="tiny muted">Después del cambio le enviaremos un código de verificación al correo registrado.</p>
    </form>
  </pv-auth-marco>`
})
export class CambiarClave {
  private auth = inject(AuthService); private store = inject(StoreService); private router = inject(Router);
  actual = ""; nueva = ""; confirmar = ""; ver = signal(false); msg = signal(""); cargando = signal(false);
  reglas() { return REGLAS.map(([re, t]) => ({ t, ok: re.test(this.nueva) })); }
  constructor() { if (!this.auth.hayCambioPendiente) this.router.navigateByUrl("/login"); }
  async guardar() {
    if (this.cargando()) return;
    if (!this.actual) { this.msg.set("Escriba la contraseña temporal que recibió por correo."); return; }
    if (!this.reglas().every(r => r.ok)) { this.msg.set("La contraseña nueva no cumple la política de seguridad."); return; }
    if (this.nueva !== this.confirmar) { this.msg.set("Las contraseñas nuevas no coinciden."); return; }
    this.msg.set(""); this.cargando.set(true);
    try {
      const r = await this.auth.cambiarPasswordInicial(this.actual, this.nueva, this.confirmar);
      if (!r.ok) { this.msg.set(r.msg || "No se pudo cambiar la contraseña."); return; }
      if (r.msg) this.store.toast(r.msg, 7000);
    } finally { this.cargando.set(false); }
  }
}
