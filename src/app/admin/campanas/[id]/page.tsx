import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Campana, MetodoPago, Persona, Venta } from "@/lib/types";
import { PersonaForm } from "./persona-form";
import { CopyLink } from "./copy-link";
import { PersonaRow } from "./persona-row";

const SITE_URL = "https://cultum-app.vercel.app";

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const fecha = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const METODO_LABEL: Record<MetodoPago, string> = { bizum: "Bizum", tarjeta: "Tarjeta", efectivo: "Efectivo" };
const ESTADO_BADGE: Record<Venta["estado"], { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-[#E9D6A8] text-[#3E0C16]" },
  pagado: { label: "Pagado", cls: "bg-[#4B6C4C] text-[#FFFBF3]" },
  liquidado: { label: "Liquidado", cls: "bg-[#4B6C4C] text-[#FFFBF3]" },
};

export const dynamic = "force-dynamic";

export default async function CampanaAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: campana }, { data: personas }, { data: ventasData }] = await Promise.all([
    supabaseAdmin.from("campanas").select("*").eq("id", id).single(),
    supabaseAdmin.from("personas").select("*").eq("campana_id", id).order("created_at"),
    supabaseAdmin.from("ventas").select("*").eq("campana_id", id).order("created_at", { ascending: false }),
  ]);

  if (!campana) notFound();

  const c = campana as Campana;
  const personasList = (personas as Persona[] | null) ?? [];
  const ventas = (ventasData as Venta[] | null) ?? [];
  const sinPapeletas = c.total_papeletas === null;

  const confirmadas = ventas.filter((v) => v.estado === "pagado" || v.estado === "liquidado");
  const recaudado = confirmadas.reduce((sum, v) => sum + Number(v.importe), 0);
  const porMetodo: Record<MetodoPago, number> = { bizum: 0, tarjeta: 0, efectivo: 0 };
  for (const v of confirmadas) porMetodo[v.metodo_pago] += Number(v.importe);

  const pendienteCobro = ventas
    .filter((v) => v.estado === "pendiente" && v.metodo_pago !== "efectivo")
    .reduce((sum, v) => sum + Number(v.importe), 0);
  const pendienteLiquidar = ventas
    .filter((v) => v.estado === "pendiente" && v.metodo_pago === "efectivo")
    .reduce((sum, v) => sum + Number(v.importe), 0);

  const asignadas = personasList.reduce(
    (sum, p) => sum + (p.rango_inicio !== null && p.rango_fin !== null ? p.rango_fin - p.rango_inicio + 1 : 0),
    0,
  );

  const porPersona = new Map<string, { vendidas: number; confirmado: number; pendiente: number }>();
  for (const v of ventas) {
    if (!v.persona_id) continue;
    const acc = porPersona.get(v.persona_id) ?? { vendidas: 0, confirmado: 0, pendiente: 0 };
    acc.vendidas += 1;
    if (v.estado === "pagado" || v.estado === "liquidado") acc.confirmado += Number(v.importe);
    if (v.estado === "pendiente" && v.metodo_pago === "efectivo") acc.pendiente += Number(v.importe);
    porPersona.set(v.persona_id, acc);
  }

  const historial = ventas.slice(0, 50);
  const nombrePersona = new Map(personasList.map((p) => [p.id, p.nombre]));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/admin" className="inline-block text-sm text-[#5B1220]">
          ← Volver a campañas
        </Link>
        <Link
          href={`/admin/campanas/${c.id}/editar`}
          className="rounded-lg border border-[#5B1220] px-3 py-1.5 text-xs font-semibold text-[#5B1220]"
        >
          Editar campaña
        </Link>
      </div>
      <p className="text-xs uppercase tracking-wide text-[#8A7B6C]">{c.entidad_nombre}</p>
      <h2 className="mb-1 font-serif text-lg text-[#5B1220]">{c.nombre}</h2>
      <p className="mb-4 text-sm text-[#8A7B6C]">
        {euro.format(recaudado)}
        {c.objetivo ? ` / ${euro.format(c.objetivo)}` : ""}
        {!sinPapeletas && ` · ${asignadas} / ${c.total_papeletas} papeletas asignadas`}
      </p>

      <div className="mb-4 rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3] p-4">
        <p className="mb-2 text-xs text-[#8A7B6C]">Enlace público de compra (compártelo directamente):</p>
        <CopyLink url={`${SITE_URL}/c/${c.id}`} />
      </div>

      <div className="mb-6 rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3] p-4">
        <p className="mb-2 text-xs text-[#8A7B6C]">
          Enlace de seguimiento para la entidad (sin contraseña — pásaselo a la entidad; puede ver la
          recaudación y confirmar el efectivo que le entreguen en mano):
        </p>
        <CopyLink url={`${SITE_URL}/e/${c.entidad_token}`} />
      </div>

      <h3 className="mb-3 font-serif text-base text-[#5B1220]">Recaudación</h3>
      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-[#E4D8C4] bg-[#FFFBF3] p-3">
          <div className="text-lg font-bold text-[#5B1220]">{euro.format(recaudado)}</div>
          <div className="mt-1 text-[11px] leading-tight text-[#8A7B6C]">Confirmado</div>
        </div>
        <div className="rounded-xl border border-[#E4D8C4] bg-[#FFFBF3] p-3">
          <div className="text-lg font-bold text-[#93641F]">{euro.format(pendienteCobro)}</div>
          <div className="mt-1 text-[11px] leading-tight text-[#8A7B6C]">Bizum/tarjeta sin cobrar</div>
        </div>
        <div className="rounded-xl border border-[#E4D8C4] bg-[#FFFBF3] p-3">
          <div className="text-lg font-bold text-[#93641F]">{euro.format(pendienteLiquidar)}</div>
          <div className="mt-1 text-[11px] leading-tight text-[#8A7B6C]">Efectivo sin liquidar</div>
        </div>
        <div className="rounded-xl border border-[#E4D8C4] bg-[#FFFBF3] p-3">
          <div className="text-[13px] leading-tight text-[#2A211C]">
            {(["bizum", "tarjeta", "efectivo"] as const).map((m) => (
              <div key={m} className="flex justify-between">
                <span className="text-[#8A7B6C]">{METODO_LABEL[m]}</span>
                <span className="font-semibold">{euro.format(porMetodo[m])}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h3 className="mb-3 font-serif text-base text-[#5B1220]">
        {sinPapeletas ? "Donantes autoregistrados" : "Colaboradores"}
      </h3>

      <p className="mb-1.5 text-[11px] text-[#8A7B6C] sm:hidden">Desliza la tabla para ver más →</p>
      <div className="mb-6 overflow-x-auto rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E4D8C4] text-left text-[11px] uppercase tracking-wide text-[#8A7B6C]">
              <th className="sticky left-0 z-10 bg-[#FFFBF3] px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Teléfono</th>
              {!sinPapeletas && <th className="px-3 py-2">Números</th>}
              {!sinPapeletas && <th className="px-3 py-2">Vendidas</th>}
              <th className="px-3 py-2">Confirmado</th>
              {!sinPapeletas && <th className="px-3 py-2">Efectivo pend.</th>}
              <th className="px-3 py-2">Enlace</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {personasList.map((p) => (
              <PersonaRow
                key={p.id}
                persona={p}
                campanaId={c.id}
                url={`${SITE_URL}/p/${p.enlace_token}`}
                sinPapeletas={sinPapeletas}
                stats={porPersona.get(p.id) ?? { vendidas: 0, confirmado: 0, pendiente: 0 }}
              />
            ))}
            {!personasList.length && (
              <tr>
                <td colSpan={sinPapeletas ? 5 : 8} className="px-3 py-3 text-[#8A7B6C]">
                  Todavía no hay {sinPapeletas ? "donantes" : "colaboradores"} dados de alta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PersonaForm campanaId={c.id} sinPapeletas={sinPapeletas} />

      <h3 className="mb-3 mt-8 font-serif text-base text-[#5B1220]">Historial de colaboraciones</h3>
      <p className="mb-1.5 text-[11px] text-[#8A7B6C] sm:hidden">Desliza la tabla para ver más →</p>
      <div className="mb-6 overflow-x-auto rounded-2xl border border-[#E4D8C4] bg-[#FFFBF3]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E4D8C4] text-left text-[11px] uppercase tracking-wide text-[#8A7B6C]">
              <th className="sticky left-0 z-10 bg-[#FFFBF3] px-3 py-2">Comprador</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Nº</th>
              <th className="px-3 py-2">Vía</th>
              <th className="px-3 py-2">Importe</th>
              <th className="px-3 py-2">Método</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((v) => {
              const badge = ESTADO_BADGE[v.estado];
              return (
                <tr key={v.id} className="border-b border-[#E4D8C4] last:border-0">
                  <td className="sticky left-0 z-10 bg-[#FFFBF3] px-3 py-2">{v.comprador_nombre ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-[#8A7B6C]">{fecha.format(new Date(v.created_at))}</td>
                  <td className="px-3 py-2">{v.numero_papeleta !== null ? String(v.numero_papeleta).padStart(4, "0") : "—"}</td>
                  <td className="px-3 py-2 text-xs text-[#8A7B6C]">
                    {v.persona_id ? nombrePersona.get(v.persona_id) ?? "—" : "Enlace público"}
                  </td>
                  <td className="px-3 py-2">{euro.format(Number(v.importe))}</td>
                  <td className="px-3 py-2">{METODO_LABEL[v.metodo_pago]}</td>
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
                <td colSpan={7} className="px-3 py-3 text-[#8A7B6C]">
                  Todavía no hay colaboraciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
