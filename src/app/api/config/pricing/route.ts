import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "plan_pricing")
    .single<{ value: string }>();

  if (error || !data) {
    return NextResponse.json(
      { "3_months": 0, "6_months": 0, "12_months": 0 },
      { status: 200 }
    );
  }

  const pricing =
    typeof data.value === "string" ? JSON.parse(data.value) : data.value;

  return NextResponse.json(pricing);
}
