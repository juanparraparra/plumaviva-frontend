import { Injectable, inject } from "@angular/core";
import { ctx } from "../engine/contexto";
import { EST_LAB } from "../engine/tablas";
import * as M from "../engine/motor";
import { StoreService } from "./store.service";
import { ApiService } from "../api/api.service";
import { evaluacionParaApi, evaluacionNuevaParaApi } from "../api/mappers";

export const MOTIVOS_ANULAR = ["Visita suspendida (clima, acceso o bioseguridad)", "El productor no autorizó la visita", "Error en la programación", "Se reprogramó en otra fecha", "Otro"];

const ESPERA_MS = 700;

/** Operaciones sobre evaluaciones con su trazabilidad y autoguardado contra la API. */
@Injectable({ providedIn: "root" })
export class EvaluacionesService {
  private store = inject(StoreService);
  private api = inject(ApiService);
  private temporizadores = new Map<number, any>();
  private colas = new Map<number, Promise<void>>();

  /** Anula una evaluación abierta: queda en el historial con su motivo y libera la unidad. */
  async anular(ev: any, motivo: string, detalle: string) {
    const mot = motivo + (detalle ? " · " + detalle : "");
    const anulada = { por: M.fullName(M.userById(ctx.SES.id)), fecha: M.today(), motivo: mot, estadoPrevio: ev.estado };
    if (!this.store.modoDemo) {
      try {
        await this.api.post(`/evaluaciones/${ev.id}/anular`, { motivo: mot, anulada });
        await this.store.recargar("evaluaciones");
      } catch (e: any) { this.store.toast(e?.message || "No se pudo anular la evaluación."); return; }
    } else {
      ev.anulada = anulada;
    }
    ev.estado = "ANULADA";
    M.audit("Anuló", "Evaluación " + ev.codigo, { m: "Evaluaciones", mot, det: [{ c: "Estado", a: EST_LAB[anulada.estadoPrevio] || anulada.estadoPrevio, d: "Anulada" }] });
    this.store.notificar(`Evaluación ${ev.codigo} anulada: ${mot}`, ev.insp);
    this.store.toast("Evaluación anulada. La unidad puede programar una nueva."); this.store.touch();
  }

  /** Autoguardado: en modo real se agrupa con debounce y se envía al backend. */
  guardado(ev: any, avisar = true) {
    if (this.store.modoDemo) {
      ev.saved = M.stamp().slice(0, 10) + " " + M.hhmm(M.now());
      if (avisar) this.store.touch();
      return;
    }
    if (!ev?.id) return;
    const previo = this.temporizadores.get(ev.id);
    if (previo) clearTimeout(previo);
    this.temporizadores.set(ev.id, setTimeout(() => {
      this.temporizadores.delete(ev.id);
      void this.enviar(ev);
    }, ESPERA_MS));
  }

  private enviar(ev: any): Promise<void> {
    const id = ev.id;
    const previo = this.colas.get(id) || Promise.resolve();
    const p = previo.catch(() => { /* el intento anterior no bloquea el siguiente */ }).then(async () => {
      try {
        await this.api.put(`/evaluaciones/${id}`, evaluacionParaApi(ev));
        ev.saved = M.stamp().slice(0, 10) + " " + M.hhmm(M.now());
        this.store.touch();
      } catch (e: any) {
        this.store.toast(e?.message || "No se pudo guardar la evaluación.");
      }
    });
    this.colas.set(id, p);
    return p;
  }

  /** Fuerza el envío de los cambios pendientes (antes de finalizar o anular). */
  async volcar(ev: any): Promise<void> {
    if (this.store.modoDemo || !ev?.id) return;
    const t = this.temporizadores.get(ev.id);
    if (t) { clearTimeout(t); this.temporizadores.delete(ev.id); }
    await this.enviar(ev);
  }

  /** Programa una evaluación nueva y notifica al inspector. */
  async crear(f: { unidad: number; sis: string; insp: number; fecha: string; hora: string; orden: string }): Promise<any> {
    let ev: any;
    if (this.store.modoDemo) {
      ev = M.newEval(f);
    } else {
      try {
        const plantilla = M.newEval(f);
        // newEval() deja la evaluación en memoria (modo demo); en modo real se quita y se reemplaza por la del servidor.
        ctx.S.evaluaciones = ctx.S.evaluaciones.filter((x: any) => x !== plantilla);
        const r = await this.api.post<{ id: number; codigo: string }>("/evaluaciones", evaluacionNuevaParaApi(plantilla, f));
        await this.store.recargar("evaluaciones");
        ev = M.evById(r.id) || { ...plantilla, id: r.id, codigo: r.codigo };
      } catch (e: any) {
        this.store.toast(e?.message || "No se pudo programar la evaluación.");
        throw e;
      }
    }
    M.audit("Creó", `Evaluación ${ev.codigo} · ${M.unidadById(ev.unidad).nombre}`, { m: "Evaluaciones", det: [{ c: "Evaluación", a: "—", d: `Programada · visita ${f.fecha} · inspector ${M.fullName(M.userById(ev.insp))}` }] });
    this.store.notificar(`Evaluación ${ev.codigo} asignada a ${M.fullName(M.userById(ev.insp))}`, ev.insp);
    this.store.toast("Evaluación programada y notificada al inspector."); this.store.touch();
    return ev;
  }

  /** Apertura: pasa de Programada a En curso. */
  async iniciar(ev: any) {
    ev.estado = "EN_PROCESO";
    if (this.store.modoDemo) {
      ev.saved = M.stamp().slice(0, 10) + " " + M.hhmm(M.now());
    } else {
      await this.volcar(ev);
    }
    M.audit("Inició", "Evaluación " + ev.codigo, { m: "Evaluaciones", det: [{ c: "Estado", a: "Programada", d: "En curso" }] });
    this.store.toast("Evaluación en proceso. Se guarda automáticamente."); this.store.touch();
  }

  cambioOrden(ev: any, orden: string) { ev.orden = orden; M.audit("Cambió orden de fases", ev.codigo + " · inicia " + orden); this.guardado(ev); }

  /** Selección de galpones (Tabla 3). Devuelve un aviso si la marca no es válida. */
  marcarGalpon(ev: any, cod: string, marcado: boolean): string {
    const max = M.maxGalpones(M.unidadById(ev.unidad));
    if (marcado) {
      if (ev.galpones.length >= max) { if (max === 1) ev.galpones = [cod]; else return `Tabla 3: máximo ${max} galpones para esta capacidad.`; }
      else ev.galpones.push(cod);
    } else {
      if (ev.galpones.length <= 1) return "Seleccione al menos un galpón.";
      ev.galpones = ev.galpones.filter((x: string) => x !== cod);
    }
    return "";
  }
  difiereDelSugerido(ev: any): boolean { return !!ev.galSug && ev.galpones.slice().sort().join() !== ev.galSug.slice().sort().join(); }
  volvioAlSugerido(ev: any) { if (ev.galMotivo) M.audit("Volvió al galpón sugerido", `${ev.codigo} · ${ev.galpones.join(", ")}`); ev.galMotivo = ""; this.guardado(ev); }
  confirmarCambioGalpon(ev: any, motivo: string) {
    ev.galMotivo = motivo;
    M.audit("Cambió el galpón sugerido", "Evaluación " + ev.codigo, { m: "Evaluaciones", mot: motivo, det: [{ c: "Galpón a evaluar", a: ev.galSug.join(", "), d: ev.galpones.join(", ") }] });
    this.guardado(ev);
  }

  adjuntar(ev: any, r: any, f: File): boolean {
    if (f.size > 10 * 1048576) { this.store.toast("El archivo supera 10 MB."); return false; }
    r.file = f.name; M.audit("Adjuntó evidencia", ev.codigo + " · " + f.name); this.guardado(ev); return true;
  }

  demo(ev: any) { M.autofill(ev, Math.floor(Math.random() * 1000) + 3); this.guardado(ev); this.store.toast("Se completaron valores de ejemplo para la presentación."); }

  async finalizar(ev: any) {
    const r = M.resultado(ev);
    if (!this.store.modoDemo) {
      await this.volcar(ev);
      try { await this.api.post(`/evaluaciones/${ev.id}/finalizar`); }
      catch (e: any) { this.store.toast(e?.message || "No se pudo finalizar la evaluación."); return; }
    }
    ev.estado = "FINALIZADA"; ev.finPor = ctx.SES.id; ev.finFecha = M.stamp();
    if (this.store.modoDemo) M.conciliar(ev);
    M.audit("Finalizó", "Evaluación " + ev.codigo + (ctx.SES.id !== ev.insp ? ` (en nombre de ${M.fullName(M.userById(ev.insp))})` : ""), { m: "Evaluaciones", det: [{ c: "Estado", a: "En curso", d: "Finalizada · por validar" }, { c: "Resultado", a: "—", d: `${M.fmt(r.total)} % · ${M.nivel(r.total)}` }] });
    if (ctx.SES.id !== ev.insp) this.store.notificar(`${M.rolDe(ctx.SES).nombre} finalizó la evaluación ${ev.codigo} asignada a usted`, ev.insp);
    this.store.notificar(`Resultado disponible: ${ev.codigo} (${M.nivel(r.total)})`);
    this.store.touch();
    if (!this.store.modoDemo) void this.store.recargar("evaluaciones");
  }

  async validar(ev: any) {
    if (!M.hasPerm("Validar evaluaciones") || ev.estado !== "FINALIZADA") return;
    if (!this.store.modoDemo) {
      const r = M.resultado(ev);
      const grupos = Object.fromEntries(Object.entries(r.grupos).map(([k, v]: any) => [k, v.pct]));
      const det = Object.fromEntries(r.inds.filter((x: any) => x.pct != null).map((x: any) => [x.ind.id, x.pct]));
      try {
        await this.api.post(`/evaluaciones/${ev.id}/validar`, { total: r.total, grupos, det });
        await this.store.recargar("evaluaciones", "historico");
      } catch (e: any) { this.store.toast(e?.message || "No se pudo validar la evaluación."); return; }
    }
    ev.estado = "VALIDADA"; ev.validada = M.stamp();
    M.audit("Validó", "Evaluación " + ev.codigo, { m: "Evaluaciones", det: [{ c: "Estado", a: "Finalizada · por validar", d: "Validada" }] });
    this.store.toast("Resultado validado."); this.store.touch();
  }
}
