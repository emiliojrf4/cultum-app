import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Campana } from "@/lib/types";
import { EditarCampanaForm } from "./form";
import { DangerZone } from "./danger-zone";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<Campana["tipo"], string> = {
  donativo_con_obsequio: "Donativo con obsequio",
  donativo_sin_obsequio: "Donativo sin obsequio",
  rifa_autorizada: "Rifa autorizada",
};

export default async function EditarCampanaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: campana } = await supabaseAdmin.from("campanas").select("*").eq("id", id).single();
  if (!campana) notFound();
  const c = campana as Campana;

  return (
    <div>
      <Link href={`/admin/campanas/${c.id}`} className="mb-4 inline-block text-sm text-[#5B1220]">
        ← Volver a la campaña
      </Link>
      <p className="text-xs uppercase tracking-wide text-[#8A7B6C]">{TIPO_LABEL[c.tipo]} (no se puede cambiar)</p>
      <h2 className="mb-6 font-serif text-lg text-[#5B1220]">Editar campaña</h2>

      <EditarCampanaForm campana={c} />

      <DangerZone campana={c} />
    </div>
  );
}
