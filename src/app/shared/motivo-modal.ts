import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";
import { Modal } from "./modal";

export interface CampoSelect { id: string; etiqueta: string; opciones: string[] | ((v: Record<string, string>) => string[]); valores?: [string, string][] }

/** Diálogo estándar de la plataforma: listas de motivo + descripción obligatoria (mínimo 10 caracteres). El contenido proyectado es la introducción. */
@Component({
  selector: "pv-motivo-modal", imports: [Modal], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<pv-modal [titulo]="titulo()" (cerrar)="cerrar.emit()">
    <ng-content />
    @for (c of campos(); track c.id) {
      <div class="field"><label [for]="'mm-' + c.id">{{ c.etiqueta }} *</label>
        <select [id]="'mm-' + c.id" [value]="valor(c.id)" (change)="poner(c.id, $any($event.target).value)">
          @if (c.valores) { @for (v of c.valores; track v[0]) { <option [value]="v[0]">{{ v[1] }}</option> } }
          @else { @for (o of lista(c); track o) { <option [value]="o">{{ o }}</option> } }
        </select></div>
    }
    <div class="field"><label for="mm-det">{{ etiquetaDetalle() }}@if (minimo() > 0) { * }</label>
      <textarea id="mm-det" rows="3" [placeholder]="ayuda()" [value]="detalle()" (input)="detalle.set($any($event.target).value)"></textarea>
      @if (minimo() > 0 && intento() && corto()) { <span class="hint" style="color:var(--vino)" role="alert">Escriba al menos {{ minimo() }} caracteres.</span> }</div>
    <ng-container pie><button class="btn sec" type="button" (click)="cerrar.emit()">Cancelar</button>
      <button class="btn" [class.danger]="peligro()" type="button" (click)="aceptar()">{{ okTxt() }}</button></ng-container></pv-modal>`
})
export class MotivoModal {
  titulo = input.required<string>(); okTxt = input("Confirmar"); peligro = input(false);
  campos = input<CampoSelect[]>([]); etiquetaDetalle = input("Descripción"); ayuda = input(""); minimo = input(10);
  confirmar = output<{ valores: Record<string, string>; detalle: string }>(); cerrar = output<void>();

  private elegidos = signal<Record<string, string>>({});
  detalle = signal(""); intento = signal(false);
  corto = computed(() => this.detalle().trim().length < this.minimo());

  lista(c: CampoSelect): string[] { return typeof c.opciones === "function" ? c.opciones(this.valores()) : c.opciones; }
  /** Valores vigentes: lo elegido o, si no, la primera opción de cada lista (las listas dependientes ven lo ya resuelto). */
  valores(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const c of this.campos()) {
      const posibles = c.valores ? c.valores.map(v => v[0]) : typeof c.opciones === "function" ? c.opciones(out) : c.opciones;
      const e = this.elegidos()[c.id]; out[c.id] = e && posibles.includes(e) ? e : posibles[0];
    }
    return out;
  }
  valor(id: string) { return this.valores()[id]; }
  poner(id: string, v: string) { this.elegidos.update(x => ({ ...x, [id]: v })); }
  aceptar() {
    this.intento.set(true);
    if (this.corto()) return;
    this.confirmar.emit({ valores: this.valores(), detalle: this.detalle().trim() });
  }
}
