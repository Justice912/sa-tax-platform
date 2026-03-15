import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { demoUsers } from "@/server/demo-data";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase().trim();

        if (isDemoMode) {
          const demoUser = demoUsers.find((user) => user.email === email);
          if (!demoUser || parsed.data.password !== demoUser.password) {
            return null;
          }

          return {
            id: demoUser.id,
            email: demoUser.email,
            name: demoUser.fullName,
            role: demoUser.primaryRole,
            firmId: demoUser.firmId,
          };
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { roles: { include: { role: true } } },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isPasswordValid) {
          return null;
        }

        const primaryRole = user.roles[0]?.role.code;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: primaryRole,
          firmId: user.firmId ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.firmId = (user as { firmId?: string }).firmId;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as string | undefined;
        session.user.firmId = token.firmId as string | undefined;
      }
      return session;
    },
  },
};

export const authHandler = NextAuth(authOptions);

