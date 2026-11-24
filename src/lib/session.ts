import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/enums";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/** ログイン中のユーザー（未ログインなら null）。1回の表示の中では1度だけ確認する */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) return null;
  return { id: user.id, name: user.name ?? "", email: user.email ?? "", role: user.role };
});

/** ログイン必須。未ログインならログイン画面へ */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function isAdmin(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "ADMIN";
}

/**
 * 見積・請求を「見てよい範囲」に絞る条件。
 * 管理者はすべて、社員は自分が担当のものだけ。
 */
export function ownerScope(user: CurrentUser): { assigneeId?: string } {
  return isAdmin(user) ? {} : { assigneeId: user.id };
}
