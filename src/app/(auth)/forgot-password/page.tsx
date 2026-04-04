'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Always show success for security
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Check your email</h1>
        <div className="text-center">
          <p className="text-gray-600 text-sm mb-6">
            If that email is registered, a reset link has been sent.
          </p>
          <p className="text-xs text-gray-400 mb-6 bg-gray-50 rounded-lg px-4 py-3">
            In this version, the reset link is printed to the server console.
          </p>
          <Link href="/login" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Back to log in
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Reset your password</h1>
      <p className="text-gray-500 text-sm text-center mb-6">
        Enter your email and we&apos;ll send you a reset link
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
          In this version, the reset link is printed to the server console.
        </p>
        <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700">
          Back to log in
        </Link>
      </div>
    </>
  );
}
