import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { COOKIE_NAME } from "@/lib/auth/session";
import { initDb } from "@/lib/db/client";
import type { AnalyticsData } from "@/app/api/admin/analytics/route";
import { AdminRolePanel } from "@/components/admin/AdminRolePanel";

async function fetchAnalytics(): Promise<AnalyticsData> {
  // Import the handler internals directly to avoid a self-HTTP call
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();

  const empty: AnalyticsData = {
    kpis: { totalUsers: 0, newUsersThisMonth: 0, totalReturns: 0, completedReturns: 0 },
    userGrowth: [],
    returnFunnel: [],
    residencyBreakdown: [],
    formUsage: [],
    stateDistribution: [],
    admins: [],
  };

  if (!db) return empty;

  const STAGE_LABELS: Record<number, string> = {
    1: "Residency", 2: "Federal Income", 3: "Deductions & Credits",
    4: "Federal Review", 5: "State Taxes", 6: "Final Output",
  };

  const FORM_FIELDS = [
    { key: "w2Income", label: "W-2" },
    { key: "form1099INT", label: "1099-INT" },
    { key: "form1099DIV", label: "1099-DIV" },
    { key: "form1099B", label: "1099-B" },
    { key: "form1099NEC", label: "1099-NEC" },
    { key: "form1099R", label: "1099-R" },
    { key: "form1099MISC", label: "1099-MISC" },
    { key: "scheduleC", label: "Schedule C" },
    { key: "rentalProperties", label: "Schedule E" },
    { key: "capitalAssetSales", label: "Capital Assets" },
  ];

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  type Row = Record<string, unknown>;

  const [
    totalUsersRes, newUsersRes, totalReturnsRes, completedReturnsRes,
    growthRes, funnelRes, residencyRes, stateRes, adminsRes,
  ] = await Promise.all([
    db.execute(`SELECT COUNT(*) as n FROM users`),
    db.execute({ sql: `SELECT COUNT(*) as n FROM users WHERE created_at >= ?`, args: [firstOfMonth] }),
    db.execute(`SELECT COUNT(*) as n FROM tax_returns`),
    db.execute(`SELECT COUNT(*) as n FROM tax_returns WHERE status = 'complete'`),
    db.execute({ sql: `SELECT date(created_at) as day, COUNT(*) as n FROM users WHERE created_at >= ? GROUP BY day ORDER BY day`, args: [thirtyDaysAgo] }),
    db.execute(`SELECT COALESCE(stage, 1) as stage, COUNT(*) as n FROM tax_returns GROUP BY stage ORDER BY stage`),
    db.execute(`SELECT json_extract(input_json, '$.residencyStatus') as status, COUNT(*) as n FROM tax_returns GROUP BY status ORDER BY n DESC`),
    db.execute(`SELECT SUM(CASE WHEN json_extract(input_json, '$.state') = 'CA' THEN 1 ELSE 0 END) as ca, SUM(CASE WHEN json_extract(input_json, '$.state') = 'PA' THEN 1 ELSE 0 END) as pa, SUM(CASE WHEN json_extract(input_json, '$.state') = 'WA' THEN 1 ELSE 0 END) as wa, SUM(CASE WHEN json_extract(input_json, '$.state') NOT IN ('CA','PA','WA') OR json_extract(input_json, '$.state') IS NULL THEN 1 ELSE 0 END) as other FROM tax_returns`),
    db.execute(`SELECT email, created_at FROM users WHERE role = 'admin' ORDER BY created_at`),
  ]);

  const formCases = FORM_FIELDS.map((f) => `SUM(CASE WHEN json_array_length(json_extract(input_json, '$.${f.key}')) > 0 THEN 1 ELSE 0 END) as ${f.key}`).join(", ");
  const formRes = await db.execute(`SELECT ${formCases} FROM tax_returns`);

  const formRow = formRes.rows[0] as Row ?? {};

  return {
    kpis: {
      totalUsers: Number((totalUsersRes.rows[0] as Row).n ?? 0),
      newUsersThisMonth: Number((newUsersRes.rows[0] as Row).n ?? 0),
      totalReturns: Number((totalReturnsRes.rows[0] as Row).n ?? 0),
      completedReturns: Number((completedReturnsRes.rows[0] as Row).n ?? 0),
    },
    userGrowth: growthRes.rows.map((r) => ({ day: String((r as Row).day), n: Number((r as Row).n) })),
    returnFunnel: (funnelRes.rows as Row[]).map((r) => ({
      stage: Number(r.stage), label: STAGE_LABELS[Number(r.stage)] ?? `Stage ${r.stage}`, n: Number(r.n),
    })),
    residencyBreakdown: (residencyRes.rows as Row[]).map((r) => ({ status: String(r.status ?? "unknown"), n: Number(r.n) })),
    formUsage: FORM_FIELDS.map((f) => ({ form: f.label, n: Number(formRow[f.key] ?? 0) })).sort((a, b) => b.n - a.n),
    stateDistribution: [
      { state: "CA", n: Number((stateRes.rows[0] as Row).ca ?? 0) },
      { state: "PA", n: Number((stateRes.rows[0] as Row).pa ?? 0) },
      { state: "WA", n: Number((stateRes.rows[0] as Row).wa ?? 0) },
      { state: "Other", n: Number((stateRes.rows[0] as Row).other ?? 0) },
    ].filter((s) => s.n > 0),
    admins: (adminsRes.rows as Row[]).map((r) => ({ email: String(r.email), createdAt: String(r.created_at) })),
  };
}

// ─── CSS bar chart helper ─────────────────────────────────────────────────────
function Bar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-gray-600 w-8 text-right">{value}</span>
    </div>
  );
}

export default async function AdminPage() {
  await initDb();

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionId) redirect("/login?redirect=/admin");

  const session = await getSession(sessionId);
  if (!session || session.role !== "admin") redirect("/");

  const data = await fetchAnalytics();
  const { kpis, userGrowth, returnFunnel, residencyBreakdown, formUsage, stateDistribution } = data;

  const maxGrowth = Math.max(...userGrowth.map((d) => d.n), 1);
  const maxFunnel = Math.max(...returnFunnel.map((d) => d.n), 1);
  const maxResidency = Math.max(...residencyBreakdown.map((d) => d.n), 1);
  const maxForm = Math.max(...formUsage.map((d) => d.n), 1);
  const maxState = Math.max(...stateDistribution.map((d) => d.n), 1);

  const RESIDENCY_LABELS: Record<string, string> = {
    resident: "Resident",
    nonresident: "Nonresident Alien",
    part_year_resident: "Part-Year / Dual-Status",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">Aggregate analytics — no individual user tax data is shown here.</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Users", value: kpis.totalUsers, sub: `+${kpis.newUsersThisMonth} this month`, color: "text-blue-600" },
            { label: "New This Month", value: kpis.newUsersThisMonth, color: "text-green-600" },
            { label: "Returns Started", value: kpis.totalReturns, color: "text-purple-600" },
            { label: "Returns Completed", value: kpis.completedReturns, sub: kpis.totalReturns > 0 ? `${Math.round(kpis.completedReturns / kpis.totalReturns * 100)}% completion` : undefined, color: "text-orange-600" },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{card.label}</p>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value.toLocaleString()}</p>
              {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* User Growth */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">User Signups — Last 30 Days</h2>
            {userGrowth.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No signups in this period.</p>
            ) : (
              <div className="space-y-2">
                {userGrowth.map((d) => (
                  <div key={d.day}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">{d.day}</span>
                    </div>
                    <Bar value={d.n} max={maxGrowth} color="bg-blue-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Return Funnel */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Return Funnel by Stage</h2>
            {returnFunnel.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No returns yet.</p>
            ) : (
              <div className="space-y-3">
                {returnFunnel.map((d) => (
                  <div key={d.stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700 font-medium">Stage {d.stage} — {d.label}</span>
                      <span className="text-xs text-gray-400">{maxFunnel > 0 ? `${Math.round(d.n / maxFunnel * 100)}%` : "—"}</span>
                    </div>
                    <Bar value={d.n} max={maxFunnel} color="bg-purple-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Residency Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Residency Status</h2>
            {residencyBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {residencyBreakdown.map((d) => (
                  <div key={d.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">{RESIDENCY_LABELS[d.status] ?? d.status}</span>
                    </div>
                    <Bar value={d.n} max={maxResidency} color="bg-green-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* State Distribution */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">State Distribution</h2>
            {stateDistribution.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {stateDistribution.map((d) => (
                  <div key={d.state}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700 font-medium">{d.state}</span>
                    </div>
                    <Bar value={d.n} max={maxState} color="bg-orange-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Usage */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Income Form Usage</h2>
            {formUsage.every((f) => f.n === 0) ? (
              <p className="text-sm text-gray-400 italic">No returns with income forms yet.</p>
            ) : (
              <div className="space-y-2">
                {formUsage.filter((f) => f.n > 0).map((d) => (
                  <div key={d.form}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">{d.form}</span>
                    </div>
                    <Bar value={d.n} max={maxForm} color="bg-indigo-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Admin Management */}
        <AdminRolePanel admins={data.admins} />
      </div>
    </div>
  );
}
