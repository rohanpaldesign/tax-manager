'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteReturnButton({ returnId }: { returnId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch('/api/returns/user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: returnId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Delete?</span>
        <button onClick={handleDelete} disabled={loading}
          className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50">
          {loading ? '…' : 'Yes'}
        </button>
        <button onClick={() => setConfirm(false)} className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="text-xs text-red-400 hover:text-red-600 transition-colors">
      Delete
    </button>
  );
}
