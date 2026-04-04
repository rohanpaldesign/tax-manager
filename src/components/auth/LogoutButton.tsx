'use client';

import { useRouter } from 'next/navigation';

interface LogoutButtonProps {
  all?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function LogoutButton({ all = false, className, children }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch(all ? '/api/auth/logout-all' : '/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className={className}>
      {children ?? (all ? 'Log out all devices' : 'Log out')}
    </button>
  );
}
