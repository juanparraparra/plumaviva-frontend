import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DomSanitizer } from "@angular/platform-browser";
import { DialogService } from "./core/services/dialog.service";
import { StoreService } from "./core/services/store.service";

/** Host único de ventanas modales y avisos (toast). */
@Component({
  selector: "pv-dialogos", imports: [FormsModule], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (d.abierto(); as a) {
    <div class="modal-bg" (click)="cerrarFuera($event)" (keydown.escape)="d.cerrar(null)">
      <div class="modal" role="dialog" aria-modal="true">
        <header><h2>{{ a.titulo }}</h2><button class="btn ghost" type="button" aria-label="Cerrar" (click)="d.cerrar(null)">✕</button></header>
        <div class="body">
          @if (a.mensaje) { <p>{{ a.mensaje }}</p> }
          @if (a.html) { <div [innerHTML]="seguro(a.html)"></div> }
          @for (c of a.campos || []; track c.id) {
            <div class="field"><label [for]="'dlg-' + c.id">{{ c.label }}</label>
              @switch (c.tipo) {
                @case ('select') { <select [id]="'dlg-' + c.id" [(ngModel)]="a.valores[c.id]">@for (o of c.opciones; track o) { <option>{{ o }}</option> }</select> }
                @case ('textarea') { <textarea [id]="'dlg-' + c.id" rows="3" [placeholder]="c.ph || ''" [(ngModel)]="a.valores[c.id]"></textarea> }
                @default { <input [id]="'dlg-' + c.id" [(ngModel)]="a.valores[c.id]"> }
              }
            </div>
          }
          @if (a.error) { <div class="alert err">{{ a.error }}</div> }
        </div>
        <footer>
          @if (a.cancelTxt !== null) { <button class="btn sec" type="button" (click)="d.cerrar(null)">{{ a.cancelTxt || 'Cancelar' }}</button> }
          <button type="button" [class]="a.okClase || 'btn'" (click)="aceptar()">{{ a.okTxt || 'Aceptar' }}</button>
        </footer>
      </div>
    </div>
  }
  @for (t of store.avisos(); track t.id) { <div class="toast">{{ t.msg }}</div> }`
})
export class Dialogos {
  d = inject(DialogService); store = inject(StoreService); private san = inject(DomSanitizer);
  seguro(h: string) { return this.san.bypassSecurityTrustHtml(h); }
  cerrarFuera(e: Event) { if ((e.target as HTMLElement).classList.contains("modal-bg")) this.d.cerrar(null); }
  aceptar() {
    const a = this.d.abierto(); if (!a) return;
    for (const c of a.campos || []) if (c.min && (a.valores[c.id] || "").trim().length < c.min) { a.error = `${c.label.replace(" *", "")}: escriba al menos ${c.min} caracteres.`; this.d.abierto.set({ ...a }); return; }
    this.d.cerrar(a.valores);
  }
}
