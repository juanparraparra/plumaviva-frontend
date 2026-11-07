/* Entorno real: los datos vienen del backend (Express + MySQL).
   Para la demostración/paridad use la configuración "demo" (environment.demo.ts).
   En Firebase el valor real se lee de config.json al arrancar (ver src/app/core/api/config.ts). */
export const environment = {
  modoDemo: false,
  /* "/api" sirve cuando el backend entrega también el front (mismo origen).
     En Firebase se sobreescribe con config.json. */
  apiUrl: "/api",
  /* Archivo leído en tiempo de ejecución, publicado junto al index.html. */
  configUrl: "config.json"
};
