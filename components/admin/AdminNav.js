"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminNav({ businessName }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  return (
    <header className="border-b border-slate-800 bg-ink-900">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">{businessName}</span>
          <span className="rounded-full bg-brand-600/20 px-2 py-0.5 text-xs font-medium text-brand-300">
            Admin
          </span>
        </div>

        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((link) => {
            const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-white/10 text-white" : "text-slate-300 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/" target="_blank" className="hidden text-sm text-slate-300 hover:text-white sm:block">
            View site &rarr;
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50"
          >
            {loggingOut ? "..." : "Logout"}
          </button>
        </div>
      </div>

      <nav className="container-page flex gap-1 overflow-x-auto border-t border-slate-800 py-2 sm:hidden">
        {LINKS.map((link) => {
          const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${
                active ? "bg-white/10 text-white" : "text-slate-300"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
