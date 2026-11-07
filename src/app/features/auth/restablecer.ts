import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { StoreService } from "../../core/services/store.service";
import { guardarTokenReset } from "../../core/api/token";
import { AuthMarco } from "./auth-marco";

const REGLAS: [RegExp, string][] = [[/.{10,}/, "Mínimo 10 caracteres"], [/[A-Z]/, "Una mayúscula"], [/[a-z]/, "Una minúscula"], [/\d/, "Un número"], [/[^A-Za-z0-9]/, "Un carácter especial"]];

@Component({
  selector: "pv-restablecer", imports: [FormsModule, AuthMarco], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <pv-auth-marco>
    <h1>Nueva contraseña</h1>
    <form class="form one" (ngSubmit)="guardar()">
      <div class="field"><label for="nP1">Nueva contraseña</label>
        <div class="pw"><input id="nP1" name="p1" [type]="ver() ? 'text' : 'password'" [ngModel]="p1()" (ngModelChange)="p1.set($event)"><button type="button" (click)="ver.set(!ver())">{{ ver() ? 'Ocultar' : 'Mostrar' }}</button></div></div>
      <ul class="req">@for (r of reglas(); track r.t) { <li [class]="r.ok ? 'ok' : 'no'">{{ r.ok ? '✓' : '○' }} {{ r.t }}</li> }</ul>
      <div class="field"><label for="nP2">Confirmar contraseña</label><input id="nP2" name="p2" type="password" [(ngModel)]="p2"></div>
      @if (msg()) { <div class="alert err">{{ msg() }}</div> }
      <button class="btn" type="submit" [disabled]="cargando()">{{ cargando() ? 'Guardando…' : 'Guardar contraseña' }}</button>
    </form>
  </pv-auth-marco>`
})
export class Restablecer {
  private auth = inject(AuthService); private store = inject(StoreService); private router = inject(Router);
  p1 = signal(""); p2 = ""; ver = signal(false); msg = signal(""); cargando = signal(false);
  reglas = computed(() => REGLAS.map(([re, t]) => ({ t, ok: re.test(this.p1()) })));
  constructor() {
    // El enlace del correo llega como #/restablecer?token=…
    const token = inject(ActivatedRoute).snapshot.queryParamMap.get("token");
    if (token) guardarTokenReset(token);
    if (!this.auth.hayToken) this.router.navigateByUrl("/recuperar");
  }
  async guardar() {
    if (!this.reglas().every(r => r.ok)) { this.msg.set("La contraseña no cumple la política."); return; }
    if (this.p1() !== this.p2) { this.msg.set("Las contraseñas no coinciden."); return; }
    if (this.cargando()) return;
    this.cargando.set(true);
    try {
      const r = await this.auth.restablecer(this.p1());
      if (!r.ok) { this.msg.set(r.msg || "No se pudo restablecer la contraseña."); return; }
      this.auth.limpiar();
      this.store.toast(this.auth.modoDemo ? "Contraseña actualizada (en el prototipo se sigue usando la contraseña de demostración)." : "Contraseña actualizada. Ya puede ingresar.");
      this.router.navigateByUrl("/login");
    } finally { this.cargando.set(false); }
  }
}
