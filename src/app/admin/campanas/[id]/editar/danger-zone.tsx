"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cambiarActivaCampana, eliminarCampana } from "../../../actions";
import type { Campana } from "@/lib/types";

export function DangerZone({ campana: c }: { campana: Campana }) {
  const router = useRouter();
  const [activa, setActiva] = useState(c.activa);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alternarActiva() {
    setTrabajando(true);
    setError(null);
    try {
      await cambiarActivaCampana(c.id, !activa);
      setActiva((v) => !v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado");
    } finally {
      setTrabajando(false);
    }
  }

  async function eliminar() {
    const aviso =
      `¿Eliminar "${c.nombre}" definitivamente? Esto borra también todos sus colaboradores/donantes ` +
      "y TODO el historial de ventas de esta campaña. No se puede deshacer.";
    if (!window.confirm(aviso)) return;
    setTrabajando(true);
    setError(null);
    try {
      await eliminarCampana(c.id);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
      setTrabajando(false);
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-red-300 bg-red-50 p-5">
      <h3 className="mb-1 font-serif text-base text-red-900">Zona de peligro</h3>
      <p className="mb-4 text-xs text-red-800">
        Cerrar una campaña la oculta de la compra pública pero conserva todos los datos — es
        reversible y es lo recomendado. Eliminarla borra todo para siempre.
      </p>

      {error && <p className="mb-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={alternarActiva}
          disabled={trabajando}
          className="rounded-lg border border-red-400 bg-white px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-60"
        >
          {activa ? "Cerrar campaña" : "Reactivar campaña"}
        </button>
        <button
          type="button"
          onClick={eliminar}
          disabled={trabajando}
          className="rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Eliminar campaña definitivamente
        </button>
      </div>
    </div>
  );
}
