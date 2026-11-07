import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChildren } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { StoreService } from "../../core/services/store.service";
import { AuthMarco } from "./auth-marco";

@Component({
  selector: "pv-verificar", imports: [RouterLink, AuthMarco], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <pv-auth-marco>
    <h1>Verificación en dos pasos</h1>
    <p class="muted small">Enviamos un código de 6 dígitos a <b>{{ correo() }}</b>. Vence en 10 minutos.</p>
    <form class="form one" (submit)="$event.preventDefault(); verificar()">
      <div class="field"><label>Código de seguridad</label>
        <div class="code-input">@for (i of idx; track i) { <input #ci maxlength="1" inputmode="numeric" [attr.data-ci]="i" [disabled]="cargando()" (input)="escribir(i, $event)" (keydown.backspace)="atras(i)"> }</div></div>
      @if (msg()) { <div class="alert err">{{ msg() }}</div> }
      @if (aviso()) { <div class="alert info">{{ aviso() }}</div> }
      <button class="btn" type="submit" [disabled]="cargando()">{{ cargando() ? 'Verificando…' : 'Verificar e ingresar' }}</button>
      <div class="btn-row"><button type="button" class="btn ghost sm" [disabled]="cargando()" (click)="reenviar()">Reenviar código</button><a routerLink="/login" class="small">Volver</a></div>
    </form>
    @if (auth.modoDemo) { <div class="mailbox">📧 <b>Bandeja de correo simulada</b> (no hay servidor de correo): su código es <b style="font-size:1.1rem;letter-spacing:2px">{{ auth.codigoSimulado }}</b></div> }
    @if (auth.codigoDesarrollo()) { <div class="mailbox">🧪 <b>Modo desarrollo</b> (MAIL_DRIVER=console): su código es <b style="font-size:1.1rem;letter-spacing:2px">{{ auth.codigoDesarrollo() }}</b></div> }
  </pv-auth-marco>`
})
export class Verificar {
  auth = inject(AuthService); private store = inject(StoreService); private router = inject(Router);
  idx = [0, 1, 2, 3, 4, 5]; msg = signal(""); aviso = signal(""); cargando = signal(false);
  cajas = viewChildren<ElementRef<HTMLInputElement>>("ci");
  constructor() { if (!this.auth.pendiente) this.router.navigateByUrl("/login"); }
  correo() { return this.auth.pendiente?.correo || ""; }
  escribir(i: number, e: Event) {
    const el = e.target as HTMLInputElement;
    el.value = el.value.replace(/\D/g, "").slice(0, 1);
    if (el.value && this.cajas()[i + 1]) this.cajas()[i + 1].nativeElement.focus();
  }
  atras(i: number) { const el = this.cajas()[i].nativeElement; if (!el.value && i > 0) this.cajas()[i - 1].nativeElement.focus(); }
  private codigo() { return this.cajas().map(c => c.nativeElement.value).join(""); }
  async verificar() {
    if (this.cargando()) return;
    const codigo = this.codigo();
    if (!/^\d{6}$/.test(codigo)) { this.msg.set("Escriba el código de 6 dígitos."); return; }
    this.msg.set(""); this.aviso.set(""); this.cargando.set(true);
    try {
      const r = await this.auth.verificar2fa(codigo);
      if (r.ok) return;
      if (r.reiniciar) { if (r.msg) this.store.toast(r.msg); this.router.navigateByUrl("/login"); return; }
      this.msg.set(r.msg || "");
    } finally { this.cargando.set(false); }
  }
  async reenviar() {
    if (this.cargando()) return;
    this.msg.set(""); this.aviso.set(""); this.cargando.set(true);
    try {
      const r = await this.auth.reenviar2fa();
      if (r.ok) this.store.toast(r.msg || "Se envió un código nuevo.");
      else this.msg.set(r.msg || "No se pudo reenviar el código.");
    } finally { this.cargando.set(false); }
  }
}
