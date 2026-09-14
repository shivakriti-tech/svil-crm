import type { NextAuthConfig } from "next-auth";
import { parsePermissions, hasPermission, ModuleKey } from "@/lib/permissions";

const PATH_MODULE_MAP: Record<string, ModuleKey> = {
  "/dashboard": "dashboard",
  "/inquiries": "inquiries",
  "/quotations": "quotations",
  "/jobs": "jobs",
  "/daily-status": "dailyStatus",
  "/finance": "finance",
  "/hr": "hr",
  "/reports": "reports",
  "/masters": "masters",
  "/users": "users",
};

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).permissions = token.permissions as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname === "/login";
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");

      if (isApiAuth) return true;

      if (!isLoggedIn) {
        return isAuthPage;
      }

      if (isAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      const role = (auth.user as any)?.role || "SALES";
      const rawPerms = (auth.user as any)?.permissions;

      if (role === "ADMIN") return true;

      // Check module access for matching route
      const pathname = nextUrl.pathname;
      for (const [prefix, moduleKey] of Object.entries(PATH_MODULE_MAP)) {
        if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
          const perms = parsePermissions(rawPerms, role);
          const allowed = hasPermission(perms, role, moduleKey, "view");
          if (!allowed) {
            return Response.redirect(new URL("/dashboard", nextUrl));
          }
          break;
        }
      }

      if (pathname.startsWith("/admin") && role !== "ADMIN") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
};
