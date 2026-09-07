import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const personaId = body?.personaId as string | undefined;

  if (!personaId) {
    return NextResponse.json({ error: "Falta la persona" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("liquidar_ventas_persona", { p_persona_id: personaId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ventas: data });
}
