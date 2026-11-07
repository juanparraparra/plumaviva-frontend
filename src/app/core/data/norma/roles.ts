/* Datos de la norma · Metodología EBA del ICA v2.0 (2024). Generado desde el prototipo v6 Final 3. */
import { RolDef } from "../../models/tipos";
export const ROLES_BASE: RolDef[] = [
  {
    "id": "ADMIN",
    "nombre": "Administrador",
    "guia": "Administrador",
    "plat": "Administrador del sistema",
    "desc": "Usuarios, roles y accesos; inhabilita o rehabilita unidades productivas y elimina registros duplicados; parametriza listas de chequeo, pesos y respuestas.",
    "menu": [
      "inicio",
      "usuarios",
      "roles",
      "auditoria",
      "unidades",
      "evaluaciones",
      "seguimiento",
      "parametrizacion"
    ]
  },
  {
    "id": "COORD",
    "nombre": "Coordinador ICA",
    "guia": "Docente",
    "plat": "Coordinador / Supervisor ICA",
    "desc": "Supervisa inspectores, consulta unidades de su seccional, crea y asigna evaluaciones, publica listas y valida resultados.",
    "menu": [
      "inicio",
      "unidades",
      "evaluaciones",
      "parametrizacion"
    ]
  },
  {
    "id": "INSP",
    "nombre": "Inspector ICA",
    "guia": "Estudiante evaluador",
    "plat": "Inspector ICA (evaluador)",
    "desc": "Verifica unidades productivas en campo, registra traspatio y diligencia la evaluación por fases con evidencias.",
    "menu": [
      "inicio",
      "unidades",
      "evaluaciones",
      "seguimiento"
    ]
  },
  {
    "id": "CONS",
    "nombre": "Consultor externo",
    "guia": "Consultor externo",
    "plat": "Consultor externo",
    "desc": "Acceso temporal a información agregada y anonimizada.",
    "menu": [
      "inicio"
    ]
  },
  {
    "id": "PROD",
    "nombre": "Productor",
    "guia": "Usuario productor",
    "plat": "Productor / titular de granja avícola",
    "desc": "Registra su granja, galpones e inventario; consulta sus evaluaciones, historial y plan de mejora. No modifica las evaluaciones.",
    "menu": [
      "inicio",
      "unidades",
      "evaluaciones"
    ]
  },
  {
    "id": "TEN",
    "nombre": "Tenedor",
    "guia": "Usuario tenedor",
    "plat": "Tenedor del predio",
    "desc": "Consulta el predio que tiene a su cargo, sus evaluaciones, el historial y el plan de mejora. No modifica la información.",
    "menu": [
      "inicio",
      "unidades",
      "evaluaciones"
    ]
  },
  {
    "id": "RT",
    "nombre": "Responsable técnico",
    "guia": "Profesional asesor",
    "plat": "Responsable técnico (MV / MVZ / Z)",
    "desc": "Vinculado a varias unidades productivas; aporta soportes documentales y atiende hallazgos.",
    "menu": [
      "inicio",
      "unidades",
      "evaluaciones",
      "seguimiento"
    ]
  }
];
