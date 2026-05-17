import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      next: { revalidate: 900 }, // cache 15 min
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
