"use client";

import { useState } from "react";

interface Admin {
  email: string;
  createdAt: string;
}

interface Props {
  admins: Admin[];
}

export function AdminRolePanel({ admins: initialAdmins }: Props) {
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const [grantEmail, setGrantEmail] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const callRole = async (email: string, action: "grant" | "revoke") => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Failed" });
      } else {
        setMessage({ type: "ok", text: `${action === "grant" ? "Granted" : "Revoked"} admin for ${email}` });
        if (action === "grant") {
          setAdmins((prev) => [...prev, { email, createdAt: new Date().toISOString() }]);
          setGrantEmail("");
        } else {
          setAdmins((prev) => prev.filter((a) => a.email.toLowerCase() !== email.toLowerCase()));
        }
      }
    } catch {
      setMessage({ type: "err", text: "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Admin Management</h2>
      <p className="text-xs text-gray-500 mb-4">Grant or revoke admin access for existing users. You cannot revoke your own access.</p>

      {message && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium
          ${message.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Current admins */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Current Admins</p>
        {admins.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No admins found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-medium text-gray-500">Email</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500">Since</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.email} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-gray-800">{a.email}</td>
                  <td className="py-2 text-gray-500 text-xs">{a.createdAt.slice(0, 10)}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => callRole(a.email, "revoke")}
                      disabled={loading}
                      className="text-xs text-red-600 hover:underline disabled:opacity-40"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Grant admin */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Grant Admin Access</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => callRole(grantEmail.trim(), "grant")}
            disabled={loading || !grantEmail.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Grant
          </button>
        </div>
      </div>
    </div>
  );
}
