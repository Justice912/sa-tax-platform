import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: string;
      firmId?: string;
    };
  }

  interface User {
    role?: string;
    firmId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    firmId?: string;
  }
}

export {};
