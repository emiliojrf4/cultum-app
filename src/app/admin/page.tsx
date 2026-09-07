import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Campana } from "@/lib/types";

export const dynamic = "force-dynamic";

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const TIPO_LABEL: Record<Campana["tipo"], string> = {
  donativo_con_obsequio: "Donativo con obsequio",
  donativo_sin_obsequio: "Donativo sin obsequio",
  rifa_autorizada: "Rifa autorizada",
};

export default async function AdminPage() {
  const [{ data: campanas }, { data: ventas }] = await Promise.all([
    supabaseAdmin.from("campanas").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("ventas").select("campana_id, importe, estado").in("estado", ["pagado", "liquidado"]),
  ]);

  const recaudadoPorCampana = new Map<string, number>();
  for (const v of ventas ?? []) {
    recaudadoPorCampana.set(v.campana_id, (recaudadoPorCampana.get(v.campana_id) ?? 0) + Number(v.importe));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-lg text-[#5B1220]">Campañas</h2>
        <Link
          href="/admin/nueva"
          className="rounded-lg bg-[#5B1220] px-4 py-2 text-sm font-semibold text-[#E9D6A8]"
        >
          + Nueva campaña
        </Link>
      </div>

      <p className="mb-6 -mt-2 text-sm text-[#8A7B6C]">
        Esta vista la usáis vosotros para dar de alta cada campaña y generar los enlaces de costalero
        o donante — la entidad y sus colaboradores nunca entran aquí ni se registran en ningún sitio.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {(campanas as Campana[] | null)?.map((c) => {
          const recaudado = recaudadoPorCampana.get(c.id) ?? 0;
          const pct = c.objetivo ? Math.min(100, Math.round((recaudado / c.objetivo) * 100)) : null;
          return (
            <Link
              key={c.id}
              href={`/admin/campanas/${c.id}`}
              className="block rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3] p-4"
            >
              <span
                className={`mb-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  c.tipo === "rifa_autorizada" ? "bg-[#5B1220] text-[#E9D6A8]" : "bg-[#E9D6A8] text-[#3E0C16]"
                }`}
              >
                {TIPO_LABEL[c.tipo]}
              </span>
              <h3 className="text-[15px] font-semibold">{c.entidad_nombre}</h3>
              <p className="mb-2 text-[12.5px] text-[#8A7B6C]">{c.nombre}</p>
              {pct !== null && (
                <div className="mb-2 h-[5px] overflow-hidden rounded bg-[#E4D8C4]">
                  <div className="h-full bg-[#B8862F]" style={{ width: `${pct}%` }} />
                </div>
              )}
              <div className="flex justify-between text-xs text-[#8A7B6C]">
                <span>
                  {euro.format(recaudado)}
                  {c.objetivo ? ` / ${euro.format(c.objetivo)}` : ""}
                </span>
                <span>{c.activa ? "Activa" : "Cerrada"}</span>
              </div>
            </Link>
          );
        })}
        {!campanas?.length && (
          <p className="text-sm text-[#8A7B6C]">Todavía no hay campañas. Crea la primera.</p>
        )}
      </div>
    </div>
  );
}
