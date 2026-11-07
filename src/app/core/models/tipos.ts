/* Tipos del dominio. El motor es deliberadamente flexible (any) en las respuestas de captura,
   porque cada tipo de indicador (grid, check, ratio, densidades…) guarda una forma distinta. */
export type GrupoMB = "MBA" | "MBR" | "MBG";
export type Capitulo = "I" | "II";
export type RolId = "ADMIN" | "COORD" | "INSP" | "CONS" | "PROD" | "RT" | string;

export interface Indicador {
  id: string; g: GrupoMB; n: string; num: string; tab: string; preg?: string; met: string; uni?: string;
  jaula?: boolean; piso?: boolean; engorde?: boolean; pon?: boolean; pol?: boolean;
  f?: string; p2: string; p1: string; p0: string; cap: Capitulo; k: string;
  cnt?: number; u?: string; rule?: string; crit?: string[]; min?: number[]; evid?: boolean; what?: string;
  cod?: string; ilus?: number;
}
export interface RolDef {
  id: RolId; nombre: string; guia: string; plat: string; desc: string; menu: string[]; base?: string;
}
export type EstadoEvaluacion = "BORRADOR" | "EN_PROCESO" | "FINALIZADA" | "VALIDADA" | "ANULADA" | "CERRADA";
