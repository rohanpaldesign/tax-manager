import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getUserById } from '@/lib/db/users';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function AccountPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('tm_session')?.value;

  if (!sessionId) redirect('/login?redirect=/account');

  const session = await getSession(sessionId);
  if (!session) redirect('/login?redirect=/account');

  const user = await getUserById(session.userId);
  if (!user) redirect('/login?redirect=/account');

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

        {/* Change Password */}
        <section className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
          <ChangePasswordForm />
        </section>

        {/* My Returns */}
        <section className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">My Returns</h2>
          <p className="text-sm text-gray-500">Your tax returns will appear here.</p>
        </section>

        {/* Session Management */}
        <section className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sessions</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <LogoutButton
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Log out
            </LogoutButton>
            <LogoutButton
              all
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Log out all devices
            </LogoutButton>
          </div>
        </section>

        {/* Delete Account */}
        <section className="bg-white border border-gray-100 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Account</h2>
          <p className="text-sm text-gray-400">
            Account deletion is coming soon.
          </p>
          <button
            disabled
            className="mt-3 bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            Delete account (coming soon)
          </button>
        </section>
      </div>
    </div>
  );
}
