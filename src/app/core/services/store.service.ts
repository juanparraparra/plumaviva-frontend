import { Injectable, inject, signal } from "@angular/core";
import { environment } from "../../../environments/environment";
import { ctx, ROLES } from "../engine/contexto";
import * as M from "../engine/motor";
import { semillaBase, semillaUnidadesGrandes, normalizarDocumentos, semillaConsultas } from "../data/demo/semilla-base";
import { semillaEvaluaciones } from "../data/demo/semilla-evaluaciones";
import { ApiService } from "../api/api.service";
import {
  auditoriaDeApi, evaluacionDeApi, historicoDeApi, notificacionDeApi, unidadDeApi, usuarioDeApi
} from "../api/mappers";

export interface Aviso { id: number; msg: string }

/** Colecciones que se pueden volver a pedir al backend después de una mutación. */
export type Coleccion = "usuarios" | "unidades" | "evaluaciones" | "historico" | "notificaciones" | "auditoria" | "roles" | "parametros";

/** Estado de la aplicación. Los componentes leen `v()` para refrescarse tras cada cambio.
 *  En modo demo los datos son ficticios y viven en memoria; en modo real se cargan de la API. */
@Injectable({ providedIn: "root" })
export class StoreService {
  /** versión del estado: se incrementa en cada mutación (zoneless + signals) */
  readonly v = signal(0);
  readonly sesion = signal<any>(null);
  readonly avisos = signal<Aviso[]>([]);
  readonly denegado = signal<string>("");
  readonly cargando = signal(false);
  readonly errorCarga = signal<string>("");
  readonly modoDemo = environment.modoDemo;
  private api = inject(ApiService);
  private n = 0;

  constructor() {
    this.iniciar();
    if (!this.modoDemo) {
      // El motor es lógica pura: estos hooks son el único puente hacia la API.
      ctx.onAudit = (fila: any) => {
        this.api.post("/auditoria", {
          accion: fila.a, objeto: fila.o, modulo: fila.m,
          detalle: fila.det || [], motivo: fila.mot || ""
        }).catch(() => { /* la acción ya se hizo; no se bloquea por la auditoría */ });
      };
      ctx.onNotif = (t: string, d: string, usuarioId?: number) => {
        this.api.post("/notificaciones", { t, d, usuario_id: usuarioId }).catch(() => { /* opcional */ });
      };
    }
  }

  get S(): any { return ctx.S; }
  get SES(): any { return ctx.SES; }
  get AUTH(): any { return ctx.AUTH; }
  get PARAMS(): any { return ctx.PARAMS; }

  /** Carga inicial. Con modoDemo se usan los datos ficticios; sin él el estado queda vacío a la espera del backend. */
  iniciar(): void {
    if (this.modoDemo) {
      ctx.S = semillaBase();
      M.enrichHistorico();            // mismo orden que el prototipo: antes de las unidades grandes
      semillaUnidadesGrandes(); normalizarDocumentos(); semillaEvaluaciones(); semillaConsultas();
    } else {
      ctx.S = {
        users: [], unidades: [], historico: [], evaluaciones: [], audit: [], notifs: [], consultas: [],
        nextUser: 1, nextUnidad: 1, nextEval: 1, nextRol: 0
      };
    }
    this.touch();
  }

  touch(): void { this.v.update(x => x + 1); }
  setSesion(s: any): void { ctx.SES = s; this.sesion.set(s); this.touch(); }

  toast(msg: string, ms = 3200): void {
    const id = ++this.n;
    this.avisos.update(a => [...a, { id, msg }]);
    setTimeout(() => this.avisos.update(a => a.filter(x => x.id !== id)), ms);
  }

  /** Registra una notificación en la campana y la guarda en la base (si hay sesión real). */
  notificar(t: string, usuarioId?: number): void {
    const d = M.today().slice(8, 10) + "/" + M.today().slice(5, 7);
    ctx.S.notifs.unshift({ t, d });
    this.touch();
    ctx.onNotif?.(t, d, usuarioId);
  }

  /* ----------------------------- Carga desde la API ----------------------------- */

  /** Carga completa tras iniciar sesión o al restaurar una sesión existente. */
  async cargar(): Promise<void> {
    if (this.modoDemo) return;
    this.cargando.set(true); this.errorCarga.set("");
    try {
      const [usuarios, unidades, evaluaciones, parametros] = await Promise.all([
        this.api.get<any[]>("/usuarios"),
        this.api.get<any[]>("/unidades"),
        this.api.get<any[]>("/evaluaciones"),
        this.api.get<any>("/parametros")
      ]);
      ctx.S.users = (usuarios || []).map(usuarioDeApi);
      ctx.S.unidades = (unidades || []).map(unidadDeApi);
      ctx.S.evaluaciones = (evaluaciones || []).map(evaluacionDeApi);
      this.aplicarParametros(parametros);

      const [historico, notifs, roles] = await Promise.allSettled([
        // El consultor externo no tiene acceso al histórico detallado; se evita la petición que respondería 403.
        ctx.SES?.rol === "CONS" ? Promise.resolve([]) : this.api.get<any[]>("/historico"),
        this.api.get<any[]>("/notificaciones"),
        this.api.get<any>("/roles")
      ]);
      ctx.S.historico = historico.status === "fulfilled" ? (historico.value || []).map(historicoDeApi) : [];
      ctx.S.notifs = notifs.status === "fulfilled" ? (notifs.value || []).map(notificacionDeApi) : [];
      if (roles.status === "fulfilled") this.aplicarRoles(roles.value);

      ctx.S.audit = [];
      if (ctx.SES?.rol === "ADMIN") await this.cargarAuditoria();

      ctx.S.consultas = [];
      M.enrichHistorico();
    } catch (e: any) {
      this.errorCarga.set(e?.message || "No se pudieron cargar los datos del servidor.");
      throw e;
    } finally {
      this.cargando.set(false);
      this.touch();
    }
  }

  /** Vuelve a pedir una o varias colecciones después de una mutación. */
  async recargar(...partes: Coleccion[]): Promise<void> {
    if (this.modoDemo) return;
    try {
      for (const parte of partes) {
        switch (parte) {
          case "usuarios":
            ctx.S.users = (await this.api.get<any[]>("/usuarios") || []).map(usuarioDeApi);
            break;
          case "unidades":
            ctx.S.unidades = (await this.api.get<any[]>("/unidades") || []).map(unidadDeApi);
            break;
          case "evaluaciones":
            ctx.S.evaluaciones = (await this.api.get<any[]>("/evaluaciones") || []).map(evaluacionDeApi);
            break;
          case "historico":
            if (ctx.SES?.rol === "CONS") { ctx.S.historico = []; break; }
            ctx.S.historico = (await this.api.get<any[]>("/historico") || []).map(historicoDeApi);
            M.enrichHistorico();
            break;
          case "notificaciones":
            ctx.S.notifs = (await this.api.get<any[]>("/notificaciones") || []).map(notificacionDeApi);
            break;
          case "auditoria":
            await this.cargarAuditoria();
            break;
          case "roles":
            this.aplicarRoles(await this.api.get<any>("/roles"));
            break;
          case "parametros":
            this.aplicarParametros(await this.api.get<any>("/parametros"));
            break;
        }
      }
    } catch (e: any) {
      this.toast(e?.message || "No se pudo refrescar la información.");
    } finally {
      this.touch();
    }
  }

  private async cargarAuditoria(): Promise<void> {
    if (ctx.SES?.rol !== "ADMIN") { ctx.S.audit = []; return; }
    try { ctx.S.audit = ((await this.api.get<any[]>("/auditoria")) || []).map(auditoriaDeApi); }
    catch { ctx.S.audit = []; }
  }

  private aplicarParametros(p: any): void {
    if (!p) return;
    if (p.pesos) ctx.PARAMS.pesos = p.pesos;
    if (Array.isArray(p.niveles) && p.niveles.length) ctx.PARAMS.niveles = p.niveles;
    if (p.muestreo) ctx.PARAMS.muestreo = p.muestreo;
    if (Array.isArray(p.tabla3) && p.tabla3.length) ctx.PARAMS.tabla3 = p.tabla3;
    if (p.imp) ctx.PARAMS.imp = { ...(ctx.PARAMS.imp || {}), ...p.imp };
    if (p.obligatoriedad != null) ctx.PARAMS.oblDesde = Number(p.obligatoriedad);
    if (p.reincidencia != null) ctx.PARAMS.prio = { ...(ctx.PARAMS.prio || {}), reinc: !!p.reincidencia };
  }

  private aplicarRoles(datos: any): void {
    if (!datos) return;
    const servidor = Array.isArray(datos.roles) ? datos.roles : [];
    // Actualiza los roles existentes (incluidos los de la guía, que también se pueden renombrar)
    // y agrega los personalizados nuevos.
    for (const rol of servidor) {
      const actual = ROLES.find(r => r.id === rol.id);
      if (actual) {
        if (rol.nombre != null) actual.nombre = rol.nombre;
        if (rol.plat != null) actual.plat = rol.plat;
        if (rol.desc != null) actual.desc = rol.desc;
        if (Array.isArray(rol.menu)) actual.menu = [...rol.menu];
        if (rol.base !== undefined) actual.base = rol.base;
        if (rol.guia != null) actual.guia = rol.guia;
      } else {
        ROLES.push({ ...rol });
      }
    }
    // Quita los roles personalizados que ya no existen en el servidor.
    const ids = new Set(servidor.map((r: any) => r.id));
    for (let i = ROLES.length - 1; i >= 0; i--) {
      if (ROLES[i].base && !ids.has(ROLES[i].id)) {
        delete (M as any).PERM[ROLES[i].id];
        ROLES.splice(i, 1);
      }
    }
    // La matriz de permisos se aplica a todos los roles, incluidos los de la guía.
    for (const [id, permisos] of Object.entries(datos.perm || {})) {
      if (Array.isArray(permisos)) (M as any).PERM[id] = permisos.map(Number);
    }
    // Ningún rol personalizado puede conservar permisos que su perfil base ya no tiene.
    for (const rol of ROLES) {
      if (!rol.base) continue;
      const tope = (M as any).PERM[rol.base] || [];
      (M as any).PERM[rol.id] = ((M as any).PERM[rol.id] || []).map((v: number, i: number) => v && tope[i] ? 1 : 0);
    }
    ctx.S.nextRol = Number(datos.siguiente) || 0;
  }

  /** Guarda todos los roles (base y personalizados) y la matriz completa de permisos. */
  async guardarRoles(): Promise<void> {
    if (this.modoDemo) return;
    try {
      const roles = ROLES.map(r => ({ ...r, menu: [...(r.menu || [])] }));
      const perm: any = {};
      ROLES.forEach(r => { perm[r.id] = ((M as any).PERM[r.id] || []).map(Number); });
      await this.api.put("/roles", { roles, perm, siguiente: ctx.S.nextRol || 0 });
    } catch (e: any) {
      this.toast(e?.message || "No se pudieron guardar los roles.");
    }
  }
}
