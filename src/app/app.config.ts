import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from "@angular/core";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideRouter, withHashLocation } from "@angular/router";
import { routes } from "./app.routes";
import { authInterceptor } from "./core/api/auth.interceptor";
import { cargarConfiguracion } from "./core/api/config";
import { AuthService } from "./core/services/auth.service";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Resuelve la URL de la API (config.json en Firebase) y luego restaura la sesión
    // antes de que el router evalúe el guard de acceso.
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      return cargarConfiguracion().then(() => auth.arrancar());
    })
  ]
};
