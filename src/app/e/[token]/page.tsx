import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Campana, MetodoPago, Persona, Venta } from "@/lib/types";
import { ConfirmarEfectivo } from "./confirmar-efectivo";

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const fecha = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const TIPO_LABEL: Record<Campana["tipo"], string> = {
  donativo_con_obsequio: "Donativo con obsequio",
  donativo_sin_obsequio: "Donativo sin obsequio",
  rifa_autorizada: "Rifa autorizada",
};
const METODO_LABEL: Record<MetodoPago, string> = { bizum: "Bizum", tarjeta: "Tarjeta", efectivo: "Efectivo" };
const ESTADO_BADGE: Record<Venta["estado"], { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-[#E9D6A8] text-[#3E0C16]" },
  pagado: { label: "Confirmado", cls: "bg-[#4B6C4C] text-[#FFFBF3]" },
  liquidado: { label: "Confirmado", cls: "bg-[#4B6C4C] text-[#FFFBF3]" },
};

export const dynamic = "force-dynamic";

export default async function EntidadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: campana } = await supabaseAdmin.from("campanas").select("*").eq("entidad_token", token).single();
  if (!campana) notFound();
  const c = campana as Campana;

  const [{ data: personas }, { data: ventasData }] = await Promise.all([
    supabaseAdmin.from("personas").select("*").eq("campana_id", c.id).order("created_at"),
    supabaseAdmin.from("ventas").select("*").eq("campana_id", c.id).order("created_at", { ascending: false }),
  ]);

  const personasList = (personas as Persona[] | null) ?? [];
  const ventas = (ventasData as Venta[] | null) ?? [];
  const sinPapeletas = c.total_papeletas === null;

  const confirmadas = ventas.filter((v) => v.estado === "pagado" || v.estado === "liquidado");
  const recaudado = confirmadas.reduce((sum, v) => sum + Number(v.importe), 0);
  const porMetodo: Record<MetodoPago, number> = { bizum: 0, tarjeta: 0, efectivo: 0 };
  for (const v of confirmadas) porMetodo[v.metodo_pago] += Number(v.importe);
  const pct = c.objetivo ? Math.min(100, Math.round((recaudado / c.objetivo) * 100)) : null;

  const asignadas = personasList.reduce(
    (sum, p) => sum + (p.rango_inicio !== null && p.rango_fin !== null ? p.rango_fin - p.rango_inicio + 1 : 0),
    0,
  );

  const nombrePersona = new Map(personasList.map((p) => [p.id, p.nombre]));
  const historial = ventas.slice(0, 100);

  const porPersona = new Map<string, { confirmado: number; vendidas: number; pendienteEfectivo: number }>();
  for (const v of ventas) {
    if (!v.persona_id) continue;
    const acc = porPersona.get(v.persona_id) ?? { confirmado: 0, vendidas: 0, pendienteEfectivo: 0 };
    acc.vendidas += 1;
    if (v.estado === "pagado" || v.estado === "liquidado") acc.confirmado += Number(v.importe);
    if (v.estado === "pendiente" && v.metodo_pago === "efectivo") acc.pendienteEfectivo += Number(v.importe);
    porPersona.set(v.persona_id, acc);
  }

  return (
    <div className="min-h-screen bg-[#EDE6D8]">
      <header className="bg-[#5B1220] px-6 py-5 text-[#E9D6A8]">
        <p className="font-serif text-lg">Cultum</p>
        <p className="text-xs opacity-80">Seguimiento de campaña</p>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <span
          className={`mb-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            c.tipo === "rifa_autorizada" ? "bg-[#5B1220] text-[#E9D6A8]" : "bg-[#E9D6A8] text-[#3E0C16]"
          }`}
        >
          {TIPO_LABEL[c.tipo]}
        </span>
        <h1 className="font-serif text-2xl text-[#5B1220]">{c.entidad_nombre}</h1>
        <p className="mt-1 text-sm text-[#8A7B6C]">{c.nombre}</p>

        <div className="mt-5 rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3] p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-3xl text-[#5B1220]">{euro.format(recaudado)}</span>
            {c.objetivo && <span className="text-sm text-[#8A7B6C]">de {euro.format(c.objetivo)}</span>}
          </div>
          {pct !== null && (
            <div className="mt-3 h-[6px] overflow-hidden rounded bg-[#E4D8C4]">
              <div className="h-full bg-[#B8862F]" style={{ width: `${pct}%` }} />
            </div>
          )}
          {!sinPapeletas && (
            <p className="mt-3 text-xs text-[#8A7B6C]">
              {asignadas} / {c.total_papeletas} papeletas asignadas · {personasList.length}{" "}
              {personasList.length === 1 ? "colaborador" : "colaboradores"}
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {(["bizum", "tarjeta", "efectivo"] as const).map((m) => (
            <div key={m} className="rounded-xl border border-[#E4D8C4] bg-[#FFFBF3] p-3 text-center">
              <div className="text-base font-bold text-[#5B1220]">{euro.format(porMetodo[m])}</div>
              <div className="mt-1 text-[11px] text-[#8A7B6C]">{METODO_LABEL[m]}</div>
            </div>
          ))}
        </div>

        {personasList.length > 0 && (
          <>
            <h2 className="mb-3 mt-8 font-serif text-base text-[#5B1220]">
              {sinPapeletas ? "Donantes registrados" : "Colaboradores"}
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E4D8C4] text-left text-[11px] uppercase tracking-wide text-[#8A7B6C]">
                    <th className="px-3 py-2">Nombre</th>
                    {!sinPapeletas && <th className="px-3 py-2">Números</th>}
                    <th className="px-3 py-2">Confirmado</th>
                    {!sinPapeletas && <th className="px-3 py-2">Efectivo pend.</th>}
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {personasList.map((p) => {
                    const stats = porPersona.get(p.id) ?? { confirmado: 0, vendidas: 0, pendienteEfectivo: 0 };
                    const haColaborado = stats.confirmado > 0;
                    return (
                      <tr key={p.id} className="border-b border-[#E4D8C4] last:border-0">
                        <td className="px-3 py-2">{p.nombre}</td>
                        {!sinPapeletas && (
                          <td className="px-3 py-2">
                            {p.rango_inicio !== null
                              ? `${String(p.rango_inicio).padStart(4, "0")}–${String(p.rango_fin).padStart(4, "0")}`
                              : "—"}
                          </td>
                        )}
                        <td className="px-3 py-2">{euro.format(stats.confirmado)}</td>
                        {!sinPapeletas && (
                          <td className="px-3 py-2">
                            {stats.pendienteEfectivo > 0 ? (
                              <div className="flex flex-col items-start gap-1">
                                <span className="font-semibold text-[#93641F]">{euro.format(stats.pendienteEfectivo)}</span>
                                <ConfirmarEfectivo personaId={p.id} nombre={p.nombre} />
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2">
                          <span
                            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              haColaborado ? "bg-[#4B6C4C] text-[#FFFBF3]" : "bg-[#E9D6A8] text-[#3E0C16]"
                            }`}
                          >
                            {haColaborado ? "Ha colaborado" : "Registrado, pendiente"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h2 className="mb-3 mt-8 font-serif text-base text-[#5B1220]">Colaboraciones</h2>
        <div className="mb-8 overflow-x-auto rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4D8C4] text-left text-[11px] uppercase tracking-wide text-[#8A7B6C]">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Nº</th>
                <th className="px-3 py-2">Vía</th>
                <th className="px-3 py-2">Importe</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((v) => {
                const badge = ESTADO_BADGE[v.estado];
                return (
                  <tr key={v.id} className="border-b border-[#E4D8C4] last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-[#8A7B6C]">{fecha.format(new Date(v.created_at))}</td>
                    <td className="px-3 py-2">{v.comprador_nombre ?? "—"}</td>
                    <td className="px-3 py-2">{v.numero_papeleta !== null ? String(v.numero_papeleta).padStart(4, "0") : "—"}</td>
                    <td className="px-3 py-2 text-xs text-[#8A7B6C]">
                      {v.persona_id ? nombrePersona.get(v.persona_id) ?? "—" : "Enlace público"}
                    </td>
                    <td className="px-3 py-2">{euro.format(Number(v.importe))}</td>
                    <td className="px-3 py-2">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!historial.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-[#8A7B6C]">
                    Todavía no hay colaboraciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="pb-8 text-center text-xs text-[#8A7B6C]">Actualizado al momento · cultum.app</p>
      </main>
    </div>
  );
}
