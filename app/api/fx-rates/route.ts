import { NextResponse } from "next/server";
import { fetchLiveRates } from "@/lib/fx-rates";

export const revalidate = 3600; // 1 heure côté Next.js

export async function GET() {
  const rates = await fetchLiveRates();
  return NextResponse.json({ rates, base: "EUR" });
}
