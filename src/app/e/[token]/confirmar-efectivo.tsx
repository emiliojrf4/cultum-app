"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConfirmarEfectivo({ personaId, nombre }: { personaId: string; nombre: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (!window.confirm(`¿Confirmas que ${nombre} os ha entregado en mano ese efectivo?`)) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/costalero/liquidar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo confirmar");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar");
      setEnviando(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={confirmar}
        disabled={enviando}
        className="whitespace-nowrap rounded border border-[#5B1220] px-2 py-1 text-[11px] font-semibold text-[#5B1220] disabled:opacity-60"
      >
        {enviando ? "Confirmando…" : "Confirmar efectivo recibido"}
      </button>
      {error && <p className="mt-1 text-[11px] text-red-700">{error}</p>}
    </div>
  );
}
