import { logout } from "@/lib/auth-action";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <span className="text-xl font-black">MaTable <span className="text-orange-500">Admin</span></span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-4 pt-2 pb-1">Plateforme</p>
          <Link href="/dashboard" className="block px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-900 transition-colors text-sm">🍽️ Restaurateurs</Link>
          <Link href="/dashboard/stats" className="block px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-900 transition-colors text-sm">📊 Statistiques</Link>
          <Link href="/dashboard/settings" className="block px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-900 transition-colors text-sm">⚙️ Configuration</Link>

          <Link href="/dashboard/prospection" className="block px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-900 transition-colors text-sm font-medium">🎯 Prospection</Link>

          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-4 pt-4 pb-1">Communication</p>
          <Link href="/dashboard/emails" className="block px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-900 transition-colors text-sm">📧 Emails</Link>
          <Link href="/dashboard/support" className="block px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-900 transition-colors text-sm">🎧 SAV / Support</Link>

          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-4 pt-4 pb-1">Ma Table RS</p>
          <Link href="/dashboard/social-users" className="block px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-900 transition-colors text-sm">👥 Utilisateurs RS</Link>
          <Link href="/dashboard/social" className="block px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-900 transition-colors text-sm">✨ Nova Connect IA</Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <form action={logout}>
            <button className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-950/20 rounded-lg transition-colors">
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
