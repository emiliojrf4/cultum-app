"use client";

import { useState } from "react";
import type { Campana, MetodoPago } from "@/lib/types";

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const inputClass =
  "w-full rounded-lg border border-[#E4D8C4] bg-white px-3 py-2.5 text-sm text-[#2A211C]";
const labelClass = "mb-1 block text-xs text-[#8A7B6C]";

export function PurchaseFlow({ campana }: { campana: Campana }) {
  const esRifa = campana.tipo === "rifa_autorizada";
  const tienePapeletas = campana.total_papeletas !== null;
  const precioUnidad = campana.precio_papeleta ?? campana.importe_sugerido ?? 0;

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("bizum");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = precioUnidad * cantidad;

  async function comprar() {
    if (!nombre.trim() || !telefono.trim()) {
      setError("Escribe tu nombre y teléfono antes de continuar.");
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
          cantidad: tienePapeletas ? cantidad : 1,
          metodoPago,
          compradorNombre: nombre.trim(),
          compradorTelefono: telefono.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "No se pudo iniciar el pago");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el pago");
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#F6EFE3]">
      <header className="px-5 pt-6 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8A7B6C]">
          {campana.entidad_nombre}
        </p>
        <h1 className="mt-1 font-serif text-2xl text-[#5B1220]">{campana.nombre}</h1>
        <span
          className={`mt-2 inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
            esRifa ? "bg-[#5B1220] text-[#E9D6A8]" : "bg-[#E9D6A8] text-[#3E0C16]"
          }`}
        >
          {esRifa ? "Rifa autorizada" : "Donativo"}
        </span>
      </header>

      <div className="flex-1 px-5 pb-40">
        {campana.descripcion && (
          <p className="mb-4 text-sm leading-relaxed text-[#2A211C]">{campana.descripcion}</p>
        )}

        <div className="flex justify-between border-y border-[#E4D8C4] py-3 text-sm text-[#8A7B6C]">
          <span>{esRifa ? "Precio por papeleta" : tienePapeletas ? "Donativo por papeleta" : "Importe del donativo"}</span>
          <b className="text-[#2A211C]">{euro.format(precioUnidad)}</b>
        </div>

        {esRifa && (
          <p className="mt-3 text-xs leading-relaxed text-[#8A7B6C]">
            El sorteo lo celebra y comunica {campana.entidad_nombre}. Cultum no interviene en la
            elección del número premiado.
          </p>
        )}

        <div className="mt-5 space-y-3">
          <div>
            <label className={labelClass}>Tu nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClass}
              placeholder="Nombre y apellido"
            />
          </div>
          <div>
            <label className={labelClass}>Tu teléfono</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={inputClass}
              placeholder="600 000 000"
              type="tel"
            />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-[#E4D8C4] bg-[#F6EFE3] px-5 pb-6 pt-4">
        {tienePapeletas && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setCantidad((q) => Math.max(1, q - 1))}
                className="h-9 w-9 rounded-full border border-[#5B1220] text-lg text-[#5B1220]"
              >
                –
              </button>
              <span className="min-w-[1.5rem] text-center text-base font-semibold">{cantidad}</span>
              <button
                type="button"
                onClick={() => setCantidad((q) => Math.min(20, q + 1))}
                className="h-9 w-9 rounded-full border border-[#5B1220] text-lg text-[#5B1220]"
              >
                +
              </button>
            </div>
            <span className="text-xl font-semibold text-[#5B1220]">{euro.format(total)}</span>
          </div>
        )}

        <div className="mb-4 flex gap-2">
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
          onClick={comprar}
          disabled={enviando}
          className="w-full rounded-xl bg-[#5B1220] py-3.5 text-base font-semibold text-[#E9D6A8] disabled:opacity-60"
        >
          {enviando ? "Redirigiendo a pago…" : `${esRifa ? "Comprar" : "Donar"} ${euro.format(tienePapeletas ? total : precioUnidad)}`}
        </button>
      </div>
    </div>
  );
}
