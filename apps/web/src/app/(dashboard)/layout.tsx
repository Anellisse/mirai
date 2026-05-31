import { requireAuth } from '@/lib/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand-900 text-white flex flex-col">
        <div className="p-6 border-b border-brand-600">
          <h2 className="font-bold text-lg">Mirai</h2>
          <p className="text-brand-50 text-xs mt-1">Centro Neuropsia</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <a href="/dashboard" className="block px-3 py-2 rounded-lg text-sm hover:bg-brand-500 transition">
            Inicio
          </a>
          <a href="/patients" className="block px-3 py-2 rounded-lg text-sm hover:bg-brand-500 transition">
            Pacientes
          </a>
          <a href="/repository" className="block px-3 py-2 rounded-lg text-sm hover:bg-brand-500 transition">
            Repositorio
          </a>
        </nav>
        <div className="p-4 border-t border-brand-600 text-xs text-brand-200">
          {session.user?.email}
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
