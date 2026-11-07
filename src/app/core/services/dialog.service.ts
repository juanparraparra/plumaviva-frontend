import { Injectable, signal } from "@angular/core";

export interface DialogoCfg {
  titulo: string; mensaje?: string; html?: string; okTxt?: string; okClase?: string; cancelTxt?: string | null;
  campos?: { id: string; label: string; tipo: "select" | "textarea" | "text"; opciones?: string[]; min?: number; ph?: string }[];
}
export interface CambioFila { c: string; a: string; d: string }
export interface ConfirmarCambios { titulo: string; introHtml: string; cambios?: CambioFila[]; avisos?: string[]; motivoObl?: boolean; okTxt?: string; peligro?: boolean }
export interface DialogoAbierto extends DialogoCfg { valores: Record<string, string>; error: string; resolver: (v: Record<string, string> | null) => void }

/** Reemplaza modal()/confirmar() del prototipo. Devuelve null si se cancela; si no, los valores capturados. */
@Injectable({ providedIn: "root" })
export class DialogService {
  readonly abierto = signal<DialogoAbierto | null>(null);
  abrir(cfg: DialogoCfg): Promise<Record<string, string> | null> {
    return new Promise(resolver => {
      const valores: Record<string, string> = {};
      (cfg.campos || []).forEach(c => valores[c.id] = c.opciones?.[0] ?? "");
      this.abierto.set({ ...cfg, valores, error: "", resolver } as DialogoAbierto);
    });
  }
  cerrar(r: Record<string, string> | null): void { const d = this.abierto(); if (d) { this.abierto.set(null); d.resolver(r); } }
  /** Confirmación previa de cambios sensibles (antes/después + motivo). Devuelve el motivo escrito, o null si se cancela. */
  async confirmarCambios(o: ConfirmarCambios): Promise<string | null> {
    const esc = (v: any) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
    const tabla = o.cambios?.length ? `<div class="table-wrap"><table><tr><th>Dato</th><th>Antes</th><th>Después</th></tr>${o.cambios.map(c => `<tr><td>${esc(c.c)}</td><td>${esc(c.a)}</td><td><b>${esc(c.d)}</b></td></tr>`).join("")}</table></div>` : "";
    const av = (o.avisos || []).map(a => `<div class="alert warn" style="margin-top:8px">${esc(a)}</div>`).join("");
    const r = await this.abrir({ titulo: o.titulo, html: `<p>${o.introHtml}</p>${tabla}${av}`, okTxt: o.okTxt || "Confirmar cambio", okClase: o.peligro ? "btn danger" : "btn",
      campos: [{ id: "mot", label: o.motivoObl ? "Motivo del cambio *" : "Motivo del cambio (opcional)", tipo: "textarea", min: o.motivoObl ? 10 : undefined, ph: "Por qué se hace este cambio." }] });
    return r === null ? null : (r["mot"] || "").trim();
  }
  confirmar(titulo: string, mensaje: string, okTxt = "Confirmar", okClase = "btn"): Promise<boolean> {
    return this.abrir({ titulo, mensaje, okTxt, okClase }).then(r => r !== null);
  }
}
