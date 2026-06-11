import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase();

        const user = await db.user.findUnique({
          where: { email: normalizedEmail }
        });

        const fail = async (reason: string) => {
          await logAudit({
            actor: user ? { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}` } : { email: normalizedEmail },
            category: "AUTH",
            action: "auth.login_failed",
            entityType: "User",
            entityId: user?.id ?? null,
            summary: `Failed login for ${normalizedEmail}`,
            metadata: { reason }
          });
        };

        if (!user) {
          await fail("user_not_found");
          return null;
        }
        if (!user.isActive) {
          await fail("inactive");
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await fail("bad_password");
          return null;
        }

        await logAudit({
          actor: { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}` },
          category: "AUTH",
          action: "auth.login",
          entityType: "User",
          entityId: user.id,
          summary: `Logged in`
        });

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          accessRole: user.accessRole,
          mustChangePassword: user.mustChangePassword
        } as any;
      }
    })
  ],
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      await logAudit({
        actor: token
          ? { id: (token as any).userId, email: (token as any).email, name: (token as any).name }
          : null,
        category: "AUTH",
        action: "auth.logout",
        entityType: "User",
        entityId: (token as any)?.userId ?? null,
        summary: `Logged out`
      });
    }
  }
});
