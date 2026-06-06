'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="w-full text-left text-xs text-brand-300 hover:text-white transition"
    >
      Cerrar sesión
    </button>
  );
}
