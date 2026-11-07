import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { AuthMarco } from "./auth-marco";

@Component({
  selector: "pv-login", imports: [FormsModule, RouterLink, AuthMarco], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <pv-auth-marco>
    <h1>Iniciar sesión</h1><p class="muted small">El rol se toma de su cuenta.</p>
    <form class="form one" autocomplete="off" (ngSubmit)="entrar()">
      <div class="field"><label for="lMail">Correo electrónico</label><input id="lMail" name="mail" type="email" placeholder="usuario@ejemplo.co" required [(ngModel)]="mail"></div>
      <div class="field"><label for="lPass">Contraseña</label>
        <div class="pw"><input id="lPass" name="clave" [type]="ver() ? 'text' : 'password'" required [(ngModel)]="clave"><button type="button" (click)="ver.set(!ver())">{{ ver() ? 'Ocultar' : 'Mostrar' }}</button></div></div>
      @if (msg(); as m) { <div class="alert" [class.err]="m.tipo === 'err'" [class.warn]="m.tipo === 'warn'">{{ m.msg }}</div> }
      <button class="btn" type="submit" [disabled]="cargando()">{{ cargando() ? 'Ingresando…' : 'Ingresar' }}</button>
      <a routerLink="/recuperar" class="small">¿Olvidó su contraseña?</a>
    </form>
    @if (auth.modoDemo) {
      <div class="demo-users"><b class="small">Usuarios de demostración</b> <span class="tiny muted">(contraseña {{ auth.claveDemo }})</span><br>
        @for (u of auth.usuariosDemo(); track u.correo) { <button class="btn sec sm" type="button" (click)="demo(u.correo)">{{ u.etiqueta }}</button> }
      </div>
    }
  </pv-auth-marco>`
})
export class Login {
  auth = inject(AuthService);
  mail = ""; clave = ""; ver = signal(false); cargando = signal(false); msg = signal<{ tipo: "err" | "warn"; msg: string } | null>(null);
  demo(correo: string) { this.mail = correo; this.clave = this.auth.claveDemo; }
  async entrar() {
    if (this.cargando()) return;
    this.cargando.set(true);
    try { this.msg.set(await this.auth.login(this.mail, this.clave)); }
    finally { this.cargando.set(false); }
  }
}
