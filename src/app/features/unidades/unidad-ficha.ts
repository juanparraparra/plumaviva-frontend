import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { map } from "rxjs";
import { StoreService } from "../../core/services/store.service";
import { MOTIVOS_INHABILITAR, MOTIVOS_REHABILITAR, UnidadesService } from "../../core/services/unidades.service";
import * as M from "../../core/engine/motor";
import { SISTEMAS, TIPOS_GALPON } from "../../core/data/norma/catalogos";
import { EstadoTag, NivelTag, Tendencia } from "../../shared/ui";
import { PlanMejora } from "../../shared/plan";
import { Comparativo, DetalleSnap, ResumenUnidad, planLink } from "../../shared/resumen";
import { AnularEvaluacion } from "../../shared/anular-evaluacion";
import { MotivoModal } from "../../shared/motivo-modal";
import { Modal } from "../../shared/modal";

const TABS = [["resumen", "Resumen"], ["plan", "Plan de mejora"], ["evaluaciones", "Historial de evaluaciones"], ["datos", "Datos"], ["ubicacion", "Ubicación"], ["especies", "Especies"], ["galpones", "Galpones e inventario"]] as const;
const SECCION: Record<string, string> = { datos: "Datos básicos", ubicacion: "Ubicación", especies: "Especies", galpones: "Inventario" };

@Component({
  selector: "pv-unidad-ficha", imports: [RouterLink, EstadoTag, NivelTag, Tendencia, PlanMejora, ResumenUnidad, DetalleSnap, AnularEvaluacion, MotivoModal, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush, templateUrl: "./unidad-ficha.html"
})
export class UnidadFicha {
  private store = inject(StoreService); private svc = inject(UnidadesService); private router = inject(Router); private ruta = inject(ActivatedRoute);
  m: any = M; sis = SISTEMAS as Record<string, string>; tipos = TIPOS_GALPON as Record<string, [string, number]>; tabs = TABS; link = planLink;
  motivosInh = MOTIVOS_INHABILITAR;
  camposInh = [{ id: "tipo", etiqueta: "Tipo", opciones: ["Temporal", "Definitiva"], valores: [["Temporal", "Temporal: se espera volver a habilitarla"], ["Definitiva", "Definitiva: no volverá a operar"]] as [string, string][] },
    { id: "motivo", etiqueta: "Motivo", opciones: (v: Record<string, string>) => MOTIVOS_INHABILITAR[v["tipo"] || "Temporal"] }];
  camposReh = [{ id: "motivo", etiqueta: "Motivo", opciones: MOTIVOS_REHABILITAR }];

  private id = toSignal(this.ruta.paramMap.pipe(map(p => Number(p.get("a")))), { initialValue: 0 });
  tab = toSignal(this.ruta.queryParamMap.pipe(map(p => (p.get("t") || "resumen"))), { initialValue: "resumen" });
  u = computed(() => (this.store.v(), M.unidadById(this.id())));

  dialogo = signal<"" | "inhabilitar" | "rehabilitar" | "duplicada" | "bloqueo-inh" | "bloqueo-dup" | "anular">("");
  detalleCod = signal(""); conservada = signal(0);

  constructor() { effect(() => { if (!this.u()) this.router.navigate(["/unidades"]); }); }

  /* permisos y estado derivado */
  admin = M.can("ADMIN");
  puedeEditar = computed(() => (this.store.v(), this.u()?.estado === "ACTIVA" && M.can("ADMIN", "COORD", "INSP", "PROD") && M.hasPerm("Registrar o editar unidades")));
  ab = computed(() => (this.store.v(), M.evAbierta(this.id())));
  gestiona = M.can("COORD", "ADMIN");
  puedeCrearEval = computed(() => (this.store.v(), M.hasPerm("Crear evaluaciones")));
  edita = computed(() => this.ab() ? M.canEdit(this.ab()) : false);
  otras = computed(() => (this.store.v(), M.visibleUnidades().filter((x: any) => x.id !== this.id())));
  verUnidades = computed(() => (this.store.v(), M.menuHas("unidades")));
  externo = ["PROD", "TEN", "RT"].includes(this.store.SES.rol);

  /* datos de las pestañas */
  propietario = computed(() => M.userById(this.u().propietario));
  snaps = computed(() => (this.store.v(), M.unitSnaps(this.id())));
  ultimaYBase = computed(() => this.snaps()[this.snaps().length - 1]?.codigo ?? "");
  abiertas = computed(() => (this.store.v(), this.store.S.evaluaciones.filter((e: any) => e.unidad === this.id() && M.ABIERTA.includes(e.estado))));
  anuladas = computed(() => (this.store.v(), this.store.S.evaluaciones.filter((e: any) => e.unidad === this.id() && e.estado === "ANULADA")));
  historial = computed(() => {
    const s = this.snaps().map((x: any) => ({ f: x.fecha, tipo: "snap", x })), a = this.anuladas().map((e: any) => ({ f: e.fecha, tipo: "anulada", x: e }));
    return [...s, ...a].sort((p, q) => q.f.localeCompare(p.f));
  });
  resueltos = computed(() => (this.store.v(), M.resueltos(this.id())));
  cambios = computed(() => {
    const g = SECCION[this.tab()] || "", sec = this.tab() === "datos" ? "" : g;
    return ((this.u()?.cambios || []) as any[]).map(c => ({ ...c, items: c.items.filter((i: any) => !sec || i.grupo === sec) })).filter(c => c.items.length).reverse();
  });
  seccionCambios = computed(() => this.tab() === "datos" ? "" : (SECCION[this.tab()] || ""));
  tieneCambios = computed(() => !!SECCION[this.tab()]);
  movs = computed(() => ((this.u()?.movs || []) as any[]).slice().reverse());
  coordenadas = computed(() => { const u = this.u(); return u.coordSis === "GEO" && u.lat ? `${M.fmt(u.lat, 5)}, ${M.fmt(u.lon, 5)} (geográficas)` : u.coordSis === "POLAR" ? "Polares desde punto de referencia" : "—"; });
  refTxt = (r: any) => r.ultima ? `posterior a ${r.ultima}${r.abierta ? ` · con ${r.abierta} abierta` : ""}` : "antes de la primera evaluación";

  irTab(t: string) { this.router.navigate([], { queryParams: { t }, queryParamsHandling: "merge" }); }
  cambiarUnidad(id: string) { if (id) this.router.navigate(["/unidades", id]); }
  imprimir() { window.print(); }

  /* acciones de estado */
  abrirInhabilitar() { this.dialogo.set(this.ab() ? "bloqueo-inh" : "inhabilitar"); }
  abrirDuplicada() {
    if (M.tieneHistorial(this.u())) { this.dialogo.set("bloqueo-dup"); return; }
    const otras = this.store.S.unidades.filter((x: any) => x.id !== this.id());
    const sug = otras.find((x: any) => M.normTxt(x.nombre) === M.normTxt(this.u().nombre)) || otras.find((x: any) => x.mun === this.u().mun && x.propietario === this.u().propietario);
    this.conservada.set(sug?.id ?? otras[0]?.id ?? 0); this.dialogo.set("duplicada");
  }
  candidatasDup = computed(() => (this.store.v(), this.store.S.unidades.filter((x: any) => x.id !== this.id())));
  camposDup = computed(() => [{ id: "conserva", etiqueta: "Unidad que se conserva", opciones: [] as string[], valores: this.candidatasDup().map((x: any) => [String(x.id), `${x.nombre} · ${x.mun}`] as [string, string]) }]);
  inhabilitar(e: { valores: Record<string, string>; detalle: string }) { this.svc.inhabilitar(this.u(), { tipo: e.valores["tipo"], motivo: e.valores["motivo"], detalle: e.detalle }); this.dialogo.set(""); }
  rehabilitar(e: { valores: Record<string, string>; detalle: string }) { this.svc.rehabilitar(this.u(), { motivo: e.valores["motivo"], detalle: e.detalle }); this.dialogo.set(""); }
  eliminarDuplicada(e: { valores: Record<string, string>; detalle: string }) {
    const kept = M.unidadById(e.valores["conserva"]); const u = this.u(); this.dialogo.set("");
    this.svc.eliminarDuplicada(u, kept, e.detalle); this.router.navigate(["/unidades"]);
  }
}
