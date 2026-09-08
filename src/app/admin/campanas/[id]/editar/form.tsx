"use client";

import { useActionState } from "react";
import { actualizarCampana } from "../../../actions";
import type { Campana } from "@/lib/types";

type State = { error: string | null; savedAt: number | null };

const inputClass =
  "w-full rounded-lg border border-[#E4D8C4] bg-white px-3 py-2 text-sm text-[#2A211C]";
const labelClass = "mb-1 block text-xs text-[#8A7B6C]";

export function EditarCampanaForm({ campana: c }: { campana: Campana }) {
  async function action(_prev: State, formData: FormData): Promise<State> {
    try {
      await actualizarCampana(c.id, formData);
      return { error: null, savedAt: Date.now() };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo guardar", savedAt: null };
    }
  }

  const [state, formAction, pending] = useActionState(action, { error: null, savedAt: null });

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3] p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Entidad</label>
          <input name="entidad_nombre" required defaultValue={c.entidad_nombre} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Título de la campaña</label>
          <input name="nombre" required defaultValue={c.nombre} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Descripción</label>
        <textarea name="descripcion" defaultValue={c.descripcion ?? ""} className={`${inputClass} min-h-[70px]`} />
      </div>

      {c.tipo === "donativo_con_obsequio" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Obsequio</label>
            <input name="obsequio_nombre" defaultValue={c.obsequio_nombre ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Donativo por papeleta (€)</label>
            <input name="precio_papeleta" type="number" step="0.01" required defaultValue={c.precio_papeleta ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Número total de papeletas</label>
            <input name="total_papeletas" type="number" required defaultValue={c.total_papeletas ?? ""} className={inputClass} />
          </div>
        </div>
      )}

      {c.tipo === "donativo_sin_obsequio" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Valor sugerido del donativo (€)</label>
            <input name="importe_sugerido" type="number" step="0.01" required defaultValue={c.importe_sugerido ?? ""} className={inputClass} />
          </div>
        </div>
      )}

      {c.tipo === "rifa_autorizada" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Premio del sorteo</label>
            <input name="premio_nombre" required defaultValue={c.premio_nombre ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Donativo por papeleta (€)</label>
            <input name="precio_papeleta" type="number" step="0.01" required defaultValue={c.precio_papeleta ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Número total de papeletas</label>
            <input name="total_papeletas" type="number" required defaultValue={c.total_papeletas ?? ""} className={inputClass} />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Objetivo de recaudación (€)</label>
          <input name="objetivo" type="number" step="0.01" defaultValue={c.objetivo ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{c.tipo === "rifa_autorizada" ? "Fecha del sorteo" : "Campaña abierta hasta"}</label>
          <input name="fecha_texto" defaultValue={c.fecha_texto ?? ""} className={inputClass} />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.savedAt && <p className="text-sm text-[#4B6C4C]">Guardado.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#5B1220] px-5 py-2.5 text-sm font-semibold text-[#E9D6A8] disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
