import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getUserById } from '@/lib/db/users';
import { listUserReturns } from '@/lib/db/returns';
import { initDb } from '@/lib/db/client';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';
import LogoutButton from '@/components/auth/LogoutButton';
import DeleteReturnButton from '@/components/auth/DeleteReturnButton';

export default async function AccountPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('tm_session')?.value;

  if (!sessionId) redirect('/login?redirect=/account');

  const session = await getSession(sessionId);
  if (!session) redirect('/login?redirect=/account');

  const user = await getUserById(session.userId);
  if (!user) redirect('/login?redirect=/account');

  await initDb();
  const returns = await listUserReturns(user.id);

  const drafts = returns.filter((r) => r.status === 'draft');
  const completed = returns.filter((r) => r.status === 'complete');

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Account</h1>

        {/* Profile */}
        <section className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-gray-900 font-medium">{user.email}</p>
              <p className="text-sm text-gray-500">Member since account creation</p>
            </div>
            {user.role === 'admin' && (
              <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                Admin
              </span>
            )}
          </div>
        </section>

        {/* My Returns */}
        <section className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Returns</h2>

          {returns.length === 0 ? (
            <p className="text-sm text-gray-500">No returns yet. <a href="/prepare" className="text-blue-600 hover:underline">Start your 2025 return →</a></p>
          ) : (
            <div className="space-y-6">

              {/* In-progress drafts */}
              {drafts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    In Progress <span className="font-normal normal-case">(auto-deleted after 30 days)</span>
                  </p>
                  <div className="space-y-2">
                    {drafts.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Tax Year {r.taxYear} — Draft</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Started {fmtDate(r.createdAt)} · Last updated {fmtDate(r.updatedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <a href={`/prepare?resume=${r.id}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Resume →
                          </a>
                          <DeleteReturnButton returnId={r.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed returns — permanent */}
              {completed.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    Completed <span className="font-normal normal-case">(saved permanently)</span>
                  </p>
                  <div className="space-y-2">
                    {completed.map((r) => {
                      const ageMs = Date.now() - new Date(r.createdAt).getTime();
                      const withinEditWindow = ageMs < 30 * 24 * 60 * 60 * 1000;
                      return (
                        <div key={r.id} className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Tax Year {r.taxYear} — Complete</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Filed {fmtDate(r.updatedAt)}
                            </p>
                            {r.result && (
                              <p className="text-xs text-green-700 mt-0.5">
                                {r.result.federal.refund > 0
                                  ? `Federal refund: $${Math.round(r.result.federal.refund).toLocaleString()}`
                                  : r.result.federal.amountDue > 0
                                  ? `Federal due: $${Math.round(r.result.federal.amountDue).toLocaleString()}`
                                  : 'Federal: $0 balance'}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {withinEditWindow && (
                              <a
                                href={`/prepare?resume=${r.id}`}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                Open / Edit
                              </a>
                            )}
                            <a
                              href={`/api/returns/${r.id}/pdf`}
                              className="text-sm text-green-700 hover:text-green-800 font-medium border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              Download PDF
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Change Password */}
        <section className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
          <ChangePasswordForm />
        </section>

        {/* Session Management */}
        <section className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sessions</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <LogoutButton className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              Log out
            </LogoutButton>
            <LogoutButton all className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              Log out all devices
            </LogoutButton>
          </div>
        </section>

        {/* Delete Account */}
        <section className="bg-white border border-gray-100 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Account</h2>
          <p className="text-sm text-gray-400">Account deletion is coming soon.</p>
          <button disabled className="mt-3 bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed">
            Delete account (coming soon)
          </button>
        </section>
      </div>
    </div>
  );
}
