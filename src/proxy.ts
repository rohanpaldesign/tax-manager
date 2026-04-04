import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon.ico, public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)',
  ],
};

const COOKIE_NAME = 'tm_session';

// Routes that are always public
const PUBLIC_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  return false;
}

const PROTECTED_PATHS = ['/prepare', '/account', '/admin'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

async function checkSession(
  sessionId: string
): Promise<{ userId: string; role: string } | null> {
  // We must NOT import bcrypt or any Node-only module here.
  // We make a lightweight DB call via the libsql client.
  // However, middleware runs in the Edge runtime by default in Next.js.
  // To keep this import-safe we do the DB check inline using dynamic import
  // only when a DB URL is configured.

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return null; // stateless mode — allow through

  try {
    const { createClient } = await import('@libsql/client/web');
    const db = createClient({ url, authToken });

    const result = await db.execute({
      sql: `SELECT s.user_id, s.expires_at, u.role
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = ?`,
      args: [sessionId],
    });

    if (result.rows.length === 0) return null;

    const row = result.rows[0] as unknown as { user_id: string; expires_at: string; role: string };
    if (new Date(row.expires_at) < new Date()) return null;

    return { userId: row.user_id, role: row.role };
  } catch {
    // If DB check fails, allow through (graceful degradation)
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // If the path is not a protected path, allow through
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get(COOKIE_NAME)?.value;

  // No session cookie → redirect to login
  if (!sessionId) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // No DB configured → allow all routes through (stateless mode)
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    return NextResponse.next();
  }

  const session = await checkSession(sessionId);

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin route check
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (session.role !== 'admin') {
      return NextResponse.redirect(new URL('/prepare', request.url));
    }
  }

  return NextResponse.next();
}
