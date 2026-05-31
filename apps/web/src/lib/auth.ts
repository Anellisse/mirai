import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { Session } from 'next-auth';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

// Cast to any to avoid TS2742 "inferred type cannot be named" with next-auth v5 beta
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextAuthResult: any = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          if (data.requiresTwoFactor) {
            throw new Error(`2FA_REQUIRED:${data.tempToken}`);
          }

          return {
            id: data.userId ?? 'unknown',
            email: credentials.email as string,
            accessToken: data.accessToken,
          };
        } catch (error: unknown) {
          if (error instanceof Error && error.message.startsWith('2FA_REQUIRED:')) {
            throw error;
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
});

export const handlers: {
  GET: (req: Request) => Promise<Response>;
  POST: (req: Request) => Promise<Response>;
} = nextAuthResult.handlers;

export const auth: () => Promise<Session | null> = nextAuthResult.auth;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signIn: (...args: any[]) => Promise<any> = nextAuthResult.signIn;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signOut: (...args: any[]) => Promise<any> = nextAuthResult.signOut;
