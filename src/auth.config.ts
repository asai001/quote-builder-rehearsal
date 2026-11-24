import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

/**
 * ログインの共通設定（データベースに触らない部分）。
 * 画面に入る前のチェック（src/proxy.ts）とサーバー側の処理（src/auth.ts）の両方で使う。
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 }, // 12時間でログインし直し
  providers: [],
  callbacks: {
    // ログインしていない場合は、すべての画面からログイン画面に移動させる
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      if (nextUrl.pathname === "/login") {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
} satisfies NextAuthConfig;
