import { requireAuth } from '@/lib/session';

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Bienvenido</h1>
      <p className="text-gray-600">{session.user?.email}</p>
    </div>
  );
}
