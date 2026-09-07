import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Campana, Persona, Venta } from "@/lib/types";
import { DonanteFlow } from "./donante-flow";
import { CostaleroPanel } from "./costalero-panel";

export const dynamic = "force-dynamic";

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

  return <CostaleroPanel persona={persona} campana={c} ventasIniciales={(ventas as Venta[] | null) ?? []} />;
}
