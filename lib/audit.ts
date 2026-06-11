import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

export type AuditCategory = "ADMIN" | "REVIEW" | "AUTH" | "ACCOUNT" | "NAVIGATION";

export type AuditActor = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

export type AuditInput = {
  actor?: AuditActor | null;
  category: AuditCategory;
  action: string;
  summary: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: unknown;
  /** Pass when already known (e.g. captured in a route handler) to skip header read. */
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Best-effort read of client IP + UA from the incoming request headers. */
async function readRequestMeta(): Promise<{ ipAddress?: string; userAgent?: string }> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    const ipAddress = fwd ? fwd.split(",")[0]?.trim() : h.get("x-real-ip") ?? undefined;
    const userAgent = h.get("user-agent") ?? undefined;
    return { ipAddress: ipAddress || undefined, userAgent: userAgent || undefined };
  } catch {
    return {};
  }
}

/**
 * Write an audit-log entry. Never throws — auditing must not break the action
 * it is recording. Failures are logged to the server console only.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const meta =
      input.ipAddress !== undefined || input.userAgent !== undefined
        ? { ipAddress: input.ipAddress ?? undefined, userAgent: input.userAgent ?? undefined }
        : await readRequestMeta();

    await db.auditLog.create({
      data: {
        actorId: input.actor?.id ?? null,
        actorEmail: input.actor?.email ?? null,
        actorName: input.actor?.name ?? null,
        category: input.category,
        action: input.action,
        summary: input.summary,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata:
          input.metadata === undefined ? undefined : (input.metadata as object),
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null
      }
    });
  } catch (err) {
    console.error("[audit] failed to write log entry", input.action, err);
  }
}
