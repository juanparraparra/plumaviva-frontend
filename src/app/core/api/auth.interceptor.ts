import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { StoreService } from "../services/store.service";
import { limpiarToken, tokenActual } from "./token";

/** Agrega el token a cada petición y cierra la sesión si el servidor responde 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const store = inject(StoreService);
  const token = tokenActual();
  const peticion = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(peticion).pipe(catchError(err => {
    if (err?.status === 401 && token) {
      limpiarToken();
      store.setSesion(null);
      router.navigateByUrl("/login");
    }
    return throwError(() => err);
  }));
};
