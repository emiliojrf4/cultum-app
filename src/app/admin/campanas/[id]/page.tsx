import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Campana, Persona } from "@/lib/types";
import { PersonaForm } from "./persona-form";

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export const dynamic = "force-dynamic";

export default async function CampanaAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: campana }, { data: personas }, { data: ventas }] = await Promise.all([
    supabaseAdmin.from("campanas").select("*").eq("id", id).single(),
    supabaseAdmin.from("personas").select("*").eq("campana_id", id).order("created_at"),
    supabaseAdmin.from("ventas").select("importe, estado").eq("campana_id", id).in("estado", ["pagado", "liquidado"]),
  ]);

  if (!campana) notFound();

  const c = campana as Campana;
  const sinPapeletas = c.total_papeletas === null;
  const recaudado = (ventas ?? []).reduce((sum, v) => sum + Number(v.importe), 0);
  const asignadas = (personas as Persona[] | null)?.reduce(
    (sum, p) => sum + (p.rango_inicio !== null && p.rango_fin !== null ? p.rango_fin - p.rango_inicio + 1 : 0),
    0,
  ) ?? 0;

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[#8A7B6C]">{c.entidad_nombre}</p>
      <h2 className="mb-1 font-serif text-lg text-[#5B1220]">{c.nombre}</h2>
      <p className="mb-4 text-sm text-[#8A7B6C]">
        {euro.format(recaudado)}
        {c.objetivo ? ` / ${euro.format(c.objetivo)}` : ""}
        {!sinPapeletas && ` · ${asignadas} / ${c.total_papeletas} papeletas asignadas`}
      </p>

      <div className="mb-6 rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3] p-4">
        <p className="mb-2 text-xs text-[#8A7B6C]">Enlace público de compra (compártelo directamente):</p>
        <code className="block break-all rounded-lg border border-[#E4D8C4] bg-white px-3 py-2 text-xs">
          https://cultum-app.vercel.app/c/{c.id}
        </code>
      </div>

      <h3 className="mb-3 font-serif text-base text-[#5B1220]">
        {sinPapeletas ? "Donantes autoregistrados" : "Costaleros"}
      </h3>

      <div className="mb-6 overflow-x-auto rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E4D8C4] text-left text-[11px] uppercase tracking-wide text-[#8A7B6C]">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Teléfono</th>
              {!sinPapeletas && <th className="px-3 py-2">Números</th>}
              <th className="px-3 py-2">Enlace</th>
            </tr>
          </thead>
          <tbody>
            {(personas as Persona[] | null)?.map((p) => (
              <tr key={p.id} className="border-b border-[#E4D8C4] last:border-0">
                <td className="px-3 py-2">{p.nombre}</td>
                <td className="px-3 py-2">{p.telefono}</td>
                {!sinPapeletas && (
                  <td className="px-3 py-2">
                    {p.rango_inicio !== null
                      ? `${String(p.rango_inicio).padStart(4, "0")}–${String(p.rango_fin).padStart(4, "0")}`
                      : "—"}
                  </td>
                )}
                <td className="px-3 py-2">
                  <code className="text-xs text-[#8A7B6C]">/p/{p.enlace_token}</code>
                </td>
              </tr>
            ))}
            {!personas?.length && (
              <tr>
                <td colSpan={sinPapeletas ? 3 : 4} className="px-3 py-3 text-[#8A7B6C]">
                  Todavía no hay {sinPapeletas ? "donantes" : "costaleros"} dados de alta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PersonaForm campanaId={c.id} sinPapeletas={sinPapeletas} />
    </div>
  );
}
