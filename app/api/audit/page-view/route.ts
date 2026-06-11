import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";

/** Records an authenticated page view. Called by the client-side beacon on navigation. */
export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as
    | { id?: string; email?: string; name?: string }
    | undefined;
  if (!user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let path = "";
  try {
    const body = await req.json();
    path = typeof body?.path === "string" ? body.path : "";
  } catch {
    // ignore malformed body
  }
  if (!path) return NextResponse.json({ ok: false }, { status: 400 });

  await logAudit({
    actor: { id: user.id, email: user.email, name: user.name },
    category: "NAVIGATION",
    action: "page.view",
    entityType: "Page",
    entityId: path,
    summary: `Viewed ${path}`
  });

  return NextResponse.json({ ok: true });
}
