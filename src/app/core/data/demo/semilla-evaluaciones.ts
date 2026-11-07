/* DATOS DE DEMOSTRACIÓN · evaluaciones de ejemplo y utilidad "completar valores" (solo modo demo). */
// @ts-nocheck
import { ctx } from "../../engine/contexto";
import { newEval, getR, applies, indsOf, keysFor, indById } from "../../engine/motor";

export function rnd(seedv) { let s = seedv; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
export function autofill(ev, seedv = 7, good = 0.72) {
  const R = rnd(seedv), pick = () => { const x = R(); return x < good ? 2 : x < good + 0.2 ? 1 : 0; };
  indsOf(ev).filter(i => applies(i, ev)).forEach(ind => keysFor(ind, ev).forEach(gk => {
    const r = getR(ev, gk, ind);
    if (ind.k === "grid") { if (r.pp) r.pp = r.pp.map(() => { const n = 15 + Math.floor(R() * 4), c = [0, 0, 0]; for (let i = 0; i < n; i++) c[2 - pick()]++; return { n, c2: c[0], c1: c[1], c0: c[2] }; }); else r.units = r.units.map(pick); }
    if (ind.k === "cc") r.units = r.units.map(() => [2, 3, 3, 4, 3][Math.floor(R() * 5)]);
    if (ind.k === "scale" && !r.auto) r.v = pick();
    if (ind.k === "check") { const ok = R() < 0.8; r.checks = r.checks.map((c, i) => ok || i % 2 === 0); r.touched = true; if (ind.g === "MBG") r.doc = r.checks.every(Boolean) ? "APORTADO" : "NO_APORTADO"; }
    if (ind.k === "pct") r.pct = Math.round(R() * 45);
    if (ind.k === "mort") { r.pct = ev.sis === "POLLO_ENGORDE" ? 5.4 : 11.2; }
    if (ind.id === "MBG-09") r.file = "certificados_eutanasia.pdf";
  }));
}
export function semillaEvaluaciones() {
  // Granja Demostración: calificación validada en mayo (sigue a las dos del histórico) y visita de seguimiento en curso, incompleta
  const c = newEval({ unidad: 1, sis: "POLLO_ENGORDE", insp: 3, fecha: "2026-05-12", hora: "07:30" });
  c.atiende = "Administrador de ejemplo"; c.consent = true; autofill(c, 23, 0.74);
  c.estado = "VALIDADA"; c.finPor = 3; c.finFecha = "2026-05-12 16:10"; c.validada = "2026-05-15 09:20"; c.saved = "2026-05-12 16:10";
  const a = newEval({ unidad: 1, sis: "POLLO_ENGORDE", insp: 3, fecha: "2026-10-14", hora: "07:30" });
  a.atiende = "Administrador de ejemplo"; a.consent = true; a.estado = "EN_PROCESO"; autofill(a, 41, 0.86);
  Object.keys(a.resp).forEach(k => { const g = indById(k.split("|")[1]).g; if (g !== "MBR") delete a.resp[k]; });
  a.saved = "2026-10-14 11:52";
  const b = newEval({ unidad: 2, sis: "PONEDORA_PISO", insp: 3, fecha: "2026-10-03", orden: "MBA" });
  b.estado = "FINALIZADA"; b.atiende = "Operario de ejemplo"; b.consent = true; autofill(b, 11, 0.8); b.saved = "2026-10-03 15:40"; b.finPor = 3; b.finFecha = "2026-10-03 15:40";
  b.resp["U|MBG-07"].doc = "PENDIENTE";
  // Granja El Porvenir (72.000 aves): calificación validada con 2 galpones; la siguiente visita queda por programar
  const d = newEval({ unidad: 4, sis: "POLLO_ENGORDE", insp: 3, fecha: "2026-06-10", hora: "07:00" });
  d.atiende = "Administrador de ejemplo"; d.consent = true; autofill(d, 57, 0.7);
  ["MBR-02", "MBR-04"].forEach(id => { const r = getR(d, "G-01", indById(id)); r.units = r.units.map((v, i) => i % 3 ? 0 : 1); });   // incumplimientos en G-01
  getR(d, "G-01", indById("MBA-01")).pct = 72;
  d.estado = "VALIDADA"; d.finPor = 3; d.finFecha = "2026-06-10 17:05"; d.validada = "2026-06-12 10:00"; d.saved = "2026-06-10 17:05";
  // Avícola San Rafael (96.000 aves, ponedora en jaula): sin calificaciones, primera visita (línea base)
}

/* =============================== lista =============================== */
