"use client";

import { Fragment } from "react";
import { useRouter } from "next/navigation";

/**
 * メニューやリンクから画面を開き直したときに、入力内容や結果メッセージを最初の状態に戻す。
 * （ブラウザの「戻る」で戻ったときは、入力途中の内容がそのまま残る）
 * Next.js は前に開いた画面の状態を保持するため、保存済みの見積の入力内容が
 * 次の見積作成に残ってしまわないようにしている。
 */
export function FreshOnNavigate({ children }: { children: React.ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
