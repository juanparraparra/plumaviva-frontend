import { describe, expect, it, beforeAll } from "vitest";
import { ctx } from "./contexto";
import * as M from "./motor";
import { semillaBase, semillaUnidadesGrandes, normalizarDocumentos, semillaConsultas } from "../data/demo/semilla-base";
import { semillaEvaluaciones } from "../data/demo/semilla-evaluaciones";

/** Valores de referencia obtenidos ejecutando el prototipo HTML v6 Final 3 (paridad verificada). */
describe("Motor EBA · paridad con el prototipo", () => {
  beforeAll(() => {
    ctx.S = semillaBase(); M.enrichHistorico(); semillaUnidadesGrandes(); normalizarDocumentos(); semillaEvaluaciones(); semillaConsultas();
  });
  const ev = (c: string) => ctx.S.evaluaciones.find((e: any) => e.codigo === c);

  it("calcula el total de una evaluación validada (norma 5.3)", () => {
    const r: any = M.resultado(ev("V-2026-0301"));
    expect(r.total).toBeCloseTo(88.1605, 3);
    expect(r.grupos.MBA.pct).toBeCloseTo(90.2999, 3);
    expect(r.grupos.MBR.pct).toBeCloseTo(84.4444, 3);
    expect(r.grupos.MBG.pct).toBeCloseTo(90, 6);
    expect(r.criticos.map((x: any) => x.ind.id)).toEqual(["MBG-07"]);
  });
  it("una evaluación incompleta reporta indicadores faltantes", () => {
    expect((M.resultado(ev("V-2026-0302")) as any).faltan.length).toBe(19);
  });
  it("Tabla 3: más de 50.000 aves exige dos galpones", () => {
    expect((M as any).maxGalpones({ capacidad: 45000 })).toBe(1);
    expect((M as any).maxGalpones({ capacidad: 72000 })).toBe(2);
  });
  it("niveles de bienestar (Tabla 2)", () => {
    expect([95, 80, 60, 20].map((x) => M.nivel(x))).toEqual(["EXCELENTE", "ALTO", "MEDIO", "BAJO"]);
  });
  it("Capítulo II no pondera MBG", () => { expect(ctx.PARAMS.pesos.II).toEqual({ MBA: 60, MBR: 40, MBG: 0 }); });
});
