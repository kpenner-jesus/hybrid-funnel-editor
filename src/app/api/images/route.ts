import { NextRequest, NextResponse } from "next/server";

// Pexels API — free, unlimited requests, high-quality stock photos
// Get your API key at: https://www.pexels.com/api/
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

interface PexelsResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const perPage = parseInt(req.nextUrl.searchParams.get("per_page") || "8");
  const orientation = req.nextUrl.searchParams.get("orientation") || "landscape";

  if (!query) {
    return NextResponse.json({ error: "Missing ?q= query parameter" }, { status: 400 });
  }

  if (!PEXELS_API_KEY) {
    return NextResponse.json(
      { error: "PEXELS_API_KEY not configured. Get a free key at pexels.com/api/" },
      { status: 500 }
    );
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}`;
    const res = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Pexels API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data: PexelsResponse = await res.json();

    // Return simplified results
    const results = data.photos.map((photo) => ({
      id: photo.id,
      url: photo.src.large, // 940px wide — good for hero images
      urlMedium: photo.src.medium, // 350px — good for thumbnails
      urlOriginal: photo.src.original,
      width: photo.width,
      height: photo.height,
      photographer: photo.photographer,
      alt: photo.alt || query,
      pexelsUrl: photo.url, // attribution link
    }));

    return NextResponse.json({
      query,
      total: data.total_results,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to search images: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 500 }
    );
  }
}
