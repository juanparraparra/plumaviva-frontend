import { Injectable, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { StoreService } from "./store.service";
import { CLAVE_DEMO } from "../data/demo/semilla-base";
import { ctx } from "../engine/contexto";
import { audit, fullName, userById, rolDe } from "../engine/motor";
import { environment } from "../../../environments/environment";
import { ApiService } from "../api/api.service";
import { usuarioDeApi } from "../api/mappers";
import {
  guardarToken, guardarTokenReset, limpiarToken, limpiarTokenReset, tokenActual, tokenReset,
  guardarTokenCambio, tokenCambio, limpiarTokenCambio, guardarDesafio2fa, leerDesafio2fa,
  limpiarDesafio2fa, limpiarPendientesAcceso, Desafio2fa
} from "../api/token";

export interface MensajeAuth { tipo: "err" | "warn"; msg: string }
export interface ResultadoVerificacion { ok: boolean; msg?: string; reiniciar?: boolean }
export interface ResultadoCambio { ok: boolean; msg?: string }

/** Acceso: login, doble factor real por correo y recuperación de contraseña.
 *  En modo demo se conserva el 2FA simulado para no depender de la API. */
@Injectable({ providedIn: "root" })
export class AuthService {
  private store = inject(StoreService);
  private router = inject(Router);
  private api = inject(ApiService);
  readonly modoDemo = environment.modoDemo;
  readonly claveDemo = CLAVE_DEMO;

  /** Desafío 2FA real. Se guarda en sessionStorage para sobrevivir a una recarga. */
  private desafio = signal<Desafio2fa | null>(leerDesafio2fa());
  readonly pendiente2fa = this.desafio.asReadonly();
  readonly codigoDesarrollo = signal("");

  usuariosDemo() {
    return this.store.S.users.filter((u: any) => u.estado === "ACTIVO").map((u: any) => ({
      correo: u.correo,
      etiqueta: rolDe(u).nombre + (this.store.S.users.filter((x: any) => x.estado === "ACTIVO" && x.rol === u.rol).length > 1 ? " · " + u.nombres.split(" ")[0] : "")
    }));
  }

  /** Restaura la sesión al recargar la página y carga los datos antes de navegar. */
  async arrancar(): Promise<void> {
    if (this.modoDemo || !tokenActual()) return;
    try {
      const u = usuarioDeApi(await this.api.get<any>("/auth/me"));
      // Una cuenta con cambio obligatorio no debe conservar una sesión anterior.
      if (u.debeCambiarPassword) {
        limpiarToken();
        this.store.setSesion(null);
        return;
      }
      this.store.setSesion({ id: u.id, rol: u.rol, rolPers: u.rolPers || "" });
      await this.store.cargar();
    } catch {
      limpiarToken();
      this.store.setSesion(null);
    }
  }

  /** Inicia sesión. Devuelve un mensaje de error/aviso o null si navegó al siguiente paso. */
  async login(correo: string, clave: string): Promise<MensajeAuth | null> {
    if (this.modoDemo) return this.loginDemo(correo, clave);
    try {
      const r = await this.api.post<any>("/auth/login", { correo: correo.trim().toLowerCase(), password: clave });

      if (r?.requiere_cambio && r?.token_cambio) {
        guardarTokenCambio(r.token_cambio);
        limpiarDesafio2fa();
        this.desafio.set(null);
        this.codigoDesarrollo.set("");
        await this.router.navigateByUrl("/cambiar-clave");
        return null;
      }

      if (r?.requiere_2fa && r?.desafio) {
        this.preparar2fa({ desafio: r.desafio, correo: r.correo_enmascarado || "" }, r.codigo_desarrollo);
        await this.router.navigateByUrl("/verificar");
        return null;
      }

      if (r?.token && r?.usuario) {
        await this.finalizarSesion(r.token, r.usuario);
        return null;
      }

      return { tipo: "err", msg: "El servidor no devolvió un método de acceso válido." };
    } catch (e: any) {
      return { tipo: "err", msg: e?.message || "No se pudo iniciar sesión." };
    }
  }

  private preparar2fa(datos: Desafio2fa, codigoDev?: string): void {
    this.desafio.set(datos);
    guardarDesafio2fa(datos);
    this.codigoDesarrollo.set(codigoDev || "");
  }

  /** Guarda el JWT, carga los datos y entra a la aplicación. */
  private async finalizarSesion(token: string, usuario: any): Promise<void> {
    guardarToken(token);
    limpiarPendientesAcceso();
    this.desafio.set(null);
    this.codigoDesarrollo.set("");
    const u = usuarioDeApi(usuario);
    this.store.setSesion({ id: u.id, rol: u.rol, rolPers: u.rolPers || "" });
    await this.store.cargar();
    await this.router.navigateByUrl("/inicio");
  }

  /* ------------------------------- Modo demo ------------------------------- */
  private loginDemo(correo: string, clave: string): MensajeAuth | null {
    const A = this.store.AUTH, mail = correo.trim().toLowerCase();
    const u = this.store.S.users.find((x: any) => x.correo === mail);
    A.tries = A.tries || {};
    if (A.lock && A.lock[mail] > Date.now()) return { tipo: "err", msg: "Cuenta bloqueada temporalmente por intentos fallidos. Intente más tarde o contacte al administrador." };
    if (!u || clave !== CLAVE_DEMO) {
      A.tries[mail] = (A.tries[mail] || 0) + 1;
      const left = 5 - A.tries[mail];
      if (left <= 0) { A.lock = A.lock || {}; A.lock[mail] = Date.now() + 15 * 60000; A.tries[mail] = 0; }
      return { tipo: "err", msg: "Correo o contraseña incorrectos." + (left > 0 ? ` Le quedan ${left} intentos.` : " La cuenta quedó bloqueada 15 minutos.") };
    }
    if (u.estado !== "ACTIVO") return { tipo: "warn", msg: `Su cuenta está ${u.estado.toLowerCase()}. Contacte al administrador.` };
    this.nuevoCodigo(u.id);
    this.router.navigateByUrl("/verificar");
    return null;
  }

  nuevoCodigo(id?: number): void {
    const A = this.store.AUTH; if (id != null) A.pending = id;
    A.code = String(Math.floor(100000 + Math.random() * 900000)); A.codeTries = 3; A.exp = Date.now() + 10 * 60000;
  }
  get pendiente() {
    if (this.modoDemo) return userById(this.store.AUTH.pending);
    const p = this.desafio();
    return p ? { correo: p.correo } : null;
  }
  get codigoSimulado(): string { return this.store.AUTH.code; }

  private verificarDemo(codigo: string): ResultadoVerificacion {
    const A = this.store.AUTH, u = userById(A.pending);
    if (!u) return { ok: false, reiniciar: true };
    if (Date.now() > A.exp) return { ok: false, msg: "El código venció. Solicite uno nuevo." };
    if (codigo !== A.code) {
      A.codeTries--;
      if (A.codeTries <= 0) { this.limpiar(); return { ok: false, reiniciar: true, msg: "Se agotaron los intentos. Inicie sesión de nuevo." }; }
      return { ok: false, msg: `Código incorrecto. Intentos restantes: ${A.codeTries}.` };
    }
    this.store.setSesion({ id: u.id, rol: u.rol, rolPers: u.rolPers || "" });
    this.limpiar(); audit("Inició sesión", fullName(u), { m: "Acceso" });
    this.router.navigateByUrl("/inicio");
    return { ok: true };
  }

  /** Verifica el código 2FA real (o el simulado en modo demo) y abre la sesión. */
  async verificar2fa(codigo: string): Promise<ResultadoVerificacion> {
    if (this.modoDemo) return this.verificarDemo(codigo);
    const p = this.desafio();
    if (!p) return { ok: false, reiniciar: true, msg: "No hay una verificación pendiente. Inicie sesión de nuevo." };
    try {
      const r = await this.api.post<any>("/auth/verificar-2fa", { desafio: p.desafio, codigo });
      await this.finalizarSesion(r.token, r.usuario);
      return { ok: true };
    } catch (e: any) {
      const msg = e?.message || "No se pudo verificar el código.";
      const reiniciar = /venció|usado|agotaron|inicie sesión/i.test(msg);
      return { ok: false, msg, reiniciar };
    }
  }

  async reenviar2fa(): Promise<{ ok: boolean; msg?: string }> {
    if (this.modoDemo) {
      this.nuevoCodigo();
      return { ok: true, msg: "Se envió un código nuevo." };
    }
    const p = this.desafio();
    if (!p) return { ok: false, msg: "No hay una verificación pendiente. Inicie sesión de nuevo." };
    try {
      const r = await this.api.post<any>("/auth/reenviar-2fa", { desafio: p.desafio });
      if (r?.desafio) this.preparar2fa({ desafio: r.desafio, correo: r.correo_enmascarado || p.correo }, r.codigo_desarrollo);
      return { ok: true, msg: "Se envió un código nuevo al correo registrado." };
    } catch (e: any) {
      return { ok: false, msg: e?.message || "No se pudo reenviar el código." };
    }
  }

  /** Cambio obligatorio de la clave temporal. Después continúa con el 2FA. */
  async cambiarPasswordInicial(actual: string, nueva: string, confirmar: string): Promise<ResultadoCambio> {
    const token = tokenCambio();
    if (!token) return { ok: false, msg: "El proceso de cambio venció. Inicie sesión de nuevo." };
    try {
      const r = await this.api.post<any>("/auth/cambiar-password-inicial", {
        token_cambio: token, actual, nueva, confirmar
      });
      limpiarTokenCambio();
      if (r?.requiere_2fa && r?.desafio) {
        this.preparar2fa({ desafio: r.desafio, correo: r.correo_enmascarado || "" }, r.codigo_desarrollo);
        await this.router.navigateByUrl("/verificar");
        return { ok: true };
      }
      await this.router.navigateByUrl("/login");
      return { ok: true, msg: r?.aviso || "Contraseña actualizada. Inicie sesión de nuevo." };
    } catch (e: any) {
      return { ok: false, msg: e?.message || "No se pudo cambiar la contraseña." };
    }
  }

  limpiar(): void {
    const A = this.store.AUTH;
    Object.keys(A).forEach(k => delete A[k]);
    limpiarPendientesAcceso();
    this.desafio.set(null);
    this.codigoDesarrollo.set("");
  }

  /** Solicita el enlace de recuperación. Devuelve true si hay un token utilizable (en desarrollo). */
  async recuperar(correo: string): Promise<boolean> {
    if (this.modoDemo) {
      const u = this.store.S.users.find((x: any) => x.correo === correo.trim().toLowerCase());
      this.store.AUTH.token = u ? u.id : null; return !!u;
    }
    try {
      const r = await this.api.post<any>("/auth/recuperar", { correo: correo.trim().toLowerCase() });
      if (r?.token) { guardarTokenReset(r.token); return true; }
      return false;
    } catch {
      return false;
    }
  }
  get hayToken(): boolean { return this.modoDemo ? !!this.store.AUTH.token : !!tokenReset(); }
  /** Hay un cambio obligatorio de clave temporal pendiente. */
  get hayCambioPendiente(): boolean { return this.modoDemo ? false : !!tokenCambio(); }

  /** Guarda la nueva contraseña con el token del enlace. */
  async restablecer(password: string): Promise<{ ok: boolean; msg?: string }> {
    if (this.modoDemo) return { ok: true };
    const token = tokenReset();
    if (!token) return { ok: false, msg: "El enlace no es válido o ya venció. Solicite uno nuevo." };
    try {
      await this.api.post("/auth/restablecer", { token, password });
      limpiarTokenReset();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, msg: e?.message || "No se pudo restablecer la contraseña." };
    }
  }

  async logout(): Promise<void> {
    if (!this.modoDemo) {
      try { await this.api.post("/auth/logout"); } catch { /* el token puede haber vencido */ }
      limpiarToken();
      limpiarPendientesAcceso();
    } else {
      const s = this.store.SES; if (s) audit("Cerró sesión", fullName(userById(s.id)), { m: "Acceso" });
    }
    limpiarTokenCambio();
    limpiarDesafio2fa();
    this.desafio.set(null);
    this.codigoDesarrollo.set("");
    ctx.ui.CHAT = { open: false, tab: "ia", msgs: [], ctx: {} };
    this.store.setSesion(null);
    await this.router.navigateByUrl("/login");
  }
}
