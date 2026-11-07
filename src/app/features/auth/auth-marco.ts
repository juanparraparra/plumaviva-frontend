import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ctx } from "../../core/engine/contexto";
import { LOGO, LOGO_W } from "../../shared/logo";

/** Marco visual de las pantallas de acceso (panel lateral + caja). */
@Component({
  selector: "pv-auth-marco", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="proto-banner">Prototipo académico</div>
  <div class="auth">
    <section class="auth-side"><div><img [src]="logoW" alt="Logo PlumaViva" style="height:54px"></div>
      <div><h1>Evaluación de bienestar animal en aves de corral y de traspatio</h1>
      <p>Plataforma para aplicar la Metodología EBA (v2.0, 2024): registro de unidades productivas, evaluación por fases, cálculo automático, diagnóstico y hallazgos críticos.</p></div>
      <p class="small">Medidas basadas en el animal · en los recursos · en la gestión</p><div class="stripe"></div></section>
    <section class="auth-main"><div class="auth-box"><img class="logo" [src]="logo" alt="Logo PlumaViva"><ng-content /></div></section>
  </div>`
})
export class AuthMarco { logo = LOGO; logoW = LOGO_W; constructor() { ctx.ui.CHAT = { open: false, tab: "ia", msgs: [], ctx: {} }; } }
