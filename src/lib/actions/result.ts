/** サーバー側の処理の結果（失敗したときは画面に出す日本語メッセージ） */
export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

export const NOT_ALLOWED = "この操作はできません。画面を開き直して、もう一度お試しください。";
export const NOT_FOUND = "対象のデータが見つかりません。すでに変更されたか、見る権限がありません。";
