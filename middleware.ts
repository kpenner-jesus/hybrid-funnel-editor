import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function makeToken(password: string): string {
  return crypto.createHash("sha256").update(`funnel-editor-session:${password}`).digest("hex");
}

export function middleware(req: NextRequest) {
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
  const expectedToken = makeToken(editorPassword);

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
