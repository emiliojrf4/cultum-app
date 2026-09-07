"use client";

import { useActionState } from "react";
import { crearPersona } from "../../actions";

type State = { error: string | null };

const inputClass =
  "w-full rounded-lg border border-[#E4D8C4] bg-white px-3 py-2 text-sm text-[#2A211C]";
const labelClass = "mb-1 block text-xs text-[#8A7B6C]";

export function PersonaForm({ campanaId, sinPapeletas }: { campanaId: string; sinPapeletas: boolean }) {
  async function action(_prev: State, formData: FormData): Promise<State> {
    formData.set("rol", sinPapeletas ? "donante" : "vendedor");
    try {
      await crearPersona(campanaId, formData);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo añadir" };
    }
  }

  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form
      action={formAction}
      key={state.error ?? "ok"}
      className="space-y-4 rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3] p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nombre {sinPapeletas ? "del donante" : "del costalero"}</label>
          <input name="nombre" required className={inputClass} placeholder="Nombre y apellido" />
        </div>
        <div>
          <label className={labelClass}>Teléfono</label>
          <input name="telefono" required className={inputClass} placeholder="600 000 000" />
        </div>
      </div>

      {!sinPapeletas && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Cupo asignado</label>
            <input name="cupo" type="number" defaultValue={10} className={inputClass} />
          </div>
        </div>
      )}

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#5B1220] px-4 py-2 text-sm font-semibold text-[#E9D6A8] disabled:opacity-60"
      >
        {pending ? "Añadiendo…" : `Añadir ${sinPapeletas ? "donante" : "costalero"} y generar enlace`}
      </button>
    </form>
  );
}
