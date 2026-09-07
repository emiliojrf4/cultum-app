"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { crearCampana } from "../actions";
import type { TipoCampana } from "@/lib/types";

type State = { error: string | null };

const inputClass =
  "w-full rounded-lg border border-[#E4D8C4] bg-white px-3 py-2 text-sm text-[#2A211C]";
const labelClass = "mb-1 block text-xs text-[#8A7B6C]";

export function NuevaCampanaForm() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoCampana>("donativo_con_obsequio");

  async function action(_prev: State, formData: FormData): Promise<State> {
    try {
      const result = await crearCampana(formData);
      router.push(`/admin/campanas/${result.id}`);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo crear la campaña" };
    }
  }

  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3] p-5">
      <div className="flex gap-2">
        {(
          [
            ["donativo_con_obsequio", "Donativo con obsequio", "Papeletas numeradas, precio fijo"],
            ["donativo_sin_obsequio", "Donativo sin obsequio", "Importe libre, sin papeletas"],
            ["rifa_autorizada", "Rifa autorizada", "Premio por sorteo, con autorización"],
          ] as const
        ).map(([value, title, sub]) => (
          <button
            type="button"
            key={value}
            onClick={() => setTipo(value)}
            className={`flex-1 rounded-lg border p-3 text-left ${
              tipo === value ? "border-[#5B1220] bg-[#E9D6A8]" : "border-[#E4D8C4] bg-white"
            }`}
          >
            <div className="text-[13px] font-semibold">{title}</div>
            <div className="text-[11px] text-[#8A7B6C]">{sub}</div>
          </button>
        ))}
      </div>
      <input type="hidden" name="tipo" value={tipo} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Entidad</label>
          <input name="entidad_nombre" required className={inputClass} placeholder="Club Voleibol Triana..." />
        </div>
        <div>
          <label className={labelClass}>Título de la campaña</label>
          <input name="nombre" required className={inputClass} placeholder="Restauración de la Cruz de Mayo" />
        </div>
      </div>

      <div>
        <label className={labelClass}>Descripción</label>
        <textarea name="descripcion" className={`${inputClass} min-h-[70px]`} placeholder="Para qué se usará el dinero recaudado" />
      </div>

      {tipo === "donativo_con_obsequio" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Obsequio</label>
            <input name="obsequio_nombre" className={inputClass} placeholder="Pulsera bordada" />
          </div>
          <div>
            <label className={labelClass}>Donativo por papeleta (€)</label>
            <input name="precio_papeleta" type="number" step="0.01" required className={inputClass} placeholder="2" />
          </div>
          <div>
            <label className={labelClass}>Número total de papeletas</label>
            <input name="total_papeletas" type="number" required className={inputClass} placeholder="1000" />
          </div>
        </div>
      )}

      {tipo === "donativo_sin_obsequio" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Valor sugerido del donativo (€)</label>
            <input name="importe_sugerido" type="number" step="0.01" required className={inputClass} placeholder="20" />
          </div>
        </div>
      )}

      {tipo === "rifa_autorizada" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Premio del sorteo</label>
            <input name="premio_nombre" required className={inputClass} placeholder="Estancia de fin de semana" />
          </div>
          <div>
            <label className={labelClass}>Donativo por papeleta (€)</label>
            <input name="precio_papeleta" type="number" step="0.01" required className={inputClass} placeholder="3" />
          </div>
          <div>
            <label className={labelClass}>Número total de papeletas</label>
            <input name="total_papeletas" type="number" required className={inputClass} placeholder="500" />
          </div>
          <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-[#B8862F] bg-[#F8EEE4] p-3 text-[12.5px] text-[#3E0C16]">
            <input type="checkbox" name="autorizacion_junta" id="autorizacion_junta" className="mt-0.5" />
            <label htmlFor="autorizacion_junta">
              Confirmo que la entidad dispone de autorización de la Junta de Andalucía para esta rifa
              y ha constituido la fianza correspondiente.
            </label>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Objetivo de recaudación (€)</label>
          <input name="objetivo" type="number" step="0.01" className={inputClass} placeholder="5000" />
        </div>
        <div>
          <label className={labelClass}>{tipo === "rifa_autorizada" ? "Fecha del sorteo" : "Campaña abierta hasta"}</label>
          <input name="fecha_texto" className={inputClass} placeholder="15 de junio" />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#5B1220] px-5 py-2.5 text-sm font-semibold text-[#E9D6A8] disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar campaña"}
      </button>
    </form>
  );
}
