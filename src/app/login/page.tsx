import type { Metadata } from "next";
import { APP_NAME } from "@/config/company";
import { FreshOnNavigate } from "@/components/fresh-on-navigate";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-slate-900">{APP_NAME}</h1>
        <p className="mt-2 mb-6 text-center text-base text-slate-600">メールアドレスとパスワードを入れて、ログインしてください。</p>
        <FreshOnNavigate>
          <LoginForm />
        </FreshOnNavigate>
      </div>
    </main>
  );
}
