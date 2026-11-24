"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type LoginResult = { message: string } | null;

export async function login(email: string, password: string): Promise<LoginResult> {
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { message: "メールアドレスとパスワードを入力してください。" };
  }
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "メールアドレスかパスワードが違います。もう一度ご確認ください。" };
    }
    throw error; // ログイン成功時の画面移動はここを通る
  }
  return null;
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
