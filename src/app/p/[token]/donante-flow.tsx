"use client";

import { useState } from "react";
import type { Campana, MetodoPago, Persona } from "@/lib/types";

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function DonanteFlow({ persona, campana }: { persona: Persona; campana: Campana }) {
  const importe = campana.importe_sugerido ?? campana.precio_papeleta ?? 0;
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("bizum");
  const [infoAdicional, setInfoAdicional] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function donar() {
    if (campana.campo_extra_label && !infoAdicional.trim()) {
      setError(`Escribe ${campana.campo_extra_label.toLowerCase()} antes de continuar.`);
      return;
    }
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
          infoAdicional: campana.campo_extra_label ? infoAdicional.trim() : undefined,
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

      {campana.obsequio_nombre && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#E4D8C4] bg-[#FFFBF3] p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E9D6A8] text-lg">
            🎁
          </div>
          <div>
            <p className="text-[11px] text-[#8A7B6C]">Obsequio por tu colaboración</p>
            <p className="text-sm font-semibold text-[#2A211C]">{campana.obsequio_nombre}</p>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3] p-4">
        <div className="flex justify-between text-sm text-[#8A7B6C]">
          <span>Tu donativo</span>
          <b className="text-lg text-[#5B1220]">{euro.format(importe)}</b>
        </div>
      </div>

      {campana.campo_extra_label && (
        <div className="mt-4">
          <label className="mb-1 block text-xs text-[#8A7B6C]">{campana.campo_extra_label}</label>
          <input
            value={infoAdicional}
            onChange={(e) => setInfoAdicional(e.target.value)}
            className="w-full rounded-lg border border-[#E4D8C4] bg-white px-3 py-2.5 text-sm text-[#2A211C]"
          />
        </div>
      )}

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
