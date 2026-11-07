import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { FormArray, FormGroup, NonNullableFormBuilder, ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { map, startWith } from "rxjs";
import { StoreService } from "../../core/services/store.service";
import { UnidadesService } from "../../core/services/unidades.service";
import { UsuariosService } from "../../core/services/usuarios.service";
import * as M from "../../core/engine/motor";
import { DEPTOS, SISTEMAS, TIPOS_GALPON } from "../../core/data/norma/catalogos";
import { Modal } from "../../shared/modal";

type Cambio = { grupo: string; campo: string; antes: string; despues: string; sens: boolean };
const DEPT = DEPTOS as Record<string, string[]>;
const NUEVO = "NEW";

@Component({
  selector: "pv-unidad-form", imports: [ReactiveFormsModule, RouterLink, Modal], changeDetection: ChangeDetectionStrategy.OnPush, templateUrl: "./unidad-form.html"
})
export class UnidadForm {
  private fb = inject(NonNullableFormBuilder); private store = inject(StoreService); private svc = inject(UnidadesService);
  private usuarios = inject(UsuariosService);
  private router = inject(Router); private ruta = inject(ActivatedRoute);
  m: any = M; sistemas = Object.entries(SISTEMAS as Record<string, string>); tiposGalpon = Object.entries(TIPOS_GALPON as Record<string, [string, number]>);
  deptos = Object.keys(DEPT); tiposDoc = Object.entries((M as any).TIPOS_DOC as Record<string, string[]>); nuevo = NUEVO;

  /** Unidad que se edita (null si es un registro nuevo). */
  readonly id = Number(this.ruta.snapshot.paramMap.get("a")) || 0;
  readonly original: any = this.id ? M.unidadById(this.id) : null;
  readonly esProd = this.store.SES.rol === "PROD";
  readonly propietarios = this.esProd ? [M.userById(this.store.SES.id)] : this.store.S.users.filter((u: any) => u.rol === "PROD");
  readonly responsables = this.store.S.users.filter((u: any) => u.rol === "RT");

  form = this.fb.group({
    nombre: this.fb.control(""), codigo: this.fb.control(""), propietario: this.fb.control(""), operario: this.fb.control(""), rt: this.fb.control(""),
    capacidad: this.fb.control<number | null>(null), gab: this.fb.control("0"), gabVence: this.fb.control(""),
    depto: this.fb.control("Cundinamarca"), mun: this.fb.control(""), vereda: this.fb.control(""), dir: this.fb.control(""), indic: this.fb.control(""),
    coordSis: this.fb.control<"GEO" | "CART" | "POLAR">("GEO"), lat: this.fb.control<number | null>(null), lon: this.fb.control<number | null>(null),
    pastoreo: this.fb.control(false),
    sis: this.fb.group(Object.fromEntries(this.sistemas.map(([k]) => [k, this.fb.control(false)]))),
    prop: this.fb.group({ nombres: "", apellidos: "", tipoDoc: "CC", doc: "", correo: "", tel: "" }),
    galpones: this.fb.array<FormGroup>([])
  });
  get galpones() { return this.form.controls.galpones as FormArray<FormGroup>; }

  /* ayudas de coordenadas (no se guardan: solo ilustran las otras dos formas de ubicar el predio) */
  cartX = signal(4876512); cartY = signal(2051330); polarRef = signal("4876000, 2051000"); polarD = signal(850); polarAz = signal(72);
  polarResultado = computed(() => {
    const [x0, y0] = this.polarRef().split(",").map(Number), d = this.polarD(), az = this.polarAz();
    if (!(d > 0 && az >= 0 && az < 360) || Number.isNaN(x0 + y0)) return "Distancia > 0 y azimut entre 0 y 360°";
    const r = az * Math.PI / 180; return `X ${M.int(Math.round(x0 + d * Math.sin(r)))} · Y ${M.int(Math.round(y0 + d * Math.cos(r)))}`;
  });
  gpsMsg = signal("Rango válido en Colombia: latitud −4,3 a 13,5 · longitud −82 a −66,8");

  errores = signal<string[]>([]);
  confirmar = signal<{ cambios: Cambio[]; sens: boolean; abierta: string; datos: any; prop: any } | null>(null);
  motivo = signal(""); intentoMotivo = signal(false);

  private valor = toSignal(this.form.valueChanges.pipe(startWith(null), map(() => this.form.getRawValue())), { initialValue: this.form.getRawValue() });
  total = computed(() => (this.valor().galpones as any[]).reduce((s, g) => s + Number(g.aves || 0), 0));
  municipios = computed(() => DEPT[this.valor().depto] ?? []);
  coordSis = computed(() => this.valor().coordSis);
  esNuevoProp = computed(() => this.valor().propietario === NUEVO);
  tipoTexto = computed(() => this.total() >= 200 ? "Granja avícola · Capítulo I" : "Traspatio · Capítulo II");
  hayPonedoraPiso = computed(() => !!(this.valor().sis as any)["PONEDORA_PISO"]);

  constructor() {
    if (this.original && this.original.estado !== "ACTIVA") { this.router.navigate(["/unidades", this.id]); return; }
    this.cargar(this.original ?? this.vacia());
    // al cambiar de propietario se traen sus datos de contacto
    this.form.controls.propietario.valueChanges.subscribe(v => this.cargarPropietario(v));
    // el municipio se mantiene dentro del departamento elegido
    effect(() => { const lista = this.municipios(), c = this.form.controls.mun; if (lista.length && !lista.includes(c.value)) c.setValue(lista[0], { emitEvent: false }); });
  }

  private vacia(): any {
    return { nombre: "", codigo: "", propietario: this.esProd ? this.store.SES.id : 5, operario: "", rt: null, capacidad: "", gab: false, gabVence: "", depto: "Cundinamarca", mun: "Fusagasugá",
      vereda: "", dir: "", indic: "", coordSis: "GEO", lat: "", lon: "", estado: "ACTIVA", especies: [{ sis: "POLLO_ENGORDE", pastoreo: false }],
      galpones: [{ cod: "G-01", tipo: "TUNEL", area: "", beb: "", com: "", refB: 12, refC: 45, ext: 0, aves: "", edad: "", unidad: "días", grupo: "" }] };
  }
  private cargar(b: any) {
    this.form.patchValue({ nombre: b.nombre, codigo: b.codigo, propietario: String(b.propietario), operario: b.operario || "", rt: b.rt ? String(b.rt) : "", capacidad: b.capacidad === "" ? null : Number(b.capacidad),
      gab: b.gab ? "1" : "0", gabVence: b.gabVence || "", depto: b.depto, mun: b.mun, vereda: b.vereda, dir: b.dir || "", indic: b.indic || "", coordSis: b.coordSis || "GEO",
      lat: b.lat === "" || b.lat == null ? null : Number(b.lat), lon: b.lon === "" || b.lon == null ? null : Number(b.lon) }, { emitEvent: false });
    this.sistemas.forEach(([k]) => (this.form.controls.sis.get(k) as any).setValue(b.especies.some((e: any) => e.sis === k), { emitEvent: false }));
    this.form.controls.pastoreo.setValue(!!b.especies.find((e: any) => e.sis === "PONEDORA_PISO")?.pastoreo, { emitEvent: false });
    this.galpones.clear(); b.galpones.forEach((g: any) => this.galpones.push(this.grupoGalpon(g), { emitEvent: false }));
    this.cargarPropietario(String(b.propietario));
  }
  private grupoGalpon(g: any = {}) {
    return this.fb.group({ cod: g.cod ?? "", tipo: g.tipo ?? "", area: g.area ?? "", ext: g.ext || g.patio || "", beb: g.beb ?? "", com: g.com ?? "", grupo: g.grupo ?? "", edad: g.edad ?? "", unidad: g.unidad ?? "días",
      aves: g.aves ?? "", refB: g.refB ?? 12, refC: g.refC ?? 45, patio: g.patio ?? null });
  }
  private cargarPropietario(v: string) {
    const o = v && v !== NUEVO ? M.userById(Number(v)) : null;
    this.form.controls.prop.setValue({ nombres: "", apellidos: "", tipoDoc: o?.tipoDoc ?? "CC", doc: o?.doc ?? "", correo: o?.correo ?? "", tel: o?.tel ?? "" });
  }

  agregarGalpon() { this.galpones.push(this.grupoGalpon({ unidad: "días", refB: 12, refC: 45 })); }
  quitarGalpon(i: number) { this.galpones.removeAt(i); }
  tomarGps() {
    const poner = (la: string, lo: string, msg: string) => { this.form.patchValue({ lat: Number(la), lon: Number(lo) }); this.gpsMsg.set(msg); };
    if (!navigator.geolocation) { poner("4.33720", "-74.36380", "Punto de ejemplo."); return; }
    navigator.geolocation.getCurrentPosition(p => poner(p.coords.latitude.toFixed(5), p.coords.longitude.toFixed(5), `GPS ± ${Math.round(p.coords.accuracy)} m`),
      () => poner("4.33720", "-74.36380", "Sin permiso de ubicación: se usó un punto de ejemplo."), { timeout: 4000 });
  }

  /** Valida el propietario y devuelve sus datos normalizados. */
  private leerPropietario(errs: string[]) {
    const v = this.form.getRawValue(), nuevo = v.propietario === NUEVO, p = v.prop;
    const d = { id: nuevo ? null : Number(v.propietario), nombres: p.nombres.trim(), apellidos: p.apellidos.trim(), tipoDoc: p.tipoDoc, doc: M.limpiaDoc(p.doc), correo: p.correo.trim().toLowerCase(), tel: p.tel.trim() };
    if (nuevo && (!d.nombres || !d.apellidos)) errs.push("Escriba los nombres y apellidos del propietario.");
    if (!d.doc) errs.push("Escriba el número de documento del propietario."); else if (!M.docValido(d.tipoDoc, d.doc)) errs.push("Propietario: " + M.docError(d.tipoDoc).toLowerCase());
    const us = this.store.S.users;
    if (us.some((x: any) => x.id !== d.id && x.tipoDoc === d.tipoDoc && x.doc === d.doc)) errs.push("Ya existe otro usuario con ese tipo y número de documento.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.correo)) errs.push("Revise el correo del propietario.");
    if (d.correo && us.some((x: any) => x.id !== d.id && x.correo === d.correo)) errs.push("Ya existe otro usuario con ese correo.");
    if (!/^\d{7,10}$/.test(d.tel.replace(/\D/g, ""))) errs.push("El teléfono del propietario debe tener entre 7 y 10 dígitos.");
    return d;
  }
  /** Guarda el propietario (crea el usuario o actualiza sus datos de contacto) y devuelve su id. */
  private async guardarPropietario(d: any): Promise<number> {
    const S = this.store.S;
    if (!d.id) {
      const r = await this.usuarios.crear({ nombres: d.nombres, apellidos: d.apellidos, tipoDoc: d.tipoDoc, doc: d.doc, correo: d.correo, tel: d.tel, rol: "PROD", estado: "ACTIVO" });
      const u = { id: r.id, nombres: d.nombres, apellidos: d.apellidos };
      M.audit("Creó", `Usuario propietario ${M.fullName(u as any)}`, { m: "Usuarios", det: [{ c: "Usuario propietario", a: "—", d: `${d.nombres} ${d.apellidos} · ${d.tipoDoc} ${d.doc}` }] });
      if (r.aviso) this.store.toast(r.aviso, 12000);
      else if (r.correo_enviado) this.store.toast(`Propietario creado. La clave temporal se envió a ${d.correo}.`, 7000);
      return r.id;
    }
    const u = M.userById(d.id);
    const ant: any = { tipoDoc: u.tipoDoc, doc: u.doc, correo: u.correo, tel: u.tel };
    const det = [["Tipo de documento", "tipoDoc"], ["Número de documento", "doc"], ["Correo", "correo"], ["Teléfono", "tel"]].filter(([, k]) => String(ant[k] ?? "") !== String(d[k] ?? "")).map(([c, k]) => ({ c, a: ant[k] || "—", d: d[k] || "—" }));
    if (det.length) {
      await this.usuarios.actualizar(u, { tipoDoc: d.tipoDoc, doc: d.doc, correo: d.correo, tel: d.tel });
      M.audit("Actualizó datos del propietario", M.fullName(u), { m: "Usuarios", det });
    }
    return u.id;
  }

  async guardar() {
    const v = this.form.getRawValue(), errs: string[] = [], own = this.leerPropietario(errs), S = this.store.S;
    const base = this.original ?? this.vacia();
    const galpones = v.galpones.map((g: any) => ({ ...g, area: g.area === "" ? "" : Number(g.area), ext: Number(g.ext || 0), beb: g.beb === "" ? "" : Number(g.beb), com: g.com === "" ? "" : Number(g.com),
      edad: g.edad === "" ? "" : Number(g.edad), aves: g.aves === "" ? "" : Number(g.aves), patio: g.patio !== null ? Number(g.ext || 0) : null }));
    galpones.forEach((g: any) => { if (g.patio === null) delete g.patio; });
    const datos: any = { nombre: v.nombre.trim(), codigo: v.codigo.trim(), propietario: v.propietario === NUEVO ? -1 : Number(v.propietario), operario: v.operario, rt: v.rt ? Number(v.rt) : null,
      capacidad: Number(v.capacidad), gab: v.gab === "1", gabVence: v.gabVence, depto: v.depto, mun: v.mun, vereda: v.vereda.trim(), dir: v.dir, indic: v.indic, coordSis: v.coordSis, galpones };
    if (v.coordSis === "GEO") {
      datos.lat = v.lat; datos.lon = v.lon;
      if (datos.lat != null && (datos.lat < -4.3 || datos.lat > 13.5 || datos.lon == null || datos.lon < -82 || datos.lon > -66.8)) errs.push("Las coordenadas están fuera de Colombia.");
    } else { datos.lat = base.lat ?? null; datos.lon = base.lon ?? null; }
    datos.especies = this.sistemas.filter(([k]) => (v.sis as any)[k]).map(([k]) => ({ sis: k, pastoreo: k === "PONEDORA_PISO" && v.pastoreo }));
    if (!datos.nombre || !datos.vereda || !datos.capacidad) errs.push("Nombre, vereda y capacidad instalada son obligatorios.");
    if (!datos.especies.length) errs.push("Asocie al menos una especie y sistema productivo.");
    if (datos.gab && !datos.gabVence) errs.push("Si tiene GAB, registre su vigencia.");
    const aves = galpones.reduce((s: number, g: any) => s + Number(g.aves || 0), 0);
    if (aves >= 200 && !datos.rt) errs.push("En granja avícola el responsable técnico es obligatorio.");
    if (S.unidades.some((x: any) => x.id !== this.id && x.nombre.toLowerCase() === datos.nombre.toLowerCase() && x.mun === datos.mun && x.propietario === datos.propietario)) errs.push("Ya existe una unidad con el mismo nombre, municipio y propietario.");
    this.errores.set(errs);
    if (errs.length) { queueMicrotask(() => document.getElementById("fMsg")?.scrollIntoView({ block: "center" })); return; }

    if (!this.id) {
      try {
        datos.propietario = await this.guardarPropietario(own);
        const nueva = await this.svc.crear({ ...this.vacia(), ...datos, estado: "ACTIVA" });
        this.router.navigate(["/unidades", nueva]);
      } catch (e: any) { this.errores.set([e?.message || "No se pudo registrar la unidad."]); }
      return;
    }
    // edición: se compara contra la unidad original y se pide confirmar antes de tocar nada
    const candidata = { ...this.original, ...datos, propietario: own.id ?? this.original.propietario };
    const cambios: Cambio[] = (M.diffUnidad(this.original, candidata) as Cambio[]).filter(c => c.campo !== "Propietario" || own.id !== null);
    if (own.id === null) cambios.unshift({ grupo: "Datos básicos", campo: "Propietario", antes: M.fullName(M.userById(this.original.propietario)), despues: `${own.nombres} ${own.apellidos} (nuevo)`, sens: true });
    const cambiaContacto = own.id !== null && (() => { const u = M.userById(own.id); return [u.tipoDoc, u.doc, u.correo, u.tel].join("|") !== [own.tipoDoc, own.doc, own.correo, own.tel].join("|"); })();
    if (!cambios.length && !cambiaContacto) { this.store.toast("No hay cambios para guardar."); this.router.navigate(["/unidades", this.id]); return; }
    this.motivo.set(""); this.intentoMotivo.set(false);
    this.confirmar.set({ cambios, sens: cambios.some(c => c.sens), abierta: M.evAbierta(this.id)?.codigo ?? "", datos, prop: own });
  }

  async aplicar() {
    const c = this.confirmar(); if (!c) return;
    const mot = this.motivo().trim();
    if (c.sens && mot.length < 10) { this.intentoMotivo.set(true); return; }
    try {
      const propietario = await this.guardarPropietario(c.prop);
      const nuevo = { ...this.original, ...c.datos, propietario };
      const df = c.prop.id === null ? c.cambios : (M.diffUnidad(this.original, nuevo) as Cambio[]);
      if (df.length) await this.svc.aplicarCambios(this.original, nuevo, df, mot);
      this.confirmar.set(null); this.router.navigate(["/unidades", this.id]);
    } catch (e: any) { this.errores.set([e?.message || "No se pudieron guardar los cambios."]); }
  }
}

