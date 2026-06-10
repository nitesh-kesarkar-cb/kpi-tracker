import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no DB / bcrypt imports here). Shared by middleware + node auth.
export const authConfig = {
  pages: {
    signIn: "/login"
  },
  session: { strategy: "jwt" },
  providers: [], // real providers added in auth.ts (node runtime)
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = (user as any).id;
        token.accessRole = (user as any).accessRole;
        token.mustChangePassword = (user as any).mustChangePassword;
        token.name = (user as any).name;
        token.email = (user as any).email;
      }
      // session.update({ mustChangePassword: false }) after a password change
      if (trigger === "update" && session?.mustChangePassword !== undefined) {
        token.mustChangePassword = session.mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId as string;
        (session.user as any).accessRole = token.accessRole as string;
        (session.user as any).mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    }
  }
} satisfies NextAuthConfig;
