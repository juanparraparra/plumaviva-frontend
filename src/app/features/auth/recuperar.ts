import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { AuthMarco } from "./auth-marco";

@Component({
  selector: "pv-recuperar", imports: [FormsModule, RouterLink, AuthMarco], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <pv-auth-marco>
    <h1>Recuperar contraseña</h1><p class="muted small">Escriba el correo con el que está registrado.</p>
    <form class="form one" (ngSubmit)="enviar()">
      <div class="field"><label for="rMail">Correo electrónico</label><input id="rMail" name="mail" type="email" required [(ngModel)]="mail"></div>
      @if (enviado()) {
        <div class="alert ok">Si el correo existe, recibirá un enlace válido por 30 minutos.</div>
        @if (existe() && (auth.modoDemo || enviado())) { <div class="mailbox">📧 <b>{{ auth.modoDemo ? 'Bandeja simulada' : 'Enlace de desarrollo' }}:</b> <a routerLink="/restablecer">Abrir enlace para restablecer la contraseña</a></div> }
      }
      <button class="btn" type="submit" [disabled]="cargando()">{{ cargando() ? 'Enviando…' : 'Enviar enlace' }}</button><a routerLink="/login" class="small">Volver</a>
    </form>
  </pv-auth-marco>`
})
export class Recuperar {
  auth = inject(AuthService); mail = ""; enviado = signal(false); existe = signal(false); cargando = signal(false);
  async enviar() {
    if (this.cargando()) return;
    this.cargando.set(true);
    try { this.existe.set(await this.auth.recuperar(this.mail)); this.enviado.set(true); }
    finally { this.cargando.set(false); }
  }
}
