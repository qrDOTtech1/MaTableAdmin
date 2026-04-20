import { logout } from "@/lib/auth-action";

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
        
        <nav className="flex-1 p-4 space-y-2">
          <a href="/dashboard" className="block px-4 py-2 rounded-lg bg-slate-800 text-white font-medium">Restaurateurs</a>
          <a href="/dashboard/stats" className="block px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-900 transition-colors">Statistiques</a>
          <a href="/dashboard/settings" className="block px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-900 transition-colors">Configuration</a>
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
