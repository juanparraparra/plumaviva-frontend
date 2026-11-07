import { Injectable, inject } from "@angular/core";
import { ctx } from "../engine/contexto";
import * as M from "../engine/motor";
import { IMP_NIV, GCORTO } from "../engine/tablas";
import { Capitulo, GrupoMB } from "../models/tipos";
import { StoreService } from "./store.service";
import { ApiService } from "../api/api.service";

export type Pesos = Record<Capitulo, Record<GrupoMB, number>>;
export const CAPITULOS: Capitulo[] = ["I", "II"];
export const GRUPOS: GrupoMB[] = ["MBA", "MBR", "MBG"];

/** Cambios de parametrización con su registro en el control de cambios y persistencia en la API. */
@Injectable({ providedIn: "root" })
export class ParametrosService {
  private store = inject(StoreService);
  private api = inject(ApiService);
  private get P(): any { return ctx.PARAMS; }

  get pesos(): Pesos { return structuredClone(this.P.pesos); }
  get oblDesde(): number { return this.P.oblDesde; }
  get reincidencia(): boolean { return this.P.prio.reinc; }
  get niveles(): { n: string; min: number }[] { return this.P.niveles; }

  /** Devuelve un error de validación o guarda y registra solo lo que cambió. */
  async guardarPesos(nuevos: Pesos): Promise<string | null> {
    for (const c of CAPITULOS) {
      const suma = GRUPOS.reduce((a, g) => a + (nuevos[c][g] ?? 0), 0);
      if (suma !== 100) return `Los pesos del capítulo ${c} deben sumar 100 %.`;
    }
    const antes = this.pesos, det: { c: string; a: string; d: string }[] = [];
    for (const c of CAPITULOS) for (const g of GRUPOS) {
      if (antes[c][g] !== nuevos[c][g]) det.push({ c: `Capítulo ${c} · ${GCORTO[g]} (${g})`, a: antes[c][g] + " %", d: nuevos[c][g] + " %" });
    }
    if (!det.length) return null;
    if (!this.store.modoDemo) {
      try { await this.api.put("/parametros/pesos", { valor: nuevos }); }
      catch (e: any) { return e?.message || "No se pudieron guardar los pesos."; }
    }
    this.P.pesos = structuredClone(nuevos);
    M.audit("Editó", "Ponderaciones (Tabla 1)", { m: "Parametrización", det });
    this.store.toast("Pesos guardados: los resultados se recalculan.");
    this.store.touch();
    return null;
  }

  async setImportancia(id: string, nivel: number): Promise<void> {
    const ind = M.indById(id), antes = M.impOf(ind);
    if (antes === nivel) return;
    const previo = this.P.imp[id];
    this.P.imp[id] = nivel;
    this.store.touch();
    if (!this.store.modoDemo) {
      try { await this.api.put("/parametros/imp", { valor: this.P.imp }); }
      catch (e: any) {
        this.P.imp[id] = previo; this.store.touch();
        this.store.toast(e?.message || "No se pudo guardar la importancia.");
        return;
      }
    }
    M.audit("Editó", "Importancia del indicador " + M.codeOf(ind), { m: "Parametrización", det: [{ c: "Importancia", a: IMP_NIV[antes].n, d: IMP_NIV[nivel].n }] });
    this.store.toast("Importancia actualizada: los planes de mejora se recalculan.");
  }

  async setObligatoriedad(nivel: number): Promise<void> {
    const antes = this.P.oblDesde;
    if (antes === nivel) return;
    this.P.oblDesde = nivel;
    this.store.touch();
    if (!this.store.modoDemo) {
      try { await this.api.put("/parametros/obligatoriedad", { valor: nivel }); }
      catch (e: any) {
        this.P.oblDesde = antes; this.store.touch();
        this.store.toast(e?.message || "No se pudo guardar el umbral.");
        return;
      }
    }
    M.audit("Editó", "Umbral de obligatoriedad", { m: "Parametrización", det: [{ c: "Obligatorios desde el nivel", a: IMP_NIV[antes].n, d: IMP_NIV[nivel].n }] });
    this.store.toast("Umbral de obligatoriedad actualizado.");
  }

  async setReincidencia(activa: boolean): Promise<void> {
    const antes = this.P.prio.reinc;
    if (antes === activa) return;
    this.P.prio.reinc = activa;
    this.store.touch();
    if (!this.store.modoDemo) {
      try { await this.api.put("/parametros/reincidencia", { valor: activa }); }
      catch (e: any) {
        this.P.prio.reinc = antes; this.store.touch();
        this.store.toast(e?.message || "No se pudo guardar la regla de reincidencia.");
        return;
      }
    }
    M.audit("Editó", "Reincidencia sube la prioridad", { m: "Parametrización", det: [{ c: "Regla activa", a: antes ? "Sí" : "No", d: activa ? "Sí" : "No" }] });
    this.store.toast("Regla de reincidencia actualizada.");
  }
}
