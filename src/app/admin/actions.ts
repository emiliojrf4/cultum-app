"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { TipoCampana } from "@/lib/types";

function num(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (!raw || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  const s = typeof raw === "string" ? raw.trim() : "";
  return s || null;
}

export async function crearCampana(formData: FormData) {
  const tipo = formData.get("tipo") as TipoCampana;
  const autorizacionJunta = formData.get("autorizacion_junta") === "on";

  if (tipo === "rifa_autorizada" && !autorizacionJunta) {
    throw new Error("Para crear una rifa autorizada hay que confirmar la autorización y fianza.");
  }

  const { data, error } = await supabaseAdmin
    .from("campanas")
    .insert({
      entidad_nombre: str(formData, "entidad_nombre"),
      nombre: str(formData, "nombre"),
      descripcion: str(formData, "descripcion"),
      tipo,
      precio_papeleta: tipo !== "donativo_sin_obsequio" ? num(formData, "precio_papeleta") : null,
      importe_sugerido: tipo === "donativo_sin_obsequio" ? num(formData, "importe_sugerido") : null,
      total_papeletas: tipo !== "donativo_sin_obsequio" ? num(formData, "total_papeletas") : null,
      obsequio_nombre: tipo === "donativo_con_obsequio" ? str(formData, "obsequio_nombre") : null,
      premio_nombre: tipo === "rifa_autorizada" ? str(formData, "premio_nombre") : null,
      fecha_texto: str(formData, "fecha_texto"),
      objetivo: num(formData, "objetivo"),
      autorizacion_junta: tipo === "rifa_autorizada" ? autorizacionJunta : false,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la campaña");
  }

  revalidatePath("/admin");
  return { id: data.id as string };
}

export async function crearPersona(campanaId: string, formData: FormData) {
  const { data: campana, error: campanaError } = await supabaseAdmin
    .from("campanas")
    .select("total_papeletas")
    .eq("id", campanaId)
    .single();

  if (campanaError || !campana) {
    throw new Error("Campaña no encontrada");
  }

  const nombre = str(formData, "nombre");
  const telefono = str(formData, "telefono");
  const rol = formData.get("rol") === "donante" ? "donante" : "vendedor";

  if (!nombre || !telefono) {
    throw new Error("Nombre y teléfono son obligatorios");
  }

  let rangoInicio: number | null = null;
  let rangoFin: number | null = null;

  if (rol === "vendedor" && campana.total_papeletas !== null) {
    const cupo = num(formData, "cupo") ?? 10;
    const { data: existentes } = await supabaseAdmin
      .from("personas")
      .select("rango_fin")
      .eq("campana_id", campanaId)
      .not("rango_fin", "is", null)
      .order("rango_fin", { ascending: false })
      .limit(1);

    const siguiente = (existentes?.[0]?.rango_fin ?? 0) + 1;
    if (siguiente + cupo - 1 > campana.total_papeletas) {
      throw new Error(
        `Solo quedan ${Math.max(0, campana.total_papeletas - siguiente + 1)} papeletas sin asignar en esta campaña.`,
      );
    }
    rangoInicio = siguiente;
    rangoFin = siguiente + cupo - 1;
  }

  const { error } = await supabaseAdmin.from("personas").insert({
    campana_id: campanaId,
    nombre,
    telefono,
    rol,
    rango_inicio: rangoInicio,
    rango_fin: rangoFin,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/campanas/${campanaId}`);
}

export async function actualizarPersona(personaId: string, campanaId: string, formData: FormData) {
  const nombre = str(formData, "nombre");
  const telefono = str(formData, "telefono");
  if (!nombre || !telefono) {
    throw new Error("Nombre y teléfono son obligatorios");
  }

  const { error } = await supabaseAdmin.from("personas").update({ nombre, telefono }).eq("id", personaId);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/campanas/${campanaId}`);
}

export async function eliminarPersona(personaId: string, campanaId: string) {
  const { error } = await supabaseAdmin.from("personas").delete().eq("id", personaId);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/campanas/${campanaId}`);
}

export async function ampliarCupo(personaId: string, campanaId: string, cantidad = 10) {
  const [{ data: persona, error: personaError }, { data: campana, error: campanaError }] = await Promise.all([
    supabaseAdmin.from("personas").select("rango_inicio, rango_fin").eq("id", personaId).single(),
    supabaseAdmin.from("campanas").select("total_papeletas").eq("id", campanaId).single(),
  ]);

  if (personaError || !persona || persona.rango_fin === null) {
    throw new Error("Esta persona no tiene cupo de papeletas");
  }
  if (campanaError || !campana || campana.total_papeletas === null) {
    throw new Error("Campaña no encontrada");
  }

  const { data: otros } = await supabaseAdmin
    .from("personas")
    .select("rango_fin")
    .eq("campana_id", campanaId)
    .not("rango_fin", "is", null)
    .order("rango_fin", { ascending: false })
    .limit(1);

  const maxAsignado = otros?.[0]?.rango_fin ?? 0;
  if (maxAsignado > persona.rango_fin) {
    throw new Error(
      "No se puede ampliar: ya hay números asignados por encima de su rango. Añade un colaborador nuevo en su lugar.",
    );
  }

  const nuevoFin = persona.rango_fin + cantidad;
  if (nuevoFin > campana.total_papeletas) {
    throw new Error(
      `Solo quedan ${Math.max(0, campana.total_papeletas - persona.rango_fin)} papeletas sin asignar en esta campaña.`,
    );
  }

  const { error } = await supabaseAdmin.from("personas").update({ rango_fin: nuevoFin }).eq("id", personaId);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/campanas/${campanaId}`);
}
