"use client";

import { useState } from "react";
import { logout } from "@/lib/auth-action";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    group: "Plateforme",
    items: [
      { href: "/dashboard", label: "🍽️ Restaurateurs", exact: true },
      { href: "/dashboard/stats", label: "📊 Statistiques" },
      { href: "/dashboard/metrics", label: "📈 Churn & Revenus" },
      { href: "/dashboard/billing-config", label: "💳 Facturation" },
      { href: "/dashboard/factures", label: "🧾 Factures émises" },
      { href: "/dashboard/parrainages", label: "🎁 Parrainages" },
      { href: "/dashboard/campagnes", label: "📣 Campagnes email" },
      { href: "/dashboard/settings", label: "⚙️ Configuration" },
      { href: "/dashboard/prospection", label: "🎯 Prospection" },
      { href: "/dashboard/demandes", label: "📩 Demandes / tarifs" },
      { href: "/dashboard/documents", label: "📂 Classeur virtuel" },
      { href: "/dashboard/database", label: "🗄 Base de données" },
    ],
  },
  {
    group: "Communication",
    items: [
      { href: "/dashboard/emails", label: "📧 Emails" },
      { href: "/dashboard/support", label: "🎧 SAV / Support" },
    ],
  },
  {
    group: "MaTable.Pro RS",
    items: [
      { href: "/dashboard/social-users", label: "👥 Utilisateurs RS" },
      { href: "/dashboard/social", label: "✨ Nova Connect IA" },
    ],
  },
];

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/") || (href !== "/dashboard" && pathname.startsWith(href));
  }

  return (
    <>
      <div className="p-5 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <span className="text-xl font-black">MaTable <span className="text-orange-500">Admin</span></span>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl leading-none transition-colors">✕</button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(section => (
          <div key={section.group}>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 pt-4 pb-1.5">{section.group}</p>
            {section.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center px-3 py-2.5 rounded-xl text-sm transition-all font-medium ${
                  isActive(item.href, item.exact)
                    ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800 flex-shrink-0">
        <form action={logout}>
          <button className="w-full text-left px-3 py-2.5 text-red-400 hover:bg-red-950/20 rounded-xl transition-colors text-sm font-medium">
            🚪 Déconnexion
          </button>
        </form>
      </div>
    </>
  );
}

function MobileHeader({ onOpen }: { onOpen: () => void }) {
  const pathname = usePathname();
  const current = NAV.flatMap(s => s.items).find(i =>
    i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/") || (i.href !== "/dashboard" && pathname.startsWith(i.href))
  );

  return (
    <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950 sticky top-0 z-40 flex-shrink-0">
      <button
        onClick={onOpen}
        className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-white hover:border-slate-500 transition-colors flex-shrink-0"
        aria-label="Menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span className="font-black text-base">MaTable <span className="text-orange-500">Admin</span></span>
      {current && (
        <span className="ml-auto text-xs text-slate-400 truncate max-w-[140px]">{current.label}</span>
      )}
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 border-r border-slate-800 flex-col flex-shrink-0 sticky top-0 h-screen">
        <SidebarNav />
      </aside>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-slate-950 border-r border-slate-800 flex flex-col h-full z-10 shadow-2xl">
            <SidebarNav onClose={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader onOpen={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
