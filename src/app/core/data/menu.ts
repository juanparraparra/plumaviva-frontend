/* Menú lateral: etiquetas, grupos e iconos (SVG de 24×24). */
export const ICON: Record<string,string> = {
  inicio: '<path d="M3 11l9-8 9 8M5 10v10h14V10" fill="none" stroke="currentColor" stroke-width="2"/>',
  usuarios: '<circle cx="9" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 100-6M22 20c0-3-2-5-5-5" fill="none" stroke="currentColor" stroke-width="2"/>',
  roles: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" fill="none" stroke="currentColor" stroke-width="2"/>',
  auditoria: '<path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" fill="none" stroke="currentColor" stroke-width="2"/>',
  unidades: '<path d="M3 21V9l9-6 9 6v12M9 21v-6h6v6" fill="none" stroke="currentColor" stroke-width="2"/>',
  evaluaciones: '<path d="M9 3h6v3H9zM6 5h12v16H6z M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2"/>',
  seguimiento: '<path d="M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v13h-4z" fill="none" stroke="currentColor" stroke-width="2"/>',
  parametrizacion: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" stroke="currentColor" stroke-width="2"/>'
};
export const MENU: Record<string,string> = { inicio: "Inicio", usuarios: "Usuarios", roles: "Roles y permisos", auditoria: "Control de cambios", unidades: "Unidades productivas", evaluaciones: "Evaluaciones", seguimiento: "Seguimiento", parametrizacion: "Parametrización" };
export const MENU_GRP: Record<string,string> = { inicio: "General", usuarios: "Administración", roles: "Administración", auditoria: "Administración", unidades: "Operación", evaluaciones: "Operación", seguimiento: "Operación", parametrizacion: "Configuración" };

/* =============================== router =============================== */
