"use client";

import { useState } from "react";
import { actualizarPersona, ampliarCupo, eliminarPersona } from "../../actions";
import { CopyLink } from "./copy-link";
import type { Persona } from "@/lib/types";

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function PersonaRow({
  persona,
  campanaId,
  url,
  sinPapeletas,
  stats,
}: {
  persona: Persona;
  campanaId: string;
  url: string;
  sinPapeletas: boolean;
  stats: { vendidas: number; confirmado: number; pendiente: number };
}) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(persona.nombre);
  const [telefono, setTelefono] = useState(persona.telefono);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("nombre", nombre);
      formData.set("telefono", telefono);
      await actualizarPersona(persona.id, campanaId, formData);
      setEditando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function ampliar() {
    setGuardando(true);
    setError(null);
    try {
      await ampliarCupo(persona.id, campanaId, 10);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ampliar el cupo");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    const aviso =
      stats.vendidas > 0
        ? `¿Eliminar a ${persona.nombre}? Tiene ${stats.vendidas} colaboración(es) registradas que quedarán sin persona asociada (no se borran).`
        : `¿Eliminar a ${persona.nombre}?`;
    if (!window.confirm(aviso)) return;
    setGuardando(true);
    setError(null);
    try {
      await eliminarPersona(persona.id, campanaId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
      setGuardando(false);
    }
  }

  if (editando) {
    return (
      <tr className="border-b border-[#E4D8C4] bg-[#F8F1E1] last:border-0">
        <td className="px-3 py-2" colSpan={sinPapeletas ? 4 : 7}>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded border border-[#E4D8C4] bg-white px-2 py-1 text-sm"
              placeholder="Nombre"
            />
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="rounded border border-[#E4D8C4] bg-white px-2 py-1 text-sm"
              placeholder="Teléfono"
            />
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="rounded bg-[#5B1220] px-3 py-1 text-xs font-semibold text-[#E9D6A8] disabled:opacity-60"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setEditando(false);
                setNombre(persona.nombre);
                setTelefono(persona.telefono);
                setError(null);
              }}
              className="rounded border border-[#E4D8C4] px-3 py-1 text-xs text-[#8A7B6C]"
            >
              Cancelar
            </button>
            {error && <span className="text-xs text-red-700">{error}</span>}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-[#E4D8C4] last:border-0">
      <td className="sticky left-0 z-10 bg-[#FFFBF3] px-3 py-2">{persona.nombre}</td>
      <td className="px-3 py-2">{persona.telefono}</td>
      {!sinPapeletas && (
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span>
              {persona.rango_inicio !== null
                ? `${String(persona.rango_inicio).padStart(4, "0")}–${String(persona.rango_fin).padStart(4, "0")}`
                : "—"}
            </span>
            {persona.rango_inicio !== null && (
              <button
                type="button"
                onClick={ampliar}
                disabled={guardando}
                className="whitespace-nowrap rounded border border-[#E4D8C4] px-1.5 py-0.5 text-[11px] text-[#5B1220] disabled:opacity-60"
                title="Ampliar cupo en 10 papeletas"
              >
                +10
              </button>
            )}
          </div>
          {error && <p className="mt-1 max-w-[180px] whitespace-normal text-[11px] text-red-700">{error}</p>}
        </td>
      )}
      {!sinPapeletas && <td className="px-3 py-2">{stats.vendidas}</td>}
      <td className="px-3 py-2">{euro.format(stats.confirmado)}</td>
      {!sinPapeletas && (
        <td className="px-3 py-2">
          {stats.pendiente > 0 ? (
            <span className="font-semibold text-[#93641F]">{euro.format(stats.pendiente)}</span>
          ) : (
            "—"
          )}
        </td>
      )}
      <td className="px-3 py-2">
        <CopyLink url={url} compact />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-3 whitespace-nowrap text-xs">
          <button type="button" onClick={() => setEditando(true)} className="text-[#5B1220] underline">
            Editar
          </button>
          <button type="button" onClick={eliminar} disabled={guardando} className="text-red-700 underline disabled:opacity-60">
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}
