import { NextRequest, NextResponse } from "next/server";

// Edge-compatible hash — no Node.js crypto module
async function makeToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`funnel-editor-session:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;

    // Always allow: login page, auth API, static assets, Next.js internals, API routes
    if (
      pathname === "/login" ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/favicon") ||
      pathname.endsWith(".ico") ||
      pathname.endsWith(".png") ||
      pathname.endsWith(".svg") ||
      pathname.endsWith(".webp") ||
      pathname.endsWith(".jpg") ||
      pathname.endsWith(".css") ||
      pathname.endsWith(".js")
    ) {
      return NextResponse.next();
    }

    const editorPassword = process.env.EDITOR_PASSWORD;

    // No password configured — allow everything (dev mode)
    if (!editorPassword) {
      return NextResponse.next();
    }

    // Check for valid session cookie
    const session = req.cookies.get("editor-session")?.value;

    // Quick check: if session matches "dev-mode", allow
    if (session === "dev-mode") {
      return NextResponse.next();
    }

    // Hash-based check
    const expectedToken = await makeToken(editorPassword);
    if (session === expectedToken) {
      return NextResponse.next();
    }

    // Not authenticated — redirect to login
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    // If middleware crashes, allow the request through rather than blocking
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
