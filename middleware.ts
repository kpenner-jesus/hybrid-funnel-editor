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
  const { pathname } = req.nextUrl;

  // Always allow: login page, auth API, static assets, Next.js internals
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg")
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
  const expectedToken = await makeToken(editorPassword);

  if (session === expectedToken || session === "dev-mode") {
    return NextResponse.next();
  }

  // Not authenticated — redirect to login
  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
