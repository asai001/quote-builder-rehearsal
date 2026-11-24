import { Suspense } from "react";
import Link from "next/link";
import { APP_NAME } from "@/config/company";
import { Nav, NavFallback } from "@/components/nav";
import { logout } from "@/lib/actions/auth";
import { requireUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/labels";

async function UserBox() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-3">
      <p className="text-sm leading-tight text-blue-100">
        <span className="block text-base font-bold text-white">{user.name} さん</span>
        {ROLE_LABELS[user.role]}
      </p>
      <form action={logout}>
        <button type="submit" className="min-h-11 rounded-lg border-2 border-blue-200 px-4 text-base font-bold whitespace-nowrap text-white hover:bg-blue-800">
          ログアウト
        </button>
      </form>
    </div>
  );
}

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="bg-blue-900 print:hidden">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 lg:px-8">
          <Link href="/" className="rounded-lg py-1 text-xl font-bold whitespace-nowrap text-white">
            {APP_NAME}
          </Link>
          <nav aria-label="メニュー" className="order-3 w-full min-[1500px]:order-none min-[1500px]:w-auto min-[1500px]:flex-1">
            <Suspense fallback={<NavFallback />}>
              <Nav />
            </Suspense>
          </nav>
          <div className="ml-auto">
            <Suspense fallback={null}>
              <UserBox />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] p-4 lg:p-8">{children}</main>
    </div>
  );
}
