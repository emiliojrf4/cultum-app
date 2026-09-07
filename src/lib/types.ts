export type TipoCampana = "donativo_con_obsequio" | "donativo_sin_obsequio" | "rifa_autorizada";
export type MetodoPago = "bizum" | "efectivo" | "tarjeta";
export type EstadoVenta = "pendiente" | "pagado" | "liquidado";

export interface Campana {
  id: string;
  nombre: string;
  entidad_nombre: string;
  tipo: TipoCampana;
  precio_papeleta: number | null;
  importe_sugerido: number | null;
  total_papeletas: number | null;
  descripcion: string | null;
  objetivo: number | null;
  obsequio_nombre: string | null;
  premio_nombre: string | null;
  fecha_texto: string | null;
  entidad_token: string;
  autorizacion_junta: boolean;
  activa: boolean;
  created_at: string;
}

// Columnas de `campanas` legibles por el rol anon (ver migración
// 0011_restringir_entidad_token.sql). No incluye entidad_token: consultas
// públicas deben pedir esta lista explícita, nunca "*".
export const PUBLIC_CAMPANA_COLUMNS =
  "id, nombre, entidad_nombre, tipo, precio_papeleta, importe_sugerido, total_papeletas, descripcion, objetivo, obsequio_nombre, premio_nombre, fecha_texto, autorizacion_junta, activa, created_at";

export type RolPersona = "vendedor" | "donante";

export interface Persona {
  id: string;
  campana_id: string;
  nombre: string;
  telefono: string;
  rol: RolPersona;
  rango_inicio: number | null;
  rango_fin: number | null;
  enlace_token: string;
  created_at: string;
}

export interface Venta {
  id: string;
  campana_id: string;
  persona_id: string | null;
  numero_papeleta: number | null;
  comprador_nombre: string | null;
  comprador_telefono: string | null;
  importe: number;
  metodo_pago: MetodoPago;
  estado: EstadoVenta;
  stripe_payment_id: string | null;
  created_at: string;
}
