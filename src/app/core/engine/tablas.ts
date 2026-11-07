/** Vistas tipadas de las tablas del motor (el motor aún usa objetos literales con claves numéricas). */
import * as M from "./motor";

export const IMP_NIV = M.IMP_NIV as Record<number, { n: string; d: string }>;
export const PRIO = M.PRIO as Record<number, string[]>;
export const PRIO_ICO = M.PRIO_ICO as Record<number, string>;
export const PRIO_REGLA = M.PRIO_REGLA as Record<number, string>;
export const GCORTO = M.GCORTO as Record<string, string>;
export const EST_LAB = M.EST_LAB as Record<string, string>;
