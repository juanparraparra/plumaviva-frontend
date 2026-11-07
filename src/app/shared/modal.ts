import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

/** Ventana modal con formulario propio (equivale a modal() del prototipo). Contenido: cuerpo por defecto y [pie]. */
@Component({
  selector: "pv-modal", changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="modal-bg" (click)="fuera($event)" (keydown.escape)="cerrar.emit()">
    <div class="modal" role="dialog" aria-modal="true"><header><h2>{{ titulo() }}</h2><button class="btn ghost" type="button" aria-label="Cerrar" (click)="cerrar.emit()">✕</button></header>
    <div class="body"><ng-content /></div><footer><ng-content select="[pie]" /></footer></div></div>`
})
export class Modal {
  titulo = input.required<string>(); cerrar = output<void>();
  fuera(e: Event) { if ((e.target as HTMLElement).classList.contains("modal-bg")) this.cerrar.emit(); }
}
