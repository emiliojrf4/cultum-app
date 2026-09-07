import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Campana } from "@/lib/types";
import { PurchaseFlow } from "./purchase-flow";

export default async function CampanaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data } = await supabase
    .from("campanas")
    .select("*")
    .eq("id", id)
    .eq("activa", true)
    .single();

  if (!data) notFound();

  return <PurchaseFlow campana={data as Campana} />;
}
