"use client";

import { useState } from "react";
import type { Campana, MetodoPago, Persona } from "@/lib/types";

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function DonanteFlow({ persona, campana }: { persona: Persona; campana: Campana }) {
  const importe = campana.importe_sugerido ?? campana.precio_papeleta ?? 0;
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("bizum");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function donar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campanaId: campana.id,
          campanaNombre: campana.nombre,
          cantidad: 1,
          metodoPago,
          personaId: persona.id,
          compradorNombre: persona.nombre,
          compradorTelefono: persona.telefono,
          volverA: `/p/${persona.enlace_token}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "No se pudo iniciar el pago");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el pago");
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-[#F6EFE3] px-5 py-8">
      <p className="text-xs uppercase tracking-wide text-[#8A7B6C]">{campana.entidad_nombre}</p>
      <h1 className="mt-1 font-serif text-2xl text-[#5B1220]">Hola, {persona.nombre}</h1>
      <p className="mt-1 text-sm text-[#8A7B6C]">{campana.nombre}</p>
      {campana.descripcion && (
        <p className="mt-3 text-sm leading-relaxed text-[#2A211C]">{campana.descripcion}</p>
      )}

      <div className="mt-6 rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3] p-4">
        <div className="flex justify-between text-sm text-[#8A7B6C]">
          <span>Tu donativo</span>
          <b className="text-lg text-[#5B1220]">{euro.format(importe)}</b>
        </div>
      </div>

      <div className="my-4 flex gap-2">
        {(["bizum", "tarjeta"] as const).map((metodo) => (
          <button
            key={metodo}
            type="button"
            onClick={() => setMetodoPago(metodo)}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium capitalize ${
              metodoPago === metodo
                ? "border-[#5B1220] bg-[#E9D6A8] text-[#3E0C16]"
                : "border-[#E4D8C4] bg-[#FFFBF3] text-[#2A211C]"
            }`}
          >
            {metodo}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={donar}
        disabled={enviando}
        className="w-full rounded-xl bg-[#5B1220] py-3.5 text-base font-semibold text-[#E9D6A8] disabled:opacity-60"
      >
        {enviando ? "Redirigiendo a pago…" : `Donar ${euro.format(importe)}`}
      </button>
    </div>
  );
}
