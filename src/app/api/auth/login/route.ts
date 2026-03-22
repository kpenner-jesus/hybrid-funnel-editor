import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

// Generate a stable session token from the password so it survives restarts
function makeToken(password: string): string {
  return crypto.createHash("sha256").update(`funnel-editor-session:${password}`).digest("hex");
}

export async function POST(req: NextRequest) {
  const editorPassword = process.env.EDITOR_PASSWORD;

  if (!editorPassword) {
    // No password set — allow access (dev mode)
    const cookieStore = await cookies();
    cookieStore.set("editor-session", "dev-mode", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await req.json();
    const { password } = body;

    if (password === editorPassword) {
      const token = makeToken(editorPassword);
      const cookieStore = await cookies();
      cookieStore.set("editor-session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
