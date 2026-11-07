import { ChangeDetectionStrategy, Component, computed, inject, input, output } from "@angular/core";
import { EvaluacionesService, MOTIVOS_ANULAR } from "../core/services/evaluaciones.service";
import { EST_LAB } from "../core/engine/tablas";
import * as M from "../core/engine/motor";
import { MotivoModal } from "./motivo-modal";

/** Diálogo para anular una evaluación abierta (coordinación y administración). */
@Component({
  selector: "pv-anular-evaluacion", imports: [MotivoModal], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<pv-motivo-modal [titulo]="'Anular ' + ev().codigo" okTxt="Anular evaluación" [peligro]="true" [campos]="campos" etiquetaDetalle="Descripción" ayuda="Explique qué ocurrió (mínimo 10 caracteres)."
    (confirmar)="anular($event)" (cerrar)="cerrar.emit()">
    <p>La evaluación de <b>{{ unidad().nombre }}</b> está {{ estado() }} con {{ av().h }} de {{ av().n }} indicadores registrados. Al anularla se conserva en el historial de la unidad con el motivo y la descripción, no cuenta en los resultados y la unidad queda libre para programar una nueva.</p></pv-motivo-modal>`
})
export class AnularEvaluacion {
  ev = input.required<any>(); cerrar = output<void>(); anulada = output<void>();
  private svc = inject(EvaluacionesService);
  campos = [{ id: "motivo", etiqueta: "Motivo", opciones: MOTIVOS_ANULAR }];
  unidad = computed(() => M.unidadById(this.ev().unidad));
  estado = computed(() => String(EST_LAB[this.ev().estado]).toLowerCase());
  av = computed(() => M.avance(this.ev()));
  anular(e: { valores: Record<string, string>; detalle: string }) { this.svc.anular(this.ev(), e.valores["motivo"], e.detalle); this.anulada.emit(); this.cerrar.emit(); }
}
