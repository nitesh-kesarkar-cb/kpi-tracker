import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Edge-safe auth instance (no Prisma/bcrypt) for middleware gating.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/api/auth"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const path = nextUrl.pathname;

  // Never gate API routes — auth endpoints + route handlers enforce their own auth.
  // (Gating these would redirect JSON fetches like /api/auth/session to an HTML page.)
  if (path.startsWith("/api/")) return NextResponse.next();

  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  // Unauthenticated -> login
  if (!session) {
    if (isPublic) return NextResponse.next();
    const url = new URL("/login", nextUrl);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  const user = session.user as { accessRole?: string; mustChangePassword?: boolean };

  // Force password change on first login
  if (user?.mustChangePassword && path !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", nextUrl));
  }
  if (!user?.mustChangePassword && path === "/change-password") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Logged in but on /login -> dashboard
  if (path === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Role gating
  if (path.startsWith("/admin") && user?.accessRole !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }
  if (
    path.startsWith("/team") &&
    user?.accessRole !== "MANAGER" &&
    user?.accessRole !== "SUPER_ADMIN"
  ) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except static assets and Next internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"]
};
