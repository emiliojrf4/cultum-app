"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import type { Campana, MetodoPago, Persona, Venta } from "@/lib/types";

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

type Screen = "home" | "vender" | "esperando" | "confirm" | "liquidar";

interface Grupo {
  key: string;
  nombre: string;
  metodo: MetodoPago;
  estado: Venta["estado"];
  numeros: number[];
  importe: number;
}

function agrupar(ventas: Venta[]): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const v of ventas) {
    const key = `${v.created_at}|${v.comprador_nombre}|${v.comprador_telefono}`;
    const existente = mapa.get(key);
    if (existente) {
      existente.numeros.push(v.numero_papeleta ?? 0);
      existente.importe += Number(v.importe);
    } else {
      mapa.set(key, {
        key,
        nombre: v.comprador_nombre ?? "Sin nombre",
        metodo: v.metodo_pago,
        estado: v.estado,
        numeros: v.numero_papeleta !== null ? [v.numero_papeleta] : [],
        importe: Number(v.importe),
      });
    }
  }
  return Array.from(mapa.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
}

const inputClass = "w-full rounded-lg border border-[#E4D8C4] bg-white px-3 py-2.5 text-sm text-[#2A211C]";
const labelClass = "mb-1 block text-xs text-[#8A7B6C]";

export function CostaleroPanel({
  persona,
  campana,
  ventasIniciales,
}: {
  persona: Persona;
  campana: Campana;
  ventasIniciales: Venta[];
}) {
  const [screen, setScreen] = useState<Screen>("home");
  const [ventas, setVentas] = useState<Venta[]>(ventasIniciales);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // formulario de venta
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("bizum");

  // pago bizum en espera
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [ventaIdsEsperando, setVentaIdsEsperando] = useState<string[]>([]);

  // último resultado, para la pantalla de confirmación
  const [ultimoResultado, setUltimoResultado] = useState<{ numeros: number[]; metodo: MetodoPago } | null>(null);

  const cupo = persona.rango_inicio !== null && persona.rango_fin !== null
    ? persona.rango_fin - persona.rango_inicio + 1
    : 0;
  const colocadas = ventas.length;
  const disponibles = Math.max(0, cupo - colocadas);
  const pendienteEfectivo = ventas.filter((v) => v.metodo_pago === "efectivo" && v.estado === "pendiente");
  const totalPendienteEfectivo = pendienteEfectivo.reduce((sum, v) => sum + Number(v.importe), 0);
  const grupos = useMemo(() => agrupar(ventas), [ventas]);

  async function refrescarVentas() {
    const { data } = await supabase.rpc("ventas_de_persona", { p_persona_id: persona.id });
    if (data) setVentas(data as Venta[]);
    return (data as Venta[] | null) ?? [];
  }

  function abrirVender() {
    setNombre("");
    setTelefono("");
    setCantidad(1);
    setMetodoPago("bizum");
    setError(null);
    setScreen("vender");
  }

  async function registrarVenta() {
    if (!nombre.trim() || !telefono.trim()) {
      setError("Nombre y teléfono son obligatorios.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/costalero/venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: persona.id,
          enlaceToken: persona.enlace_token,
          cantidad,
          metodoPago,
          compradorNombre: nombre.trim(),
          compradorTelefono: telefono.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo registrar la colaboración");

      const nuevasVentas = data.ventas as Venta[];
      const numeros = nuevasVentas.map((v) => v.numero_papeleta!).filter(Boolean);

      if (metodoPago === "efectivo") {
        await refrescarVentas();
        setUltimoResultado({ numeros, metodo: "efectivo" });
        setScreen("confirm");
      } else {
        setVentaIdsEsperando(nuevasVentas.map((v) => v.id));
        setCheckoutUrl(data.checkoutUrl);
        setUltimoResultado({ numeros, metodo: "bizum" });
        setScreen("esperando");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la colaboración");
    } finally {
      setEnviando(false);
    }
  }

  useEffect(() => {
    if (screen !== "esperando" || !checkoutUrl) return;
    QRCode.toDataURL(checkoutUrl, { margin: 1, width: 220 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [screen, checkoutUrl]);

  useEffect(() => {
    if (screen !== "esperando" || ventaIdsEsperando.length === 0) return;
    const interval = setInterval(async () => {
      const actuales = await refrescarVentas();
      const listas = actuales.filter((v) => ventaIdsEsperando.includes(v.id));
      if (listas.length > 0 && listas.every((v) => v.estado === "pagado")) {
        clearInterval(interval);
        setScreen("confirm");
      }
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, ventaIdsEsperando]);

  async function confirmarLiquidacion() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/costalero/liquidar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: persona.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo liquidar");
      await refrescarVentas();
      setScreen("home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo liquidar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#F6EFE3] px-5 py-6">
      {screen === "home" && (
        <>
          <p className="text-xs uppercase tracking-wide text-[#8A7B6C]">{campana.entidad_nombre}</p>
          <h1 className="mt-1 font-serif text-2xl text-[#5B1220]">Hola, {persona.nombre}</h1>
          <p className="mt-1 text-sm text-[#8A7B6C]">{campana.nombre} · Mi cupo</p>
          <p className="mt-3 text-xs text-[#8A7B6C]">
            Números asignados:{" "}
            <b className="text-[#2A211C]">
              {String(persona.rango_inicio).padStart(4, "0")}–{String(persona.rango_fin).padStart(4, "0")}
            </b>
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-[#E4D8C4] bg-[#FFFBF3] p-3 text-center">
              <div className="text-lg font-bold text-[#5B1220]">{cupo}</div>
              <div className="mt-1 text-[10.5px] leading-tight text-[#8A7B6C]">Cupo asignado</div>
            </div>
            <div className="rounded-xl border border-[#E4D8C4] bg-[#FFFBF3] p-3 text-center">
              <div className="text-lg font-bold text-[#5B1220]">{colocadas}</div>
              <div className="mt-1 text-[10.5px] leading-tight text-[#8A7B6C]">Colocadas</div>
            </div>
            <div className="rounded-xl border border-[#E4D8C4] bg-[#FFFBF3] p-3 text-center">
              <div className="text-lg font-bold text-[#5B1220]">{disponibles}</div>
              <div className="mt-1 text-[10.5px] leading-tight text-[#8A7B6C]">Disponibles</div>
            </div>
          </div>

          <div className="mt-4 h-[5px] overflow-hidden rounded bg-[#E4D8C4]">
            <div
              className="h-full bg-[#B8862F]"
              style={{ width: `${cupo ? Math.min(100, (colocadas / cupo) * 100) : 0}%` }}
            />
          </div>

          {totalPendienteEfectivo > 0 && (
            <p className="mt-3 text-xs text-[#8A7B6C]">
              Efectivo por liquidar: <b className="text-[#2A211C]">{euro.format(totalPendienteEfectivo)}</b>
            </p>
          )}

          <p className="mb-2 mt-6 text-xs uppercase tracking-wide text-[#8A7B6C]">Colaboraciones recientes</p>
          <div className="flex-1 divide-y divide-[#E4D8C4] rounded-xl border border-[#E4D8C4] bg-[#FFFBF3]">
            {grupos.length === 0 && (
              <p className="px-4 py-4 text-sm text-[#8A7B6C]">Todavía no has registrado ninguna.</p>
            )}
            {grupos.map((g) => {
              const metodoLabel = g.metodo === "bizum" ? "Bizum" : "Efectivo";
              const badge =
                g.estado === "pendiente" && g.metodo === "efectivo"
                  ? { label: "Pendiente", cls: "bg-[#E9D6A8] text-[#3E0C16]" }
                  : g.estado === "pendiente"
                    ? { label: "Esperando pago", cls: "bg-[#E9D6A8] text-[#3E0C16]" }
                    : g.estado === "liquidado"
                      ? { label: "Liquidada", cls: "bg-[#4B6C4C] text-[#FFFBF3]" }
                      : { label: "Cobrada", cls: "bg-[#4B6C4C] text-[#FFFBF3]" };
              return (
                <div key={g.key} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#2A211C]">{g.nombre}</h4>
                    <p className="mt-0.5 text-xs text-[#8A7B6C]">
                      {g.numeros.length} {g.numeros.length === 1 ? "papeleta" : "papeletas"} · {metodoLabel} · nº{" "}
                      {g.numeros.map((n) => String(n).padStart(4, "0")).join(", ")}
                    </p>
                  </div>
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 space-y-2.5">
            {disponibles > 0 ? (
              <button
                type="button"
                onClick={abrirVender}
                className="w-full rounded-xl bg-[#5B1220] py-3.5 text-base font-semibold text-[#E9D6A8]"
              >
                Registrar colaboración
              </button>
            ) : (
              <p className="rounded-xl border border-[#E4D8C4] bg-[#FFFBF3] px-4 py-3 text-center text-sm text-[#8A7B6C]">
                Has colocado todo tu cupo. Habla con la entidad si necesitas más papeletas.
              </p>
            )}
            {pendienteEfectivo.length > 0 && (
              <button
                type="button"
                onClick={() => setScreen("liquidar")}
                className="w-full rounded-xl border border-[#5B1220] py-3 text-sm font-semibold text-[#5B1220]"
              >
                Liquidar efectivo con la entidad
              </button>
            )}
          </div>
        </>
      )}

      {screen === "vender" && (
        <>
          <button type="button" onClick={() => setScreen("home")} className="mb-4 self-start text-sm text-[#5B1220]">
            ← Mi cupo
          </button>
          <h1 className="font-serif text-xl text-[#5B1220]">Nueva colaboración</h1>

          <div className="mt-5 space-y-4">
            <div>
              <label className={labelClass}>Nombre de quien colabora</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} placeholder="Nombre y apellido" />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputClass} placeholder="600 000 000" />
            </div>

            <div>
              <p className={labelClass}>Cantidad de papeletas</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setCantidad((q) => Math.max(1, q - 1))}
                  className="h-9 w-9 rounded-full border border-[#5B1220] text-lg text-[#5B1220]"
                >
                  –
                </button>
                <span className="min-w-[1.5rem] text-center text-base font-semibold">{cantidad}</span>
                <button
                  type="button"
                  onClick={() => setCantidad((q) => Math.min(disponibles, q + 1))}
                  className="h-9 w-9 rounded-full border border-[#5B1220] text-lg text-[#5B1220]"
                >
                  +
                </button>
                <span className="ml-auto text-sm text-[#8A7B6C]">
                  {euro.format(cantidad * (campana.precio_papeleta ?? 0))}
                </span>
              </div>
            </div>

            <div>
              <p className={labelClass}>Método de cobro</p>
              <div className="space-y-2">
                {(
                  [
                    ["bizum", "Bizum al momento"],
                    ["efectivo", "Efectivo"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMetodoPago(value)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm ${
                      metodoPago === value ? "border-[#5B1220] bg-[#E9D6A8]" : "border-[#E4D8C4] bg-[#FFFBF3]"
                    }`}
                  >
                    <span
                      className={`h-4 w-4 rounded-full border-2 ${
                        metodoPago === value ? "border-[#5B1220] bg-[#5B1220]" : "border-[#8A7B6C]"
                      }`}
                    />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="button"
              onClick={registrarVenta}
              disabled={enviando}
              className="w-full rounded-xl bg-[#5B1220] py-3.5 text-base font-semibold text-[#E9D6A8] disabled:opacity-60"
            >
              {enviando ? "Registrando…" : "Registrar"}
            </button>
          </div>
        </>
      )}

      {screen === "esperando" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h2 className="font-serif text-xl text-[#5B1220]">Cobro por Bizum</h2>
          <p className="mt-2 max-w-xs text-sm text-[#8A7B6C]">
            Que {nombre} escanee este código con su móvil para pagar {euro.format(cantidad * (campana.precio_papeleta ?? 0))}.
          </p>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="Código QR de pago" className="mt-5 h-56 w-56 rounded-xl border border-[#E4D8C4] bg-white p-2" />
          )}
          {checkoutUrl && (
            <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="mt-4 text-xs text-[#5B1220] underline">
              O abre el enlace de pago directamente
            </a>
          )}
          <p className="mt-6 text-xs text-[#8A7B6C]">Esperando confirmación del pago…</p>
          <button type="button" onClick={() => setScreen("home")} className="mt-6 text-sm font-semibold text-[#5B1220]">
            Volver a mi cupo
          </button>
        </div>
      )}

      {screen === "confirm" && ultimoResultado && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#B8862F]">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="font-serif text-xl text-[#5B1220]">Colaboración registrada</h2>
          <p className="mt-2 max-w-xs text-sm text-[#8A7B6C]">
            {ultimoResultado.metodo === "bizum"
              ? "Pago confirmado."
              : "Recuerda liquidar ese dinero con la entidad cuando puedas."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {ultimoResultado.numeros.map((n) => (
              <span key={n} className="rounded-full bg-[#5B1220] px-3 py-1 font-serif text-sm text-[#E9D6A8]">
                {String(n).padStart(4, "0")}
              </span>
            ))}
          </div>
          <div className="mt-8 w-full max-w-xs space-y-2.5">
            <button type="button" onClick={abrirVender} className="w-full rounded-xl bg-[#5B1220] py-3 text-sm font-semibold text-[#E9D6A8]">
              Registrar otra
            </button>
            <button type="button" onClick={() => setScreen("home")} className="w-full rounded-xl border border-[#5B1220] py-3 text-sm font-semibold text-[#5B1220]">
              Volver a mi cupo
            </button>
          </div>
        </div>
      )}

      {screen === "liquidar" && (
        <>
          <button type="button" onClick={() => setScreen("home")} className="mb-4 self-start text-sm text-[#5B1220]">
            ← Mi cupo
          </button>
          <h1 className="font-serif text-xl text-[#5B1220]">Liquidar efectivo</h1>
          <p className="mt-2 text-sm text-[#8A7B6C]">
            Estas colaboraciones en efectivo están pendientes de ingresar. Haz un único Bizum a la entidad por
            el total y confirma aquí.
          </p>

          <div className="mt-4 divide-y divide-[#E4D8C4] rounded-xl border border-[#E4D8C4] bg-[#FFFBF3]">
            {agrupar(pendienteEfectivo).map((g) => (
              <div key={g.key} className="flex items-center justify-between px-4 py-3">
                <div>
                  <h4 className="text-sm font-semibold text-[#2A211C]">{g.nombre}</h4>
                  <p className="mt-0.5 text-xs text-[#8A7B6C]">
                    {g.numeros.length} {g.numeros.length === 1 ? "papeleta" : "papeletas"}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[#2A211C]">{euro.format(g.importe)}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#E4D8C4] px-1 py-3">
            <span className="text-sm text-[#2A211C]">Total a ingresar</span>
            <span className="text-xl font-semibold text-[#5B1220]">{euro.format(totalPendienteEfectivo)}</span>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="button"
            onClick={confirmarLiquidacion}
            disabled={enviando}
            className="mt-4 w-full rounded-xl bg-[#5B1220] py-3.5 text-base font-semibold text-[#E9D6A8] disabled:opacity-60"
          >
            {enviando ? "Confirmando…" : "Ya he enviado el Bizum"}
          </button>
        </>
      )}
    </div>
  );
}
