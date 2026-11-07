import { environment } from "../../../environments/environment";

/**
 * URL base de la API en tiempo de ejecución.
 *
 * Prioridad:
 *  1. localStorage "pv_api" (útil para pruebas manuales desde la consola del navegador).
 *  2. config.json publicado junto al index.html (Firebase Hosting).
 *  3. environment.apiUrl ("/api" cuando el backend sirve el front en el mismo origen).
 *
 * En localhost/127.0.0.1 se ignora config.json para seguir usando el proxy de `ng serve`.
 */
let apiUrl = environment.apiUrl;

function esLocal(): boolean {
  if (typeof location === "undefined") return false;
  const host = location.hostname;
  return host === "" || host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export async function cargarConfiguracion(): Promise<void> {
  // 1) Override manual: localStorage.setItem("pv_api", "https://api.midominio.com/api")
  try {
    const manual = localStorage.getItem("pv_api");
    if (manual && manual.trim()) {
      apiUrl = manual.trim();
      return;
    }
  } catch {
    /* storage bloqueado: se continúa con la configuración por defecto */
  }

  // 2) En desarrollo local se mantiene environment.apiUrl + proxy.conf.json
  if (esLocal()) return;

  // 3) config.json junto al index.html (se puede cambiar y volver a desplegar sin recompilar)
  try {
    const ruta = environment.configUrl || "config.json";
    const respuesta = await fetch(`${ruta}?v=${Date.now()}`, { cache: "no-store" });
    if (!respuesta.ok) return;
    const cfg = await respuesta.json();
    if (typeof cfg?.apiUrl === "string" && cfg.apiUrl.trim()) {
      apiUrl = cfg.apiUrl.trim();
    }
  } catch {
    /* si no existe o es inválido se usa environment.apiUrl */
  }
}

/** URL base normalizada, sin barra final. */
export function apiBase(): string {
  return (apiUrl || "/api").replace(/\/+$/, "");
}
