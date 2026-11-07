import { Injectable, inject } from "@angular/core";
import { ctx } from "../engine/contexto";
import * as M from "../engine/motor";
import { StoreService } from "./store.service";
import { ApiService } from "../api/api.service";
import { unidadParaApi } from "../api/mappers";

export const MOTIVOS_INHABILITAR: Record<string, string[]> = M.MOT_INHAB;
export const MOTIVOS_REHABILITAR = ["Se levantó la suspensión sanitaria", "Se reanudó la actividad", "Cambio de propietario formalizado", "Inhabilitación registrada por error", "Otro"];

/** Operaciones sobre unidades productivas con su trazabilidad. */
@Injectable({ providedIn: "root" })
export class UnidadesService {
  private store = inject(StoreService);
  private api = inject(ApiService);
  private get quien() { return M.fullName(M.userById(ctx.SES.id)); }

  async inhabilitar(u: any, o: { tipo: string; motivo: string; detalle: string }) {
    const reg = { ...o, fecha: M.today(), por: this.quien };
    const nuevo = { ...u, estado: "INACTIVA", inhab: reg, movs: (u.movs || []).concat({ ...reg, accion: "Inhabilitada" }) };
    if (this.store.modoDemo) {
      Object.assign(u, nuevo);
    } else {
      try {
        await this.api.put(`/unidades/${u.id}`, unidadParaApi(nuevo));
        await this.store.recargar("unidades");
      } catch (e: any) { this.store.toast(e?.message || "No se pudo inhabilitar la unidad."); return; }
    }
    M.audit("Inhabilitó", "Unidad productiva " + u.nombre, { m: "Unidades productivas", mot: `${o.motivo} · ${o.detalle}`, det: [{ c: "Estado", a: "ACTIVA", d: `INHABILITADA (${o.tipo.toLowerCase()})` }] });
    this.store.toast("Unidad inhabilitada. Su historial se conserva."); this.store.touch();
  }

  async rehabilitar(u: any, o: { motivo: string; detalle: string }) {
    const reg = { ...o, fecha: M.today(), por: this.quien };
    const nuevo = { ...u, estado: "ACTIVA", inhab: null, movs: (u.movs || []).concat({ ...reg, accion: "Rehabilitada" }) };
    if (this.store.modoDemo) {
      Object.assign(u, nuevo);
    } else {
      try {
        await this.api.put(`/unidades/${u.id}`, unidadParaApi(nuevo));
        await this.store.recargar("unidades");
      } catch (e: any) { this.store.toast(e?.message || "No se pudo rehabilitar la unidad."); return; }
    }
    M.audit("Rehabilitó", "Unidad productiva " + u.nombre, { m: "Unidades productivas", mot: `${o.motivo} · ${o.detalle}`, det: [{ c: "Estado", a: "INHABILITADA", d: "ACTIVA" }] });
    this.store.toast("Unidad rehabilitada: ya puede programarse una nueva evaluación."); this.store.touch();
  }

  /** Solo se elimina un registro repetido que no tiene historial. */
  async eliminarDuplicada(u: any, conservada: any, detalle: string) {
    if (this.store.modoDemo) {
      ctx.S.unidades = ctx.S.unidades.filter((x: any) => x.id !== u.id);
    } else {
      try {
        await this.api.delete(`/unidades/${u.id}`);
        await this.store.recargar("unidades");
      } catch (e: any) { this.store.toast(e?.message || "No se pudo eliminar la unidad."); return; }
    }
    M.audit("Eliminó", "Unidad productiva " + u.nombre, { m: "Unidades productivas", mot: detalle, det: [{ c: "Unidad productiva", a: `${u.nombre} · ${u.mun}`, d: `Eliminada: duplicado de ${conservada.nombre}` }] });
    this.store.toast("Registro duplicado eliminado."); this.store.touch();
  }

  /** Aplica una edición ya confirmada y la deja en el historial de cambios de la unidad. */
  async aplicarCambios(u: any, nuevo: any, df: any[], motivo: string) {
    const sn = M.unitSnaps(u.id), ult = sn[sn.length - 1], ab = M.evAbierta(u.id);
    const reg = {
      fecha: M.today(), por: this.quien, rol: ctx.SES.rolPers || ctx.SES.rol, motivo,
      ref: { ultima: ult ? `${ult.codigo} (${ult.fecha})` : "", abierta: ab ? ab.codigo : "" },
      items: df.map(({ grupo, campo, antes, despues }) => ({ grupo, campo, antes, despues }))
    };
    const cambios = (nuevo.cambios || u.cambios || []).concat(reg);
    if (this.store.modoDemo) {
      Object.assign(u, nuevo); u.cambios = cambios;
    } else {
      try {
        await this.api.put(`/unidades/${u.id}`, unidadParaApi({ ...nuevo, cambios }));
        await this.store.recargar("unidades");
      } catch (e: any) { this.store.toast(e?.message || "No se pudieron guardar los cambios."); return; }
    }
    M.audit("Editó", "Unidad productiva " + u.nombre, { m: "Unidades productivas", mot: motivo, det: df.map(d => ({ c: `${d.grupo} · ${d.campo}`, a: d.antes, d: d.despues })) });
    this.store.toast("Cambios guardados y registrados en el historial de la unidad."); this.store.touch();
  }

  /** Registra una unidad nueva y devuelve su id. */
  async crear(base: any): Promise<number> {
    if (this.store.modoDemo) {
      base.id = ctx.S.nextUnidad++; ctx.S.unidades.push(base);
    } else {
      try {
        const r = await this.api.post<{ id: number }>("/unidades", unidadParaApi(base));
        await this.store.recargar("unidades");
        base.id = r.id;
      } catch (e: any) {
        this.store.toast(e?.message || "No se pudo registrar la unidad.");
        throw e;
      }
    }
    M.audit("Creó", "Unidad productiva " + base.nombre, { m: "Unidades productivas", det: [{ c: "Unidad productiva", a: "—", d: `${base.nombre} · ${base.mun}, ${base.depto} · ${M.int(M.totalAves(base))} aves · ${base.galpones.length} galpón(es)` }] });
    this.store.toast("Unidad productiva registrada."); this.store.touch();
    return base.id;
  }
}
