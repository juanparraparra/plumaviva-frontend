import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import * as M from "../core/engine/motor";
import { ctx } from "../core/engine/contexto";

/** Etiqueta de nivel de bienestar (Tabla 2). */
@Component({ selector: "pv-nivel", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (pct() == null) { <span class="tag t-gray">Sin dato</span> } @else { <span class="lvl" [class]="'lvl ' + nivel()">{{ nivel() }}</span> }` })
export class NivelTag { pct = input<number | null | undefined>(null); nivel = computed(() => M.nivel(this.pct() as number)); }

/** Etiqueta del estado de una evaluación. */
@Component({ selector: "pv-estado", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="tag" [class]="'tag ' + (clase())">{{ texto() }}</span>` })
export class EstadoTag { estado = input.required<string>(); clase = computed(() => (M.ESTADOS as any)[this.estado()] || "t-info"); texto = computed(() => (M.EST_LAB as any)[this.estado()] || this.estado()); }

/** Etiqueta de prioridad del plan de mejora. */
@Component({ selector: "pv-prio", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="tag" [class]="'tag ' + m.PRIO[p()][1]">{{ m.PRIO_ICO[p()] }} {{ m.PRIO[p()][0] }}@if (n() != null) {: {{ n() }}}</span>` })
export class PrioTag { m: any = M; p = input.required<number>(); n = input<number | null>(null); }

/** Barra de avance de una evaluación + etiqueta de vencida. */
@Component({ selector: "pv-progreso", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let a = av(); <div class="prog" [title]="a.h + ' de ' + a.n + ' indicadores registrados'"><i [style.width.%]="a.pct"></i></div><span class="tiny muted">{{ a.h }}/{{ a.n }} indicadores</span>@if (venc()) { &ngsp;<span class="tag t-err">Vencida</span> }` })
export class Progreso { ev = input.required<any>(); av = computed(() => M.avance(this.ev())); venc = computed(() => M.vencida(this.ev())); }

/** Indicador numérico del tablero. */
@Component({ selector: "pv-kpi", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="kpi" [class]="'kpi ' + (cls() || '')"><div class="v">{{ valor() }}</div><div class="l">{{ etiqueta() }}</div>@if (sub()) { <div class="tiny muted" style="margin-top:2px">{{ sub() }}</div> }</div>` })
export class Kpi { valor = input.required<string | number>(); etiqueta = input.required<string>(); sub = input<string>(); cls = input<string>(); }

/** Columnas verticales (distribución por nivel). */
@Component({ selector: "pv-columnas", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="bars">@for (d of items(); track d.lab) { <div class="b"><div class="v">{{ d.c }}</div><div class="col" [style.height.px]="(d.c / mx()) * 150 + (d.c ? 6 : 2)" [style.background]="d.color"></div></div> }</div>
    <div class="bars-lab">@for (d of items(); track d.lab) { <span>{{ d.lab }}</span> }</div>` })
export class Columnas { items = input.required<{ lab: string; c: number; color: string }[]>(); mx = computed(() => Math.max(1, ...this.items().map(d => d.c))); }

/** Barras horizontales. */
@Component({ selector: "pv-barras-h", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (d of items(); track d.lab) { <div class="hbar"><span [title]="d.lab">{{ d.lab }}</span><div class="track"><div class="fill" [style.width.%]="d.v / mx() * 100" [style.background]="d.color || null"></div></div><span class="num">{{ d.txt ?? d.v }}</span></div> } @empty { <p class="muted">Sin datos.</p> }` })
export class BarrasH { items = input.required<{ lab: string; v: number; txt?: string; color?: string }[]>(); mx = computed(() => Math.max(1, ...this.items().map(d => d.v))); }

/** Crecimiento acumulado de evaluaciones (línea + barras mensuales). */
@Component({ selector: "pv-linea-acum", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (D().length < 2) { <p class="muted small">Se necesitan evaluaciones en al menos dos meses distintos para mostrar el crecimiento.</p> } @else {
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" width="100%" style="max-width:680px">
      <line [attr.x1]="L" [attr.x2]="W - R" [attr.y1]="y(0)" [attr.y2]="y(0)" stroke="#DADDD8"/>
      @for (f of [0.5, 1]; track f) { <line [attr.x1]="L" [attr.x2]="W - R" [attr.y1]="y(mx() * f)" [attr.y2]="y(mx() * f)" stroke="#E6E9E3" stroke-dasharray="4 4"/><text [attr.x]="L - 5" [attr.y]="y(mx() * f) + 4" font-size="10" text-anchor="end" fill="#737476">{{ round(mx() * f) }}</text> }
      @for (s of D(); track s.k; let i = $index) { @if (s.n) { <rect [attr.x]="x(i) - bw() / 2" [attr.y]="y(0) - s.n / bmx() * 38" [attr.width]="bw()" [attr.height]="s.n / bmx() * 38" fill="#C6C309" opacity=".6"/> } }
      <polyline fill="none" stroke="#317330" stroke-width="2.6" [attr.points]="puntos()"/>
      @for (s of D(); track s.k; let i = $index) { <circle [attr.cx]="x(i)" [attr.cy]="y(s.acc)" r="3" fill="#86B327" stroke="#317330"/>
        @if (i % paso() === 0 || i === D().length - 1) { <text [attr.x]="x(i)" [attr.y]="H - 8" font-size="10" text-anchor="middle" fill="#737476">{{ lab(s.k) }}</text> } }
      <text [attr.x]="x(D().length - 1)" [attr.y]="y(D()[D().length - 1].acc) - 9" font-size="11" font-weight="800" text-anchor="end" fill="#2E322F">{{ D()[D().length - 1].acc }}</text>
    </svg>
    <div class="tiny muted"><span style="color:#317330">●━</span> evaluaciones acumuladas · <span style="color:#C6C309">▮</span> evaluaciones de cada mes</div> }` })
export class LineaAcum {
  serie = input.required<{ k: string; n: number; acc: number }[]>();
  W = 560; H = 190; L = 34; R = 16; T = 16; B = 30;
  D = computed(() => this.serie().slice(-24));
  mx = computed(() => Math.max(1, ...this.D().map(s => s.acc))); bmx = computed(() => Math.max(1, ...this.D().map(s => s.n)));
  bw = computed(() => Math.max(4, (this.W - this.L - this.R) / this.D().length - 5)); paso = computed(() => Math.ceil(this.D().length / 8));
  x = (i: number) => this.L + i * ((this.W - this.L - this.R) / (this.D().length - 1));
  y = (v: number) => this.T + (this.mx() - v) * ((this.H - this.T - this.B) / this.mx());
  puntos = computed(() => this.D().map((s, i) => this.x(i) + "," + this.y(s.acc)).join(" "));
  round = Math.round; lab = (k: string) => M.MESES_C[Number(k.slice(5, 7)) - 1] + " " + k.slice(2, 4);
}

/** Evolución de la calificación de una unidad. */
@Component({ selector: "pv-tendencia", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (sn().length < 2) { <p class="tiny muted">Con dos o más calificaciones se muestra la evolución.</p> } @else {
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" width="100%" style="max-width:640px">
      @for (n of niveles(); track n.min) { <line [attr.x1]="L" [attr.x2]="W - R" [attr.y1]="y(n.min)" [attr.y2]="y(n.min)" stroke="#DADDD8" stroke-dasharray="4 4"/><text [attr.x]="L - 5" [attr.y]="y(n.min) + 4" font-size="10" text-anchor="end" fill="#737476">{{ n.min }}</text> }
      <polyline fill="none" stroke="#317330" stroke-width="2.5" [attr.points]="puntos()"/>
      @for (s of sn(); track s.codigo; let i = $index) { <circle [attr.cx]="x(i)" [attr.cy]="y(s.total)" r="4.5" fill="#86B327" stroke="#317330" stroke-width="2"/>
        <text [attr.x]="x(i) + dx(i)" [attr.y]="y(s.total) - 10" font-size="11" font-weight="800" [attr.text-anchor]="anc(i)" fill="#2E322F">{{ m.fmt(s.total, 1) }}</text>
        <text [attr.x]="x(i) + dx(i)" [attr.y]="H - 8" font-size="10" [attr.text-anchor]="anc(i)" fill="#737476">{{ s.fecha }}</text> }
    </svg> }` })
export class Tendencia {
  m: any = M; sn = input.required<any[]>();
  W = 560; H = 170; L = 34; R = 26; T = 18; B = 28; hi = 100;
  lo = computed(() => Math.max(0, Math.floor((Math.min(...this.sn().map(s => s.total)) - 10) / 10) * 10));
  niveles = computed(() => ctx.PARAMS.niveles.filter((n: any) => n.min > this.lo() && n.min <= this.hi));
  x = (i: number) => this.L + i * ((this.W - this.L - this.R) / (this.sn().length - 1));
  y = (v: number) => this.T + (this.hi - v) * ((this.H - this.T - this.B) / (this.hi - this.lo()));
  puntos = computed(() => this.sn().map((s, i) => this.x(i) + "," + this.y(s.total)).join(" "));
  anc = (i: number) => i === 0 ? "start" : i === this.sn().length - 1 ? "end" : "middle";
  dx = (i: number) => i === 0 ? -4 : i === this.sn().length - 1 ? 4 : 0;
}

export const UI_COMPONENTS = [NivelTag, EstadoTag, PrioTag, Progreso, Kpi, Columnas, BarrasH, LineaAcum, Tendencia, RouterLink] as const;
