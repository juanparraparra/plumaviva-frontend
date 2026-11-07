import { Injectable, inject } from "@angular/core";
import { ctx } from "../engine/contexto";
import { StoreService } from "./store.service";
import { ApiService } from "../api/api.service";
import { usuarioParaApi } from "../api/mappers";

/** CRUD de usuarios contra la API (con equivalencia en memoria para el modo demo). */
@Injectable({ providedIn: "root" })
export class UsuariosService {
  private store = inject(StoreService);
  private api = inject(ApiService);

  async crear(datos: any): Promise<{ id: number; correo_enviado?: boolean; aviso?: string }> {
    if (this.store.modoDemo) {
      const id = ctx.S.nextUser++;
      ctx.S.users.push({ ...datos, id, estado: datos.estado || "ACTIVO", historial: false });
      this.store.touch();
      return { id };
    }
    const r = await this.api.post<{ id: number; correo_enviado?: boolean; aviso?: string }>("/usuarios", usuarioParaApi(datos));
    await this.store.recargar("usuarios");
    return r;
  }

  async actualizar(u: any, datos: any): Promise<void> {
    if (this.store.modoDemo) {
      Object.assign(u, datos); this.store.touch(); return;
    }
    await this.api.put(`/usuarios/${u.id}`, usuarioParaApi({ ...u, ...datos }));
    await this.store.recargar("usuarios");
  }

  async cambiarEstado(u: any, estado: string): Promise<void> {
    if (this.store.modoDemo) {
      u.estado = estado; this.store.touch(); return;
    }
    await this.api.put(`/usuarios/${u.id}`, usuarioParaApi({ ...u, estado }));
    await this.store.recargar("usuarios");
  }

  async eliminar(u: any): Promise<void> {
    if (this.store.modoDemo) {
      ctx.S.users = ctx.S.users.filter((x: any) => x.id !== u.id);
      this.store.touch(); return;
    }
    await this.api.delete(`/usuarios/${u.id}`);
    await this.store.recargar("usuarios");
  }
}
