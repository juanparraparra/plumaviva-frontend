import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { StoreService } from "../../core/services/store.service";
import { CAPITULOS, GRUPOS, ParametrosService, Pesos } from "../../core/services/parametros.service";
import { Indicador } from "../../core/models/tipos";
import { IND1 } from "../../core/data/norma/indicadores-cap1";
import { IND2 } from "../../core/data/norma/indicadores-cap2";
import * as M from "../../core/engine/motor";
import { GCORTO, IMP_NIV, PRIO, PRIO_ICO, PRIO_REGLA } from "../../core/engine/tablas";
import { Modal } from "../../shared/modal";

type Pestana = "lista" | "pesos" | "niveles" | "importancia" | "muestreo";
const PESTANAS: { k: Pestana; t: string }[] = [
  { k: "lista", t: "Lista de chequeo" }, { k: "pesos", t: "Ponderaciones" }, { k: "niveles", t: "Clasificación" },
  { k: "importancia", t: "Importancia y acciones" }, { k: "muestreo", t: "Muestreo" }];
const ORDEN_G: Record<string, number> = { MBA: 0, MBR: 1, MBG: 2 };
const porGrupoYCodigo = (a: Indicador, b: Indicador) =>
  ORDEN_G[a.g] - ORDEN_G[b.g] || String(a.cod || a.id).localeCompare(String(b.cod || b.id), "es", { numeric: true });

@Component({
  selector: "pv-parametrizacion", imports: [NgTemplateOutlet, Modal], changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./parametrizacion.html"
})
export class Parametrizacion {
  private store = inject(StoreService);
  private par = inject(ParametrosService);

  readonly pestanas = PESTANAS; readonly capitulos = CAPITULOS; readonly grupos = GRUPOS;
  readonly escala = [4, 3, 2, 1]; readonly prioridades = [1, 2, 3, 4];
  readonly IMP = IMP_NIV; readonly PRIO = PRIO; readonly ICO = PRIO_ICO; readonly REGLA = PRIO_REGLA; readonly REINC = M.REINC_TXT;
  readonly GCORTO = GCORTO; readonly codeOf = M.codeOf;
  readonly cap1 = [...IND1].sort(porGrupoYCodigo); readonly cap2 = [...IND2].sort(porGrupoYCodigo);
  readonly editable = M.can("ADMIN");

  readonly tab = signal<Pestana>("lista");
  readonly detalle = signal<Indicador | null>(null);

  /** Borrador de pesos: no se aplica hasta guardar. */
  readonly borrador = signal<Pesos>(this.par.pesos);
  readonly sumas = computed(() => Object.fromEntries(CAPITULOS.map(c => [c, GRUPOS.reduce((s, g) => s + (this.borrador()[c][g] || 0), 0)])) as Record<string, number>);
  readonly pesosValidos = computed(() => CAPITULOS.every(c => this.sumas()[c] === 100));
  readonly hayCambios = computed(() => { this.store.v(); const base = this.par.pesos; return CAPITULOS.some(c => GRUPOS.some(g => base[c][g] !== this.borrador()[c][g])); });
  readonly errorPesos = signal("");

  readonly oblDesde = computed(() => { this.store.v(); return this.par.oblDesde; });
  readonly reincidencia = computed(() => { this.store.v(); return this.par.reincidencia; });
  readonly niveles = computed(() => { this.store.v(); return this.par.niveles; });

  /** Los indicadores leen la importancia desde el estado vivo, por eso dependen de la versión del store. */
  imp = (i: Indicador) => { this.store.v(); return M.impOf(i); };
  esObl = (i: Indicador) => { this.store.v(); return M.esObl(i); };
  prioriza(i: Indicador) {
    const base = this.esObl(i) ? [1, 2] : [2, this.imp(i) >= 2 ? 3 : 4];
    return base.map(p => `${PRIO_ICO[p]} ${PRIO[p][0]}`);
  }
  puntos = (n: number) => "●".repeat(n) + "○".repeat(4 - n);

  acciones = computed(() => {
    const i = this.detalle(); if (!i) return [];
    return ((M as any).RECMAP[i.id] || [i.id]).map((t: string) => (M as any).REC[t]).filter(Boolean).flatMap((r: any) => r.a as string[]);
  });
  meta = (i: Indicador) => (M as any).metaText(i) as string;

  setPeso(c: string, g: string, v: string) {
    this.errorPesos.set("");
    this.borrador.update(b => ({ ...b, [c]: { ...b[c as "I"], [g]: Math.max(0, Math.min(100, Number(v) || 0)) } }));
  }
  async guardarPesos() {
    const err = await this.par.guardarPesos(this.borrador());
    this.errorPesos.set(err ?? "");
  }
  descartarPesos() { this.borrador.set(this.par.pesos); this.errorPesos.set(""); }

  setImportancia(i: Indicador, v: string) { this.par.setImportancia(i.id, Number(v)); }
  setObl(v: string) { this.par.setObligatoriedad(Number(v)); }
  setReinc(e: Event) { this.par.setReincidencia((e.target as HTMLInputElement).checked); }
}
