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
  autorizacion_junta: boolean;
  activa: boolean;
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
