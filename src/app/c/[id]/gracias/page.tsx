import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import type { Venta } from "@/lib/types";

export default async function GraciasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { id } = await params;
  const { session_id: sessionId } = await searchParams;

  const { data: campana } = await supabase
    .from("campanas")
    .select("nombre, entidad_nombre, tipo")
    .eq("id", id)
    .single();

  let ventas: Venta[] = [];
  let errorMsg: string | null = null;

  if (!sessionId) {
    errorMsg = "Falta la referencia del pago.";
  } else {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const ventaIds = session.metadata?.venta_ids?.split(",").filter(Boolean) ?? [];
      if (ventaIds.length > 0) {
        const { data } = await supabase.rpc("obtener_ventas", { p_venta_ids: ventaIds });
        ventas = (data as Venta[]) ?? [];
      }
    } catch {
      errorMsg = "No se pudo verificar el pago.";
    }
  }

  const pagado = ventas.length > 0 && ventas.every((v) => v.estado !== "pendiente");
  const numeros = ventas.map((v) => v.numero_papeleta).filter((n): n is number => n !== null);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-[#F6EFE3] px-6 text-center">
      {errorMsg || ventas.length === 0 ? (
        <>
          <h1 className="font-serif text-2xl text-[#5B1220]">No hemos podido confirmarlo</h1>
          <p className="mt-2 text-sm text-[#8A7B6C]">
            {errorMsg ?? "No encontramos esta compra. Si el pago se ha realizado, contacta con la entidad."}
          </p>
        </>
      ) : (
        <>
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#B8862F]">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="font-serif text-2xl text-[#5B1220]">
            {pagado ? "¡Gracias por tu colaboración!" : "Pago recibido, confirmando…"}
          </h1>
          <p className="mt-2 text-sm text-[#8A7B6C]">{campana?.entidad_nombre}</p>

          <div className="mt-6 w-full rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3] p-4">
            <p className="text-xs text-[#8A7B6C]">{campana?.nombre}</p>
            {numeros.length > 0 ? (
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {numeros.map((n) => (
                  <span
                    key={n}
                    className="rounded-full bg-[#5B1220] px-3 py-1 font-serif text-sm text-[#E9D6A8]"
                  >
                    {String(n).padStart(4, "0")}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#2A211C]">
                Donativo de {ventas.reduce((s, v) => s + Number(v.importe), 0)} €
              </p>
            )}
          </div>
        </>
      )}

      <Link
        href={`/c/${id}`}
        className="mt-8 rounded-xl border border-[#5B1220] px-5 py-2.5 text-sm font-medium text-[#5B1220]"
      >
        Volver a la campaña
      </Link>
    </div>
  );
}
