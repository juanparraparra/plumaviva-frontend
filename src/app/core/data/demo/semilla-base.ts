/* DATOS DE DEMOSTRACIÓN (ficticios) · no son parte de la funcionalidad.
   Solo se cargan en modo demo (environment.modoDemo). En producción los entrega el backend (NestJS + MariaDB). */
// @ts-nocheck
import { ctx } from "../../engine/contexto";

export const CLAVE_DEMO = "Demo2026*";
export function semillaBase() {
  return {
    users: [
      { id: 1, nombres: "Andrés Felipe", apellidos: "Rojas Medina", doc: "CC 1.010.000.001", correo: "admin@demo.co", tel: "300 000 0001", rol: "ADMIN", estado: "ACTIVO", historial: true, seccional: "Nivel central" },
      { id: 2, nombres: "Luz Marina", apellidos: "Cárdenas Pinzón", doc: "CC 1.010.000.002", correo: "coordinadora@demo.co", tel: "300 000 0002", rol: "COORD", estado: "ACTIVO", historial: true, seccional: "Seccional Cundinamarca" },
      { id: 3, nombres: "Camilo Andrés", apellidos: "Peña Rincón", doc: "CC 1.010.000.003", correo: "inspector@demo.co", tel: "300 000 0003", rol: "INSP", estado: "ACTIVO", historial: true, seccional: "Seccional Cundinamarca", matricula: "MV 00000 · vigente" },
      { id: 4, nombres: "Daniela", apellidos: "Torres Bermúdez", doc: "CC 1.010.000.004", correo: "consultora@demo.co", tel: "300 000 0004", rol: "CONS", estado: "ACTIVO", historial: false, vence: "31/12/2026" },
      { id: 5, nombres: "Hernán Darío", apellidos: "Mejía Ortiz", doc: "NIT 900.000.000-0", correo: "productor@demo.co", tel: "300 000 0005", rol: "PROD", estado: "ACTIVO", historial: true },
      { id: 6, nombres: "Rosa Elena", apellidos: "Quintero de Ávila", doc: "CC 1.010.000.006", correo: "productora@demo.co", tel: "310 000 0006", rol: "PROD", estado: "ACTIVO", historial: true },
      { id: 7, nombres: "Jorge Iván", apellidos: "Salazar Gómez", doc: "CC 1.010.000.007", correo: "tecnico@demo.co", tel: "300 000 0007", rol: "RT", estado: "ACTIVO", historial: true, matricula: "MVZ 00000 · vigente" },
      { id: 8, nombres: "Usuario", apellidos: "Nuevo Sin Historial", doc: "CC 1.010.000.008", correo: "nuevo@demo.co", tel: "300 000 0008", rol: "INSP", estado: "ACTIVO", historial: false, seccional: "Seccional Tolima" }
    ],
    unidades: [
      { id: 1, nombre: "Granja Demostración", codigo: "Por definir", propietario: 5, operario: "Administrador de ejemplo", rt: 7, capacidad: 45000, gab: true, gabVence: "2027-03-31",
        depto: "Cundinamarca", mun: "Silvania", vereda: "Vereda de ejemplo", dir: "Km 5 vía de ejemplo", indic: "", coordSis: "GEO", lat: 4.4031, lon: -74.3880, estado: "ACTIVA",
        especies: [{ sis: "POLLO_ENGORDE", pastoreo: false }],
        galpones: [{ cod: "G-01", tipo: "TUNEL", area: 1000, beb: 1400, com: 300, refB: 12, refC: 45, ext: 0, aves: 14700, edad: 42, unidad: "días", grupo: "Finalización (22 días – salida)" },
                   { cod: "G-02", tipo: "TUNEL", area: 1000, beb: 1400, com: 320, refB: 12, refC: 45, ext: 0, aves: 14820, edad: 35, unidad: "días", grupo: "Finalización (22 días – salida)" },
                   { cod: "G-03", tipo: "ABIERTO_MEC", area: 1000, beb: 1300, com: 300, refB: 12, refC: 45, ext: 0, aves: 14900, edad: 28, unidad: "días", grupo: "Finalización (22 días – salida)" }] },
      { id: 2, nombre: "Granja Las Palmas", codigo: "Por definir", propietario: 5, operario: "Operario de ejemplo", rt: 7, capacidad: 12000, gab: true, gabVence: "2026-11-05",
        depto: "Santander", mun: "Lebrija", vereda: "Vereda de ejemplo", dir: "", indic: "Después de la escuela, 2 km", coordSis: "POLAR", lat: null, lon: null, estado: "ACTIVA",
        especies: [{ sis: "PONEDORA_PISO", pastoreo: true }],
        galpones: [{ cod: "P-01", tipo: "ABIERTO", area: 1100, beb: 900, com: 260, refB: 12, refC: 45, ext: 1800, aves: 11800, edad: 40, unidad: "semanas", grupo: "Producción (≥ 18 sem.)" }] },
      { id: 3, nombre: "Predio La Esperanza", codigo: "—", propietario: 6, operario: "La misma propietaria", rt: null, capacidad: 60, gab: false, gabVence: "",
        depto: "Cundinamarca", mun: "Fusagasugá", vereda: "Vereda San Isidro", dir: "", indic: "Junto a la escuela, dos curvas arriba", coordSis: "GEO", lat: 4.3372, lon: -74.3638, estado: "ACTIVA",
        especies: [{ sis: "TRAS_PONEDORA", pastoreo: false }, { sis: "TRAS_POLLO", pastoreo: false }],
        galpones: [{ cod: "Corral 1", tipo: "", area: 8, beb: 2, com: 2, refB: 0, refC: 0, ext: 0, patio: 20, aves: 24, edad: 40, unidad: "semanas", grupo: "Gallinas ponedoras" },
                   { cod: "Patio", tipo: "", area: 2, beb: 1, com: 1, refB: 0, refC: 0, ext: 0, patio: 0, aves: 14, edad: 6, unidad: "semanas", grupo: "Pollos de engorde" }] }
    ],
    historico: [   // evaluaciones cerradas (resumen) para el tablero e historial
      { codigo: "V-2024-0098", unidad: 1, fecha: "2024-09-03", total: 65.0, g: { MBR: 66, MBA: 70, MBG: 58 } },
      { codigo: "V-2025-0142", unidad: 1, fecha: "2025-10-12", total: 72.1, g: { MBR: 72, MBA: 78, MBG: 64 } },
      { codigo: "V-2025-0201", unidad: 2, fecha: "2025-11-20", total: 91.2, g: { MBR: 92, MBA: 94, MBG: 87 } },
      { codigo: "T-2025-0033", unidad: 3, fecha: "2025-08-14", total: 48.0, g: { MBR: 45, MBA: 50, MBG: 0 } },
      { codigo: "V-2026-0012", unidad: 2, fecha: "2026-03-02", total: 88.4, g: { MBR: 85, MBA: 92, MBG: 88 } },
      { codigo: "T-2026-0007", unidad: 3, fecha: "2026-06-21", total: 76.8, g: { MBR: 80, MBA: 74.5, MBG: 0 } }
    ],
    evaluaciones: [],
    audit: [
      { t: "2026-10-01 08:12", ur: "INSP", urn: "Inspector ICA", up: "Camilo Andrés Peña Rincón", a: "Creó", o: "Unidad productiva Predio La Esperanza (registro asistido)", m: "Unidades productivas", det: [{ c: "Unidad productiva", a: "—", d: "Predio La Esperanza · Fusagasugá, Cundinamarca" }], mot: "" },
      { t: "2026-10-02 10:20", ur: "ADMIN", urn: "Administrador", up: "Andrés Felipe Rojas Medina", a: "Inactivó", o: "Usuario U-0031", m: "Usuarios", det: [{ c: "Estado", a: "ACTIVO", d: "INACTIVO" }], mot: "Retiro de la entidad" }
    ],
    notifs: [{ t: "Visita programada en Granja Demostración", d: "30/09" }, { t: "Documento pendiente: curso de bienestar animal", d: "01/10" }],
    nextUser: 9, nextUnidad: 4, nextEval: 1
  };
}

/* =====================================================================
   Prototipo funcional (sin base de datos) · núcleo, acceso, administración,
   unidades productivas y parametrización. Los datos viven en memoria.
   ===================================================================== */

export function semillaUnidadesGrandes() {
  ctx.S.users.push({ id: 9, nombres: "Martha Lucía", apellidos: "Restrepo Gil", doc: "NIT 900.000.001-1", correo: "productora2@demo.co", tel: "300 000 0009", rol: "PROD", estado: "ACTIVO", historial: true });
  ctx.S.nextUser = 10;
  const g = (cod, tipo, area, beb, com, aves, edad, unidad, grupo) => ({ cod, tipo, area, beb, com, refB: 12, refC: 45, ext: 0, aves, edad, unidad, grupo });
  ctx.S.unidades.push(
    { id: 4, nombre: "Granja El Porvenir", codigo: "Por definir", propietario: 5, operario: "Administrador de ejemplo", rt: 7, capacidad: 72000, gab: true, gabVence: "2027-06-30",
      depto: "Tolima", mun: "Espinal", vereda: "Vereda de ejemplo", dir: "Km 3 vía de ejemplo", indic: "", coordSis: "GEO", lat: 4.1492, lon: -74.8843, estado: "ACTIVA",
      especies: [{ sis: "POLLO_ENGORDE", pastoreo: false }],
      galpones: [g("G-01", "TUNEL", 1200, 1500, 380, 17800, 38, "días", "Finalización (22 días – salida)"), g("G-02", "CONTROLADO", 1400, 1700, 420, 19900, 41, "días", "Finalización (22 días – salida)"),
                 g("G-03", "TUNEL", 1200, 1480, 400, 17500, 30, "días", "Finalización (22 días – salida)"), g("G-04", "ABIERTO_MEC", 1000, 1250, 330, 14600, 24, "días", "Engorde (11 a 21 días)")] },
    { id: 5, nombre: "Avícola San Rafael", codigo: "Por definir", propietario: 9, operario: "Operario de ejemplo", rt: 7, capacidad: 96000, gab: true, gabVence: "2027-02-28",
      depto: "Cundinamarca", mun: "La Mesa", vereda: "Vereda de ejemplo", dir: "Km 8 vía de ejemplo", indic: "", coordSis: "GEO", lat: 4.6303, lon: -74.4622, estado: "ACTIVA",
      especies: [{ sis: "PONEDORA_JAULA", pastoreo: false }],
      galpones: [g("J-01", "CONTROLADO", 1500, 5200, 2600, 31500, 48, "semanas", "Producción (≥ 18 sem.)"), g("J-02", "CONTROLADO", 1500, 5100, 2500, 30800, 62, "semanas", "Producción (≥ 18 sem.)"),
                 g("J-03", "ABIERTO_MEC", 1450, 5000, 2400, 29900, 22, "semanas", "Producción (≥ 18 sem.)")] });
  ctx.S.nextUnidad = 6;
}

/* ---------- tipo y número de documento ---------- */

const limpiaDoc = d => String(d || "").replace(/[.\s]/g, "").toUpperCase();
export function normalizarDocumentos() {          // datos de ejemplo: "CC 1.010.000.001" → tipo CC y número 1010000001
  ctx.S.users.forEach(u => { if (u.tipoDoc) return; const m = String(u.doc).match(/^(CC|CE|NIT|PA|PPT)\s+(.*)$/); u.tipoDoc = m ? m[1] : "CC"; u.doc = limpiaDoc(m ? m[2] : u.doc); });
}
/* propietario en el formulario de la unidad: se trae de la plataforma y se puede actualizar o registrar uno nuevo */

export function semillaConsultas() {
  ctx.S.consultas = [{ id: 1, de: 5, unidad: 1, tema: "Solicitud de contacto", fecha: "2026-10-07 18:02", asignado: 7, estado: "CONTACTADO", nuevaRespuesta: false,
    contacto: { granja: "Granja Demostración", persona: "Hernán Darío Mejía Ortiz", cel: "300 000 0005", correo: "productor@demo.co", medio: "WhatsApp", dias: "Lunes a viernes", desde: "07:00", hasta: "11:00", alt: { nombre: "Administrador de ejemplo (operario)", cel: "310 000 0015" } }, mensajes: [
    { de: 7, t: "Lo contacté por WhatsApp: la cama del G-01 estaba húmeda cerca de los bebederos. Revise la altura y las fugas de los niples, retire la cama apelmazada y reponga material seco. Aumente la ventilación mínima en la mañana. Mañana paso a revisar.", fecha: "2026-10-08 11:15" }] }];
}

/* ---------- hallazgos de una calificación (con prioridad y antigüedad) · solo informativo: sin plazos, estados ni seguimiento ---------- */
