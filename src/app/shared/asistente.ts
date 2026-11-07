import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { Router } from "@angular/router";
import { StoreService } from "../core/services/store.service";
import { ctx } from "../core/engine/contexto";
import * as M from "../core/engine/motor";
import { MotivoModal } from "./motivo-modal";
import { svgUri } from "./logo";

const ICO_PV = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><rect x="2" y="2" width="56" height="56" rx="16" fill="#317330"/><path d="M16 45C12 28 23 14 45 11C47 30 37 44 19 46Z" fill="#fff"/><path d="M16 46L40 20" stroke="#317330" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M26 37l6-1M31 31l6-1M22 41l4-.8" stroke="#317330" stroke-width="1.6" stroke-linecap="round" fill="none"/><circle cx="47" cy="15" r="5" fill="#86B327"/></svg>`);

/** Tarjeta con los datos de contacto de una solicitud o de un borrador. */
@Component({
  selector: "pv-contacto", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let k = c().contacto;
  <div class="contact-card"><div><b>{{ k.granja }}</b>@if (c().estado) { &nbsp;<span class="tag" [class]="'tag ' + m.SOL_EST[c().estado][1]">{{ m.SOL_EST[c().estado][0] }}</span> }</div>
    <div class="small">👤 {{ k.persona }}</div>
    <div class="small">📱 <a [href]="'tel:+57' + dig(k.cel)">{{ k.cel }}</a>@if (k.medio === "WhatsApp") { · <a [href]="'https://wa.me/57' + dig(k.cel)" target="_blank" rel="noopener">WhatsApp</a> } · ✉️ <a [href]="'mailto:' + k.correo">{{ k.correo }}</a></div>
    <div class="small">🕘 {{ k.dias }}, de {{ k.desde }} a {{ k.hasta }} · prefiere <b>{{ k.medio.toLowerCase() }}</b></div>
    @if (k.alt && k.alt.cel) { <div class="small">☎️ Contacto adicional: {{ k.alt.nombre || "—" }} · <a [href]="'tel:+57' + dig(k.alt.cel)">{{ k.alt.cel }}</a></div> }</div>`
})
export class ContactoCard { m: any = M; c = input.required<any>(); dig = (t: string) => String(t).replace(/\D/g, ""); }

/** Solicitudes de contacto técnico (Inicio): el equipo técnico las atiende y quien las pidió ve su estado. */
@Component({
  selector: "pv-solicitudes", imports: [ContactoCard, MotivoModal], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let _v = store.v();
  @if (lista().length) {
    <div class="card"><div class="card-head"><h3>{{ tec ? "Solicitudes de contacto técnico" : "Mis solicitudes de contacto técnico" }}</h3><span class="tag t-warn">{{ porContactar() }} por contactar</span></div>
      <div class="sol-grid">
        @for (c of lista(); track c.id) {
          @let nota = c.mensajes[c.mensajes.length - 1];
          <div><pv-contacto [c]="c" />
            <div class="tiny muted" style="margin-top:4px">Solicitada el {{ c.fecha || "—" }} · asignada a {{ m.fullName(m.userById(c.asignado)) }}@if (nota) { · nota: {{ nota.t }} }</div>
            @if (tec && c.estado !== "RESUELTA") {
              <div class="btn-row" style="margin-top:6px"><button type="button" class="btn sec sm" (click)="abrir(c, 'CONTACTADO')">Registrar contacto</button><button type="button" class="btn ghost sm" (click)="abrir(c, 'RESUELTA')">Marcar como resuelta</button></div> }
          </div>
        }
      </div></div>
  }
  @if (sel(); as s) {
    <pv-motivo-modal [titulo]="s.e === 'RESUELTA' ? 'Marcar solicitud como resuelta' : 'Registrar el contacto'" okTxt="Guardar" etiquetaDetalle="Nota para el productor" [minimo]="1"
      [ayuda]="s.e === 'RESUELTA' ? 'Ej.: se resolvió en la visita del martes' : 'Ej.: lo llamé; quedamos en visitar el galpón el jueves'" (confirmar)="guardar($event.detalle)" (cerrar)="sel.set(null)">
      <pv-contacto [c]="s.c" />
    </pv-motivo-modal>
  }`
})
export class Solicitudes {
  store = inject(StoreService); m: any = M; sel = signal<{ c: any; e: string } | null>(null);
  tec = M.esTecnico();
  lista = computed<any[]>(() => { this.store.v(); return !ctx.SES || ctx.SES.rol === "CONS" ? [] : (M.misConsultas() as any[]).slice().sort((a, b) => b.id - a.id); });
  porContactar = computed(() => this.lista().filter(c => c.estado === "PENDIENTE").length);
  abrir(c: any, e: string) { this.sel.set({ c, e }); }
  guardar(nota: string) {
    const { c, e } = this.sel()!;
    c.mensajes.push({ de: ctx.SES.id, t: nota, fecha: M.stamp() }); c.estado = e; c.nuevaRespuesta = true;
    M.audit(e === "RESUELTA" ? "Cerró solicitud técnica" : "Registró contacto técnico", `${c.contacto.granja} · ${c.contacto.persona}`, { m: "Asistente IA" });
    ctx.S.notifs.unshift({ t: `El técnico ${e === "RESUELTA" ? "resolvió" : "registró el contacto de"} su solicitud: ${c.contacto.granja}`, d: M.today().slice(8, 10) + "/" + M.today().slice(5, 7) });
    this.sel.set(null); this.store.toast("Solicitud actualizada."); this.store.touch();
  }
}

/** Asistente de IA flotante (respuestas simuladas con la metodología y los datos que el perfil puede ver). */
@Component({
  selector: "pv-asistente", imports: [ContactoCard, NgTemplateOutlet], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @let _v = store.v(); @let _n = n();
  @if (visible()) {
    <button type="button" id="chatFab" class="chat-fab no-print" [attr.aria-label]="abierto() ? 'Cerrar el asistente' : 'Abrir el asistente de IA'" [attr.aria-expanded]="abierto()" [title]="abierto() ? 'Cerrar el asistente' : 'Abrir el asistente de IA'" (click)="alternar()">
      @if (abierto()) { ✕ } @else { <img [src]="ico" alt=""><span>Asistente IA</span>@if (pendientes()) { <i class="chat-badge">{{ pendientes() }}</i> } }</button>
    <section id="chatPanel" class="chat-panel no-print" [class.hidden]="!abierto()" aria-label="Asistente de IA">
      @if (abierto()) {
        @let P = perfil();
        <header><img [src]="ico" alt=""><div><b>Asistente PlumaViva</b><small>Bienestar y salud de aves de corral y de traspatio · perfil {{ P.rol }}</small></div></header>
        <div class="chat-log" #log id="chatLog">
          @if (!chat.msgs.length) { <div class="bot"><div class="bub">Hola, {{ primerNombre() }}. Le ayudo con sus evaluaciones, hallazgos, recomendaciones y planes de mejora, y con dudas de bienestar y salud de las aves. Respondo con {{ P.puede }}. Puede hacer preguntas de seguimiento, como «¿cómo lo hago?» o «ver más».@if (pideTecnico()) { Si prefiere hablar con un técnico, escríbamelo. }</div></div> }
          @for (msg of chat.msgs; track $index) {
            @if (msg.de === "yo") { <div class="me"><div class="bub">{{ msg.t }}</div></div> }
            @else {
              <div class="bot"><div class="bub"><span [innerHTML]="html(msg.t)"></span>
                @if (msg.kind === "contacto") {
                  @if (msg.sent) { <pv-contacto [c]="msg.sent" /> }
                  @else if (chat.draft) {
                    @if (!chat.editC) {
                      <pv-contacto [c]="{ contacto: chat.draft.contacto }" />
                      <p class="tiny muted" style="margin:6px 0 0">Le contactará {{ m.fullName(tecnico()) }} ({{ m.rolDe(tecnico()).nombre.toLowerCase() }}). Al confirmar autoriza el uso de estos datos para que le contacten (Ley 1581 de 2012).</p>
                      <div class="bub-opts"><button type="button" class="btn sm" (click)="confirmarContacto()">Sí, solicitar contacto</button><button type="button" class="btn sec sm" (click)="editarContacto()">Actualizar datos</button></div>
                    } @else { <ng-container *ngTemplateOutlet="formulario" /> }
                  }
                }
                @if (msg.opts) { <div class="bub-opts">@for (o of msg.opts; track o.q) { <button type="button" class="btn sec sm" (click)="preguntar(o.q)">{{ o.lab }}</button> }</div> }
                @if (msg.ref) { <small class="ref">Fuente: {{ msg.ref }}</small> }
                @if (msg.link) { <button type="button" class="btn sec sm" (click)="ir(msg.link.act, msg.link.id)">{{ msg.link.lab }}</button> }
                @if (msg.tecnico && pideTecnico()) { &nbsp;<button type="button" class="btn sm" (click)="preguntar('Quiero que me contacte un técnico')">Que me contacte un técnico</button> }
              </div></div>
            }
          }
        </div>
        <div class="chat-sug">@for (x of sugerencias(); track x) { <button type="button" (click)="preguntar(x)">{{ x }}</button> }</div>
        <form class="chat-in" (submit)="enviar($event)"><input #txt id="chatTxt" placeholder="Escriba su pregunta…" autocomplete="off" aria-label="Pregunta"><button class="btn sm">Enviar</button></form>
        <p class="chat-note">Respuestas simuladas en el prototipo con la metodología, la parametrización y los datos que su perfil puede ver. La conexión con la API de IA se hará en una etapa posterior.</p>
      }
    </section>
  }
  <ng-template #formulario>
    <form class="form one tec-form" (submit)="guardarBorrador($event)">
      @if (unidades().length > 1) { <div class="field"><label for="cf-u">Unidad productiva</label><select id="cf-u" (change)="f.uid = +$any($event.target).value">@for (u of unidades(); track u.id) { <option [value]="u.id" [selected]="u.id === f.uid">{{ u.nombre }}</option> }</select></div> }
      <div class="field"><label for="cf-p">Nombre completo</label><input id="cf-p" [value]="f.persona" (input)="f.persona = $any($event.target).value"></div>
      <div class="grid2"><div class="field"><label for="cf-c">Celular</label><input id="cf-c" type="tel" [value]="f.cel" (input)="f.cel = $any($event.target).value"></div><div class="field"><label for="cf-e">Correo</label><input id="cf-e" type="email" [value]="f.correo" (input)="f.correo = $any($event.target).value"></div></div>
      <div class="field"><label>Medio preferido</label><div class="radio-row">@for (x of medios; track x) { <label><input type="radio" name="cfM" [value]="x" [checked]="f.medio === x" (change)="f.medio = x"> {{ x }}</label> }</div></div>
      <div class="field"><label for="cf-d">Horario de atención</label><select id="cf-d" (change)="f.dias = $any($event.target).value">@for (x of dias; track x) { <option [selected]="f.dias === x">{{ x }}</option> }</select>
        <div class="grid2" style="margin-top:6px"><label class="tiny">Desde<input type="time" [value]="f.desde" (input)="f.desde = $any($event.target).value"></label><label class="tiny">Hasta<input type="time" [value]="f.hasta" (input)="f.hasta = $any($event.target).value"></label></div></div>
      <div class="field"><label>Contacto adicional (opcional)</label><div class="grid2"><input placeholder="Nombre de la persona" aria-label="Nombre del contacto adicional" [value]="f.altN" (input)="f.altN = $any($event.target).value"><input type="tel" placeholder="Teléfono" aria-label="Teléfono del contacto adicional" [value]="f.altC" (input)="f.altC = $any($event.target).value"></div></div>
      @if (errores().length) { <div class="alert err small" role="alert">@for (e of errores(); track e) { {{ e }}<br> }</div> }
      <div class="btn-row"><button type="button" class="btn sec sm" (click)="cancelarEdicion()">Cancelar</button><button class="btn sm">Guardar datos</button></div></form>
  </ng-template>`
})
export class Asistente {
  store = inject(StoreService); private router = inject(Router); private san = inject(DomSanitizer);
  m: any = M; ico = ICO_PV; medios = ["Llamada", "WhatsApp", "Correo"]; dias = ["Lunes a viernes", "Lunes a sábado", "Todos los días", "Solo fines de semana"];
  private log = viewChild<ElementRef<HTMLElement>>("log"); private txt = viewChild<ElementRef<HTMLInputElement>>("txt");
  n = signal(0); errores = signal<string[]>([]);
  f: any = {};

  constructor() { ctx.ui.onChat = () => this.refrescar(); }
  get chat() { return ctx.ui.CHAT; }
  visible = computed(() => (this.store.v(), !!ctx.SES && M.hasPerm("Asistente IA")));
  abierto = computed(() => (this.n(), this.chat.open));
  perfil = computed<any>(() => (M.PERFIL_IA as any)[ctx.SES.rol]);
  primerNombre = () => M.userById(ctx.SES.id).nombres.split(" ")[0];
  pideTecnico = () => ctx.SES.rol !== "CONS" && !M.esTecnico();
  unidades = () => M.visibleUnidades() as any[];
  tecnico = () => M.tecDe(M.unidadById(this.chat.draft.uid));
  pendientes = computed(() => (this.store.v(), this.n(), (M.misConsultas() as any[]).filter(c => M.esTecnico() ? c.estado === "PENDIENTE" : c.nuevaRespuesta).length));
  sugerencias = computed<string[]>(() => { this.n(); const u = [...this.chat.msgs].reverse().find((x: any) => x.de === "ia"); return u?.sug?.length ? u.sug : this.perfil().sug; });
  html(t: string): SafeHtml { return this.san.bypassSecurityTrustHtml(t ?? ""); }

  refrescar(abajo = true) { this.n.update(x => x + 1); if (abajo) setTimeout(() => { const l = this.log()?.nativeElement; if (l) l.scrollTop = l.scrollHeight; }); }
  alternar() {
    this.chat.open = !this.chat.open;
    if (this.chat.open && !M.esTecnico()) (M.misConsultas() as any[]).forEach(c => (c.nuevaRespuesta = false));
    this.refrescar();
  }
  preguntar(q: string) {
    this.chat.open = true;
    this.chat.msgs.push({ de: "yo", t: q });
    let r: any; try { r = M.responder(q); } catch (err) { console.error(err); r = { a: "No pude procesar esa pregunta. Intente escribirla de otra forma.", tecnico: true }; }
    this.chat.msgs.push({ de: "ia", t: r.a, ref: r.ref, link: r.link, tecnico: r.tecnico, sug: r.sug, opts: r.opts, kind: r.kind });
    if (r.kind === "contacto") this.cargarForm();
    this.refrescar(); setTimeout(() => this.txt()?.nativeElement.focus());
  }
  enviar(e: Event) { e.preventDefault(); const el = this.txt()!.nativeElement, v = el.value.trim(); if (!v) return; el.value = ""; this.preguntar(v); }
  ir(act: string, id: any) {
    if (act === "irPlan") this.router.navigate(["/unidades", id], { queryParams: { t: "plan" } });
    else if (act === "irUnidad") this.router.navigate(["/unidades", id], { queryParams: { t: "resumen" } });
    else if (act === "irInicio") this.router.navigate(["/inicio"]);
    else if (act === "irEvals") this.router.navigate(["/evaluaciones"]);
  }

  /* solicitud de contacto técnico */
  private cargarForm() { const d = this.chat.draft; if (!d) return; const k = d.contacto; this.f = { uid: d.uid, persona: k.persona, cel: k.cel, correo: k.correo, medio: k.medio, dias: k.dias, desde: k.desde, hasta: k.hasta, altN: k.alt.nombre, altC: k.alt.cel }; }
  editarContacto() { this.cargarForm(); this.errores.set([]); this.chat.editC = true; this.refrescar(false); }
  cancelarEdicion() { this.chat.editC = false; this.refrescar(false); }
  confirmarContacto() { if (this.chat.draft) { M.enviarSolicitud(); this.store.touch(); } }
  guardarBorrador(e: Event) {
    e.preventDefault();
    const f = this.f, u = M.unidadById(f.uid), errs: string[] = [];
    const k = { granja: u.nombre, persona: String(f.persona).trim(), cel: String(f.cel).trim(), correo: String(f.correo).trim(), medio: f.medio, dias: f.dias, desde: f.desde, hasta: f.hasta, alt: { nombre: String(f.altN).trim(), cel: String(f.altC).trim() } };
    if (!k.persona) errs.push("Escriba su nombre completo.");
    if (!/^3\d{9}$/.test(k.cel.replace(/\D/g, ""))) errs.push("El celular debe tener 10 dígitos y empezar por 3.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(k.correo)) errs.push("Revise el correo.");
    if (!k.desde || !k.hasta || k.desde >= k.hasta) errs.push("La hora final debe ser posterior a la inicial.");
    if (k.alt.cel && !/^\d{7,10}$/.test(k.alt.cel.replace(/\D/g, ""))) errs.push("El teléfono adicional debe tener entre 7 y 10 dígitos.");
    if (k.alt.cel && !k.alt.nombre) errs.push("Escriba el nombre del contacto adicional.");
    this.errores.set(errs); if (errs.length) return;
    this.chat.draft = { uid: f.uid, contacto: k }; this.chat.editC = false; this.refrescar(false);
  }
}
