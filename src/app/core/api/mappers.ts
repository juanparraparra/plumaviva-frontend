/* Traducción entre las filas de MySQL (snake_case, JSON `extra`) y el modelo que usan
   las pantallas Angular (camelCase, campos planos). Son funciones puras para poder probarlas. */

const num = (v: any, def = 0) => (v === "" || v == null || isNaN(Number(v)) ? def : Number(v));
const numNull = (v: any) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));
const limpiar = (v: any) => String(v ?? "").replace(/[.\s]/g, "");

export function partirDocumento(doc: any, tipoDoc?: string): { tipoDoc: string; doc: string } {
  const texto = String(doc ?? "").trim();
  const m = texto.match(/^(CC|CE|NIT|PA|PPT)\s+(.+)$/i);
  return { tipoDoc: (tipoDoc || (m ? m[1] : "CC")).toUpperCase(), doc: limpiar(m ? m[2] : texto) };
}

/* ------------------------------- Usuarios ------------------------------- */
export function usuarioDeApi(u: any): any {
  if (!u) return u;
  const { extra, hist_ev, hist_un, ...resto } = u;
  const ex = extra && typeof extra === "object" ? extra : {};
  const partes = partirDocumento(resto.doc, ex.tipoDoc);
  return {
    ...ex, ...resto,
    id: Number(resto.id),
    doc: partes.doc,
    tipoDoc: partes.tipoDoc,
    rolPers: ex.rolPers || "",
    debeCambiarPassword: !!(resto.debe_cambiar_password ?? resto.debeCambiarPassword),
    historial: !!(resto.historial ?? ex.historial ?? hist_ev ?? hist_un)
  };
}

export function usuarioParaApi(u: any): any {
  return {
    nombres: u.nombres, apellidos: u.apellidos,
    doc: `${u.tipoDoc || "CC"} ${u.doc}`,
    correo: u.correo || null, tel: u.tel || null,
    rol: u.rol, estado: u.estado,
    seccional: u.seccional || null, matricula: u.matricula || null, vence: u.vence || null,
    extra: { ...(u.extra || {}), tipoDoc: u.tipoDoc || "CC", rolPers: u.rolPers || "", historial: !!u.historial }
  };
}

/* ------------------------------- Unidades ------------------------------- */
export function unidadDeApi(x: any): any {
  if (!x) return x;
  const { extra, propietario_id, rt_id, gab_vence, coord_sis, creado_en, galpones, especies, ...resto } = x;
  const ex = extra && typeof extra === "object" ? extra : {};
  return {
    ...ex, ...resto,
    id: Number(resto.id),
    propietario: Number(propietario_id ?? resto.propietario ?? 0),
    rt: rt_id == null ? (resto.rt ?? null) : Number(rt_id),
    capacidad: num(resto.capacidad),
    gab: !!resto.gab,
    gabVence: gab_vence || resto.gabVence || "",
    coordSis: coord_sis || resto.coordSis || "GEO",
    lat: numNull(resto.lat), lon: numNull(resto.lon),
    especies: (especies || []).map((e: any) => ({ sis: e.sis, pastoreo: !!e.pastoreo })),
    galpones: (galpones || []).map((g: any) => ({
      ...g,
      area: num(g.area), beb: num(g.beb), com: num(g.com),
      refB: num(g.ref_b ?? g.refB), refC: num(g.ref_c ?? g.refC),
      ext: num(g.ext), patio: num(g.patio), aves: num(g.aves), edad: num(g.edad),
      unidad: g.edad_unidad || g.unidad || "días",
      grupo: g.grupo || "",
      extra: g.extra && typeof g.extra === "object" ? g.extra : {}
    }))
  };
}

export function unidadParaApi(u: any): any {
  return {
    nombre: u.nombre, codigo: u.codigo || "Por definir", propietario_id: u.propietario,
    operario: u.operario || "", rt_id: u.rt || null,
    capacidad: num(u.capacidad), gab: u.gab ? 1 : 0, gab_vence: u.gabVence || null,
    depto: u.depto || "", mun: u.mun || "", vereda: u.vereda || "", dir: u.dir || "",
    indic: u.indic || "", coord_sis: u.coordSis || "GEO", lat: u.lat ?? null, lon: u.lon ?? null,
    estado: u.estado || "ACTIVA",
    especies: (u.especies || []).map((e: any) => ({ sis: e.sis, pastoreo: !!e.pastoreo })),
    galpones: (u.galpones || []).map((g: any) => ({
      cod: g.cod, tipo: g.tipo || "", area: g.area, beb: g.beb, com: g.com,
      refB: g.refB, refC: g.refC, ext: g.ext, patio: g.patio, aves: g.aves, edad: g.edad,
      unidad: g.unidad || "días", grupo: g.grupo || "", extra: g.extra || {}
    })),
    extra: { ...(u.extra || {}), inhab: u.inhab ?? null, movs: u.movs || [], cambios: u.cambios || [] }
  };
}

/* ----------------------------- Evaluaciones ----------------------------- */
export function evaluacionDeApi(e: any): any {
  if (!e) return e;
  const d = e.detalle && typeof e.detalle === "object" ? e.detalle : {};
  return {
    ...d,
    id: Number(e.id),
    codigo: e.codigo,
    unidad: Number(e.unidad_id ?? d.unidad),
    sis: e.sis || d.sis,
    cap: e.cap || d.cap,
    insp: Number(e.insp_id ?? d.insp),
    fecha: e.fecha || d.fecha,
    hora: e.hora || d.hora || "08:00",
    estado: e.estado || d.estado,
    orden: e.orden || d.orden || "MBR",
    pastoreo: !!(e.pastoreo ?? d.pastoreo),
    consent: !!(e.consent ?? d.consent),
    obsGen: e.obs_gen ?? d.obsGen ?? "",
    inv: d.inv || [],
    galpones: d.galpones || [],
    grupos: d.grupos || [],
    resp: d.resp || {},
    galSug: d.galSug || d.galpones || [],
    galMotivo: d.galMotivo || "",
    atiende: d.atiende || "",
    saved: d.saved || null,
    validada: e.validada_en || d.validada || null,
    finPor: d.finPor ?? null,
    finFecha: d.finFecha ?? null,
    anulada: d.anulada || null
  };
}

export function detalleEvaluacion(ev: any, extra: any = {}): any {
  return {
    inv: ev.inv || [], galpones: ev.galpones || [], grupos: ev.grupos || [], resp: ev.resp || {},
    galSug: ev.galSug || [], galMotivo: ev.galMotivo || "", atiende: ev.atiende || "",
    saved: ev.saved || null, finPor: ev.finPor ?? null, finFecha: ev.finFecha ?? null,
    validada: ev.validada ?? null, anulada: ev.anulada || null,
    pastoreo: !!ev.pastoreo, ...extra
  };
}

export function evaluacionParaApi(ev: any, extra: any = {}): any {
  return {
    estado: ev.estado, consent: !!ev.consent, obs_gen: ev.obsGen || "",
    hora: ev.hora || "08:00", orden: ev.orden || "MBR",
    detalle: detalleEvaluacion(ev, extra)
  };
}

export function evaluacionNuevaParaApi(ev: any, f: any): any {
  return {
    unidad_id: f.unidad, sis: f.sis, insp_id: f.insp, fecha: f.fecha, hora: f.hora || "08:00",
    orden: f.orden || "MBR", pastoreo: !!ev.pastoreo, detalle: detalleEvaluacion(ev)
  };
}

/* -------------------------- Histórico y varios -------------------------- */
export function historicoDeApi(h: any): any {
  return {
    codigo: h.codigo, unidad: Number(h.unidad), fecha: h.fecha,
    total: num(h.total), cap: h.cap || undefined, sis: h.sis || undefined,
    det: h.det && typeof h.det === "object" ? h.det : null,
    g: { MBR: num(h.g?.MBR), MBA: num(h.g?.MBA), MBG: num(h.g?.MBG) }
  };
}

export function auditoriaDeApi(a: any): any {
  return {
    t: String(a.t || "").replace("T", " ").slice(0, 16),
    ur: a.rol || "", urn: a.rol || "", up: a.usuario || "—",
    a: a.accion || "", o: a.objeto || "", m: a.modulo || "Sistema",
    det: Array.isArray(a.detalle) ? a.detalle : [], mot: a.motivo || ""
  };
}

export function notificacionDeApi(n: any): any { return { t: n.t, d: n.d }; }
