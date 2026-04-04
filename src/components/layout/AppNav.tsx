import { cookies } from 'next/headers';
import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { getUserById } from '@/lib/db/users';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function AppNav() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('tm_session')?.value;

  let user: { id: string; email: string; role: string; emailVerified: boolean } | null = null;

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      user = await getUserById(session.userId);
    }
  }

  return (
    <nav className="border-b border-gray-100 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🧾</span>
          <span className="font-bold text-gray-900 text-lg">Tax Manager</span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/account"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                My Account
              </Link>
              <LogoutButton className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                Log out
              </LogoutButton>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
