import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";

const FUNNELS_KEY = "everybooking:funnels";
const VENUE_DATA_KEY = "everybooking:venue-data";

// GET /api/funnels — load all funnels + venue data from KV
export async function GET() {
  try {
    const [funnels, venueData] = await Promise.all([
      kv.get(FUNNELS_KEY),
      kv.get(VENUE_DATA_KEY),
    ]);
    return NextResponse.json({
      funnels: funnels || [],
      venueData: venueData || null,
    });
  } catch (error) {
    console.error("KV GET error:", error);
    // KV not configured — return empty (falls back to localStorage)
    return NextResponse.json({ funnels: [], venueData: null });
  }
}

// POST /api/funnels — save all funnels + venue data to KV
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { funnels, venueData } = body;

    const promises: Promise<unknown>[] = [];

    if (funnels !== undefined) {
      promises.push(kv.set(FUNNELS_KEY, funnels));
    }
    if (venueData !== undefined) {
      promises.push(kv.set(VENUE_DATA_KEY, venueData));
    }

    await Promise.all(promises);

    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("KV POST error:", error);
    return NextResponse.json(
      { error: "Failed to save. Is Vercel KV configured?" },
      { status: 500 }
    );
  }
}
