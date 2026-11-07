/** Iconos de acción (24×24, trazo). Datos estructurados: no se inyecta HTML. */
export type Trazo = { d?: string; cx?: number; cy?: number; r?: number };
export const ICONOS: Record<string, Trazo[]> = {
  ficha: [{ d: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" }, { cx: 12, cy: 12, r: 3 }],
  editar: [{ d: "M4 20h4L19 9l-4-4L4 16z" }, { d: "M13 7l4 4" }],
  evaluar: [{ d: "M9 3h6v3H9z" }, { d: "M6 5h12v16H6z" }, { d: "M9 14l2 2 4-4" }],
  seguir: [{ d: "M4 4h5v16H4z" }, { d: "M10 4h5v10h-5z" }, { d: "M16 4h4v13h-4z" }],
  resultado: [{ d: "M5 20V11M12 20V4M19 20v-6" }],
  plan: [{ d: "M9 6h12M9 12h12M9 18h12" }, { d: "M3 6l1.2 1.2L6 5M3 12l1.2 1.2L6 11M3 18l1.2 1.2L6 17" }],
  historial: [{ cx: 12, cy: 12, r: 9 }, { d: "M12 7v5l3 2" }],
};
