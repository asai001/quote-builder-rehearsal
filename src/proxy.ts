import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// すべての画面の手前でログイン状態を確認する（未ログインならログイン画面へ）。
// 権限の細かいチェックは、各画面・各処理のサーバー側でも必ず行っている。
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
