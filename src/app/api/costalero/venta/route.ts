import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import type { Venta } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const personaId = body?.personaId as string | undefined;
  const enlaceToken = body?.enlaceToken as string | undefined;
  const cantidad = body?.cantidad as number | undefined;
  const metodoPago = body?.metodoPago as string | undefined;
  const compradorNombre = body?.compradorNombre as string | undefined;
  const compradorTelefono = body?.compradorTelefono as string | undefined;

  if (!personaId || !enlaceToken || !cantidad || cantidad < 1 || cantidad > 50 || !compradorNombre || !compradorTelefono) {
    return NextResponse.json({ error: "Datos de la colaboración inválidos" }, { status: 400 });
  }
  if (metodoPago !== "bizum" && metodoPago !== "efectivo") {
    return NextResponse.json({ error: "Método de cobro inválido" }, { status: 400 });
  }

  const { data: ventas, error: rpcError } = await supabase.rpc("crear_venta_persona", {
    p_persona_id: personaId,
    p_cantidad: cantidad,
    p_comprador_nombre: compradorNombre,
    p_comprador_telefono: compradorTelefono,
    p_metodo_pago: metodoPago,
  });

  if (rpcError || !ventas || ventas.length === 0) {
    return NextResponse.json(
      { error: rpcError?.message ?? "No se pudo registrar la colaboración" },
      { status: 400 },
    );
  }

  const ventaRows = ventas as Venta[];

  if (metodoPago === "efectivo") {
    return NextResponse.json({ ventas: ventaRows });
  }

  const campanaId = ventaRows[0].campana_id;
  const { data: campana } = await supabase.from("campanas").select("nombre").eq("id", campanaId).single();
  const ventaIds = ventaRows.map((v) => v.id);
  const totalCents = ventaRows.reduce((sum, v) => sum + Math.round(Number(v.importe) * 100), 0);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["bizum"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${cantidad} ${cantidad === 1 ? "papeleta" : "papeletas"} — ${campana?.nombre ?? "Cultum"}`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      metadata: { venta_ids: ventaIds.join(",") },
      success_url: `${req.nextUrl.origin}/c/${campanaId}/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/p/${enlaceToken}`,
    });

    return NextResponse.json({ ventas: ventaRows, checkoutUrl: session.url });
  } catch (err) {
    await supabase.rpc("cancelar_venta", { p_venta_ids: ventaIds });
    const message = err instanceof Error ? err.message : "Error creando el pago";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
