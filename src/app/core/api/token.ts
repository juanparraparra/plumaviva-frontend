/* Almacenamiento del token de sesión. sessionStorage: la sesión sobrevive a recargas
   pero no queda disponible para otra pestaña (reduce el riesgo ante XSS). */
const CLAVE = "pv_token";
const CLAVE_RESET = "pv_reset";
const CLAVE_CAMBIO = "pv_cambio";
const CLAVE_2FA = "pv_2fa";

export interface Desafio2fa {
  desafio: string;
  correo: string;
}

export function tokenActual(): string | null {
  try { return sessionStorage.getItem(CLAVE) || localStorage.getItem(CLAVE); } catch { return null; }
}

export function guardarToken(token: string): void {
  try { sessionStorage.setItem(CLAVE, token); localStorage.removeItem(CLAVE); } catch { /* sin storage */ }
}

export function limpiarToken(): void {
  try { sessionStorage.removeItem(CLAVE); localStorage.removeItem(CLAVE); } catch { /* sin storage */ }
}

export function guardarTokenReset(token: string): void {
  try { sessionStorage.setItem(CLAVE_RESET, token); } catch { /* sin storage */ }
}

export function tokenReset(): string | null {
  try { return sessionStorage.getItem(CLAVE_RESET); } catch { return null; }
}

export function limpiarTokenReset(): void {
  try { sessionStorage.removeItem(CLAVE_RESET); } catch { /* sin storage */ }
}

/** Token temporal que devuelve el login cuando el usuario debe cambiar la clave genérica. */
export function guardarTokenCambio(token: string): void {
  try { sessionStorage.setItem(CLAVE_CAMBIO, token); } catch { /* sin storage */ }
}

export function tokenCambio(): string | null {
  try { return sessionStorage.getItem(CLAVE_CAMBIO); } catch { return null; }
}

export function limpiarTokenCambio(): void {
  try { sessionStorage.removeItem(CLAVE_CAMBIO); } catch { /* sin storage */ }
}

/** Desafío 2FA pendiente; se guarda para que la pantalla de código sobreviva a una recarga. */
export function guardarDesafio2fa(datos: Desafio2fa): void {
  try { sessionStorage.setItem(CLAVE_2FA, JSON.stringify(datos)); } catch { /* sin storage */ }
}

export function leerDesafio2fa(): Desafio2fa | null {
  try {
    const texto = sessionStorage.getItem(CLAVE_2FA);
    if (!texto) return null;
    const datos = JSON.parse(texto);
    return datos?.desafio ? { desafio: String(datos.desafio), correo: String(datos.correo || "") } : null;
  } catch { return null; }
}

export function limpiarDesafio2fa(): void {
  try { sessionStorage.removeItem(CLAVE_2FA); } catch { /* sin storage */ }
}

export function limpiarPendientesAcceso(): void {
  limpiarTokenCambio();
  limpiarDesafio2fa();
}
