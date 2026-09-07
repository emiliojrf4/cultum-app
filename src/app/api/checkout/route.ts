import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import type { Venta } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const campanaId = body?.campanaId as string | undefined;
  const campanaNombre = body?.campanaNombre as string | undefined;
  const cantidad = body?.cantidad as number | undefined;
  const metodoPago = body?.metodoPago as string | undefined;

  if (!campanaId || !campanaNombre || !cantidad || cantidad < 1 || cantidad > 50) {
    return NextResponse.json({ error: "Datos de compra inválidos" }, { status: 400 });
  }
  if (metodoPago !== "bizum" && metodoPago !== "tarjeta") {
    return NextResponse.json({ error: "Método de pago inválido" }, { status: 400 });
  }

  const { data: ventas, error: rpcError } = await supabase.rpc("crear_venta", {
    p_campana_id: campanaId,
    p_persona_id: null,
    p_cantidad: cantidad,
    p_comprador_nombre: null,
    p_comprador_telefono: null,
    p_metodo_pago: metodoPago,
  });

  if (rpcError || !ventas || ventas.length === 0) {
    return NextResponse.json(
      { error: rpcError?.message ?? "No se pudo reservar la compra" },
      { status: 400 },
    );
  }

  const ventaRows = ventas as Venta[];
  const ventaIds = ventaRows.map((v) => v.id);
  const totalCents = ventaRows.reduce((sum, v) => sum + Math.round(Number(v.importe) * 100), 0);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: [metodoPago === "bizum" ? "bizum" : "card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${cantidad} ${cantidad === 1 ? "papeleta" : "papeletas"} — ${campanaNombre}`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      metadata: { venta_ids: ventaIds.join(",") },
      success_url: `${req.nextUrl.origin}/c/${campanaId}/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/c/${campanaId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    await supabase.rpc("cancelar_venta", { p_venta_ids: ventaIds });
    const message = err instanceof Error ? err.message : "Error creando el pago";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
