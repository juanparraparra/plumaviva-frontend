import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { StoreService } from "../core/services/store.service";
import { AuthService } from "../core/services/auth.service";
import { DialogService } from "../core/services/dialog.service";
import { ICON, MENU, MENU_GRP } from "../core/data/menu";
import { LOGO } from "../shared/logo";
import { esc, fullName, rolDe, userById } from "../core/engine/motor";
import { ctx } from "../core/engine/contexto";
import { Asistente } from "../shared/asistente";

/** Marco de la aplicación autenticada: barra superior, menú por rol y contenido. */
@Component({
  selector: "pv-shell", imports: [RouterOutlet, RouterLink, RouterLinkActive, Asistente], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="proto-banner">Prototipo académico</div>
  <header class="topbar">
    <img class="logo" [src]="logo" alt="Logo PlumaViva"><div class="sep"></div>
    <div class="app-name">Bienestar Animal · Aves<small>Evaluación en aves de corral y de traspatio · Metodología EBA v2.0</small></div>
    <div class="spacer"></div>
    <button class="icon-btn" type="button" title="Notificaciones" (click)="notifs()">
      <svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 17V11a6 6 0 1112 0v6l2 2H4zM10 21h4" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      <span class="badge">{{ store.S.notifs.length }}</span></button>
    <div class="user-chip"><div class="avatar">{{ iniciales() }}</div><div><b>{{ nombre() }}</b><span>{{ rol().plat }}</span></div></div>
    <button class="btn sec sm" type="button" (click)="auth.logout()">Salir</button>
  </header>
  @if (store.errorCarga()) { <div class="alert err" style="margin:10px 18px">{{ store.errorCarga() }}</div> }
  <div class="layout">
    <nav class="sidebar">
      @for (g of grupos(); track g.n) {
        <div class="grp">{{ g.n }}</div>
        @for (m of g.items; track m) { <a [routerLink]="'/' + m" routerLinkActive="active"><svg viewBox="0 0 24 24" [innerHTML]="icono(m)"></svg>{{ menu[m] }}</a> }
      }
    </nav>
    <main class="content"><router-outlet />
      <div class="footer-note">{{ store.modoDemo ? 'Prototipo funcional sin base de datos · al recargar la página los datos vuelven al estado inicial.' : 'Conectado a la API y a la base de datos · los cambios se guardan automáticamente.' }}</div></main>
  </div>
  <pv-asistente />`
})
export class Shell {
  store = inject(StoreService); auth = inject(AuthService); dlg = inject(DialogService);
  logo = LOGO; menu = MENU;
  private router = inject(Router);
  constructor() {
    // Equivale al control de navegación de route(): reinicia filtros del plan, recuerda el origen del flujo y mantiene el asistente.
    this.router.events.subscribe(e => {
      if (!(e instanceof NavigationEnd)) return;
      const h = "#" + e.urlAfterRedirects, u = ctx.ui;
      if (h !== u.ROUTE_LAST) {
        u.PLAN_G = ""; u.PLAN_P = ""; u.PLAN_OB = false; u.PLAN_ORD = "prio"; u.FILTRO_KEEP.clear();
        const enFlujo = (x: string) => /^#\/(evaluacion|evaluacion-nueva|plan)(\/|$)/.test(x || "");
        if (!enFlujo(h)) u.EVAL_ORIGEN = ""; else if (!enFlujo(u.ROUTE_LAST)) u.EVAL_ORIGEN = u.ROUTE_LAST;
        u.ROUTE_LAST = h;
      }
      window.scrollTo(0, 0);
    });
  }
  rol = computed(() => { this.store.v(); const s = this.store.sesion(); return s ? rolDe(s) : { plat: "", menu: [] }; });
  usuario = computed(() => { this.store.v(); const s = this.store.sesion(); return s ? userById(s.id) : { nombres: "", apellidos: "" }; });
  nombre = computed(() => { const u = this.usuario(); return u.nombres ? fullName(u) : ""; });
  iniciales = computed(() => { const u = this.usuario(); return (u.nombres[0] || "") + (u.apellidos[0] || ""); });
  grupos = computed(() => {
    const out: { n: string; items: string[] }[] = [];
    this.rol().menu.forEach((m: string) => { const g = (MENU_GRP as any)[m]; const last = out[out.length - 1]; if (!last || last.n !== g) out.push({ n: g, items: [m] }); else last.items.push(m); });
    return out;
  });
  private san = inject(DomSanitizer);
  icono(m: string) { return this.san.bypassSecurityTrustHtml((ICON as any)[m]); }
  notifs() {
    const lis = this.store.S.notifs.map((n: any) => `<li>🔔 ${esc(n.t)} <span class="tiny muted">· ${esc(n.d)}</span></li>`).join("") || "<li>Sin notificaciones.</li>";
    this.dlg.abrir({ titulo: "Notificaciones", html: `<ul class="list-clean">${lis}</ul>`, okTxt: "Cerrar", cancelTxt: null });
  }
}
