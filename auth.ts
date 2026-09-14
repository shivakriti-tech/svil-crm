import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getDefaultPermissions, parsePermissions } from "@/lib/permissions";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "svil_crm_production_secure_secret_2026_key_abc123",
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
      }

      // Dynamically re-verify role and permissions from database on every session check
      if (token?.email || token?.id) {
        try {
          const userEmail = typeof token.email === "string" ? token.email.trim().toLowerCase() : undefined;
          const userId = typeof token.id === "string" ? token.id : undefined;

          const dbUser = await prisma.user.findFirst({
            where: {
              OR: [
                ...(userId ? [{ id: userId }] : []),
                ...(userEmail ? [{ email: { equals: userEmail } }] : []),
              ],
            },
            select: { id: true, role: true, permissions: true, status: true, name: true },
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.permissions = dbUser.permissions;
            if (dbUser.name) token.name = dbUser.name;
          }
        } catch (err) {
          // Keep existing token if DB lookup fails temporarily
        }
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
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).trim().toLowerCase();
        const pass = (credentials.password as string).trim();

        // 1. Hardcoded / Serverless Fail-safe Auth for Emergency Admin Access
        if (email === "admin@svil.com" || email === "admin@svil.in") {
          if (pass === "admin123" || pass === "svil@2026" || pass === "admin@svil2026") {
            return {
              id: "cl_admin_master_01",
              email: "admin@svil.com",
              name: "Admin",
              role: "ADMIN",
              permissions: JSON.stringify(getDefaultPermissions("ADMIN")),
            };
          }
        }

        // Demo user logins for team members
        const demoPasswords = ["admin123", "svil@2026", "admin@svil2026"];
        if (demoPasswords.includes(pass)) {
          if (email === "chirag@svil.com" || email === "chirag@svil.in") {
            return { id: "cl_chirag_01", email: "chirag@svil.com", name: "Chirag", role: "SALES", permissions: JSON.stringify(getDefaultPermissions("SALES")) };
          }
          if (email === "shrikar@svil.com" || email === "shrikar@svil.in") {
            return { id: "cl_shrikar_01", email: "shrikar@svil.com", name: "Shrikar", role: "MANAGER", permissions: JSON.stringify(getDefaultPermissions("MANAGER")) };
          }
          if (email === "kamal@svil.com" || email === "kamal@svil.in") {
            return { id: "cl_kamal_01", email: "kamal@svil.com", name: "Kamal", role: "SALES", permissions: JSON.stringify(getDefaultPermissions("SALES")) };
          }
        }

        // 2. Database Lookup with Bcrypt Password Hash Verification
        try {
          const user = await prisma.user.findFirst({
            where: { email: { equals: email } },
          });

          if (user) {
            if (user.status === "INACTIVE") {
              console.warn(`Blocked login attempt for inactive user: ${email}`);
              return null;
            }

            const isValid = await bcrypt.compare(pass, user.password);
            if (isValid) {
              // Update last login
              prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
              }).catch(() => {});

              const perms = parsePermissions(user.permissions, user.role);

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: JSON.stringify(perms),
              };
            }
          }
        } catch (err) {
          console.error("Database user lookup error:", err);
        }

        return null;
      },
    }),
  ],
});
