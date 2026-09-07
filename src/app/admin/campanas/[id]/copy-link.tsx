"use client";

import { useState } from "react";

export function CopyLink({ url, compact = false }: { url: string; compact?: boolean }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // portapapeles no disponible; el texto sigue siendo seleccionable a mano
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <code className="text-xs text-[#8A7B6C]">{url}</code>
        <button
          type="button"
          onClick={copiar}
          className="whitespace-nowrap rounded border border-[#E4D8C4] px-2 py-0.5 text-[11px] text-[#5B1220]"
        >
          {copiado ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <code className="block flex-1 break-all rounded-lg border border-[#E4D8C4] bg-white px-3 py-2 text-xs">
        {url}
      </code>
      <button
        type="button"
        onClick={copiar}
        className="whitespace-nowrap rounded-lg border border-[#5B1220] px-3 py-2 text-xs font-semibold text-[#5B1220]"
      >
        {copiado ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
