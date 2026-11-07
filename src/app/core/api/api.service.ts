import { HttpClient, HttpErrorResponse, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, catchError, throwError } from "rxjs";
import { apiBase } from "./config";

/** Mensaje legible para cualquier error de la API. */
export function mensajeError(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return "No se pudo conectar con el servidor. Verifique que esté encendido (npm run dev).";
    return e.error?.error || `El servidor respondió con un error (HTTP ${e.status}).`;
  }
  return (e as any)?.message || "Ocurrió un error inesperado.";
}

/** Cliente único de la API: agrega la base, normaliza errores y deja listo el resto de servicios. */
@Injectable({ providedIn: "root" })
export class ApiService {
  private http = inject(HttpClient);
  /* Getter: la URL puede cambiar al cargar config.json después de crear el servicio. */
  get base(): string { return apiBase(); }

  private url(ruta: string): string { return this.base + (ruta.startsWith("/") ? ruta : "/" + ruta); }

  get<T>(ruta: string, params?: Record<string, string | number | boolean>): Promise<T> {
    let p = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => { p = p.set(k, String(v)); });
    return this.pedir<T>(this.http.get<T>(this.url(ruta), { params: p }));
  }
  post<T>(ruta: string, cuerpo?: unknown): Promise<T> { return this.pedir<T>(this.http.post<T>(this.url(ruta), cuerpo ?? {})); }
  put<T>(ruta: string, cuerpo?: unknown): Promise<T> { return this.pedir<T>(this.http.put<T>(this.url(ruta), cuerpo ?? {})); }
  delete<T>(ruta: string): Promise<T> { return this.pedir<T>(this.http.delete<T>(this.url(ruta))); }

  private pedir<T>(obs: Observable<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      obs.pipe(catchError((e: unknown) => throwError(() => new Error(mensajeError(e)))))
        .subscribe({ next: v => resolve(v), error: e => reject(e) });
    });
  }
}
