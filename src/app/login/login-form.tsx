"use client";

import { useId, useState, useTransition } from "react";
import { login } from "@/lib/actions/auth";
import { buttonStyles, inputStyles, labelStyles } from "@/components/ui";

export function LoginForm() {
  const uid = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // ログインに失敗しても、入力したメールアドレスは消さない（パスワードだけ入れ直してもらう）
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await login(email, password);
      if (result) {
        setMessage(result.message);
        setPassword("");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor={`${uid}-email`} className={labelStyles}>
          メールアドレス
        </label>
        <input
          id={`${uid}-email`}
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputStyles}
        />
      </div>
      <div>
        <label htmlFor={`${uid}-password`} className={labelStyles}>
          パスワード
        </label>
        <input
          id={`${uid}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={inputStyles}
        />
      </div>
      {message ? (
        <p role="alert" className="rounded-lg border-2 border-red-300 bg-red-50 p-3 text-base font-bold text-red-800">
          {message}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={`${buttonStyles.primary} w-full text-lg`}>
        {pending ? "ログインしています…" : "ログイン"}
      </button>
    </form>
  );
}
