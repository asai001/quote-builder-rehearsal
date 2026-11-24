"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "ホーム", match: (p: string) => p === "/" },
  { href: "/quotes/new", label: "見積を作る", match: (p: string) => p === "/quotes/new" },
  { href: "/quotes", label: "見積の一覧", match: (p: string) => p.startsWith("/quotes") && p !== "/quotes/new" },
  { href: "/invoices", label: "請求の一覧", match: (p: string) => p.startsWith("/invoices") },
  { href: "/receivables", label: "売掛金（未入金）", match: (p: string) => p.startsWith("/receivables") },
  { href: "/customers", label: "お客様の一覧", match: (p: string) => p.startsWith("/customers") },
] as const;

function NavList({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex flex-wrap gap-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname !== null && item.match(pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 items-center rounded-lg px-4 text-base font-bold whitespace-nowrap ${active ? "bg-white text-blue-900" : "text-white hover:bg-blue-800"}`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** メニュー（今いる画面を強調する） */
export function Nav() {
  const pathname = usePathname();
  return <NavList pathname={pathname} />;
}

/** 読み込み中に出す、強調なしのメニュー */
export function NavFallback() {
  return <NavList pathname={null} />;
}
