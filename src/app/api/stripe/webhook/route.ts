import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const ventaIds = session.metadata?.venta_ids?.split(",").filter(Boolean) ?? [];
    if (ventaIds.length > 0) {
      await supabase.rpc("confirmar_venta", {
        p_venta_ids: ventaIds,
        p_stripe_payment_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      });
    }
  }

  return NextResponse.json({ received: true });
}
