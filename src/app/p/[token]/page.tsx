import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Campana, Persona, Venta } from "@/lib/types";
import { DonanteFlow } from "./donante-flow";

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export default async function PersonaLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: personas } = await supabase.rpc("obtener_persona_por_token", { p_token: token });
  const persona = (personas as Persona[] | null)?.[0];
  if (!persona) notFound();

  const { data: campana } = await supabase
    .from("campanas")
    .select("*")
    .eq("id", persona.campana_id)
    .single();
  if (!campana) notFound();

  const c = campana as Campana;

  if (persona.rol === "donante") {
    return <DonanteFlow persona={persona} campana={c} />;
  }

  const { data: ventas } = await supabase.rpc("ventas_de_persona", { p_persona_id: persona.id });
  const ventasPersona = (ventas as Venta[] | null) ?? [];
  const vendidas = ventasPersona.filter((v) => v.estado !== "pendiente" || v.metodo_pago === "efectivo").length;
  const recaudado = ventasPersona
    .filter((v) => v.estado === "pagado" || v.estado === "liquidado")
    .reduce((sum, v) => sum + Number(v.importe), 0);
  const cupo = persona.rango_inicio !== null && persona.rango_fin !== null
    ? persona.rango_fin - persona.rango_inicio + 1
    : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#F6EFE3] px-5 py-8">
      <p className="text-xs uppercase tracking-wide text-[#8A7B6C]">{c.entidad_nombre}</p>
      <h1 className="mt-1 font-serif text-2xl text-[#5B1220]">Hola, {persona.nombre}</h1>
      <p className="mt-1 text-sm text-[#8A7B6C]">{c.nombre}</p>

      <div className="mt-5 rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3] p-4">
        <div className="flex justify-between text-sm">
          <span className="text-[#8A7B6C]">Tu cupo</span>
          <b>
            {persona.rango_inicio !== null
              ? `${String(persona.rango_inicio).padStart(4, "0")}–${String(persona.rango_fin).padStart(4, "0")}`
              : "—"}{" "}
            ({cupo} papeletas)
          </b>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-[#8A7B6C]">Vendidas</span>
          <b>{vendidas} / {cupo}</b>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-[#8A7B6C]">Recaudado (confirmado)</span>
          <b>{euro.format(recaudado)}</b>
        </div>
      </div>

      <p className="mt-6 text-sm text-[#8A7B6C]">
        El registro de ventas en efectivo y la liquidación por Bizum llegan en la próxima
        actualización. Mientras tanto, comparte el enlace público de la campaña con quien quiera
        colaborar:
      </p>
      <code className="mt-2 block break-all rounded-lg border border-[#E4D8C4] bg-white px-3 py-2 text-xs text-[#8A7B6C]">
        https://cultum-app.vercel.app/c/{c.id}
      </code>
    </div>
  );
}
