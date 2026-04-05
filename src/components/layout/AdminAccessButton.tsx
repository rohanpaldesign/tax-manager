'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminAccessButton() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Invalid code.');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-center mt-4">
      <button
        type="button"
        onClick={() => {
          setShow(!show);
          if (!show) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
      >
        Admin access
      </button>
      {show && (
        <div className="mt-2 flex gap-2 justify-center flex-wrap">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Access code"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 w-44"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !code}
            className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-300 transition-colors disabled:opacity-40"
          >
            {loading ? '…' : 'Enter'}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
