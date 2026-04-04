import { NextRequest, NextResponse } from "next/server";
import { initDb, getDb } from "@/lib/db/client";
import { getSession } from "@/lib/auth/session";
import { COOKIE_NAME } from "@/lib/auth/session";

export interface AnalyticsData {
  kpis: {
    totalUsers: number;
    newUsersThisMonth: number;
    totalReturns: number;
    completedReturns: number;
  };
  userGrowth: { day: string; n: number }[];
  returnFunnel: { stage: number; label: string; n: number }[];
  residencyBreakdown: { status: string; n: number }[];
  formUsage: { form: string; n: number }[];
  stateDistribution: { state: string; n: number }[];
  admins: { email: string; createdAt: string }[];
}

const STAGE_LABELS: Record<number, string> = {
  1: "Residency",
  2: "Federal Income",
  3: "Deductions & Credits",
  4: "Federal Review",
  5: "State Taxes",
  6: "Final Output",
};

const FORM_FIELDS: { key: string; label: string }[] = [
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

export async function GET(req: NextRequest) {
  await initDb();

  // Auth check
  const sessionId = req.cookies.get(COOKIE_NAME)?.value;
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await getSession(sessionId);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();

  // Stateless mode — return empty data
  if (!db) {
    const empty: AnalyticsData = {
      kpis: { totalUsers: 0, newUsersThisMonth: 0, totalReturns: 0, completedReturns: 0 },
      userGrowth: [],
      returnFunnel: [],
      residencyBreakdown: [],
      formUsage: [],
      stateDistribution: [],
      admins: [],
    };
    return NextResponse.json(empty);
  }

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Run all queries in parallel
  const [
    totalUsersRes,
    newUsersRes,
    totalReturnsRes,
    completedReturnsRes,
    growthRes,
    funnelRes,
    residencyRes,
    stateRes,
    adminsRes,
  ] = await Promise.all([
    db.execute(`SELECT COUNT(*) as n FROM users`),
    db.execute({ sql: `SELECT COUNT(*) as n FROM users WHERE created_at >= ?`, args: [firstOfMonth] }),
    db.execute(`SELECT COUNT(*) as n FROM tax_returns`),
    db.execute(`SELECT COUNT(*) as n FROM tax_returns WHERE status = 'complete'`),
    db.execute({
      sql: `SELECT date(created_at) as day, COUNT(*) as n FROM users WHERE created_at >= ? GROUP BY day ORDER BY day`,
      args: [thirtyDaysAgo],
    }),
    db.execute(`SELECT COALESCE(stage, 1) as stage, COUNT(*) as n FROM tax_returns GROUP BY stage ORDER BY stage`),
    db.execute(`SELECT json_extract(input_json, '$.residencyStatus') as status, COUNT(*) as n FROM tax_returns GROUP BY status ORDER BY n DESC`),
    db.execute(`
      SELECT
        SUM(CASE WHEN json_extract(input_json, '$.state') = 'CA' THEN 1 ELSE 0 END) as ca,
        SUM(CASE WHEN json_extract(input_json, '$.state') = 'PA' THEN 1 ELSE 0 END) as pa,
        SUM(CASE WHEN json_extract(input_json, '$.state') = 'WA' THEN 1 ELSE 0 END) as wa,
        SUM(CASE WHEN json_extract(input_json, '$.state') NOT IN ('CA','PA','WA') OR json_extract(input_json, '$.state') IS NULL THEN 1 ELSE 0 END) as other
      FROM tax_returns
    `),
    db.execute(`SELECT email, created_at FROM users WHERE role = 'admin' ORDER BY created_at`),
  ]);

  // Form usage — build dynamic CASE statements for each form type
  const formCases = FORM_FIELDS.map((f) =>
    `SUM(CASE WHEN json_array_length(json_extract(input_json, '$.${f.key}')) > 0 THEN 1 ELSE 0 END) as ${f.key}`
  ).join(", ");
  const formRes = await db.execute(`SELECT ${formCases} FROM tax_returns`);

  // Serialize results
  type Row = Record<string, unknown>;

  const kpis = {
    totalUsers: Number((totalUsersRes.rows[0] as Row).n ?? 0),
    newUsersThisMonth: Number((newUsersRes.rows[0] as Row).n ?? 0),
    totalReturns: Number((totalReturnsRes.rows[0] as Row).n ?? 0),
    completedReturns: Number((completedReturnsRes.rows[0] as Row).n ?? 0),
  };

  const userGrowth = growthRes.rows.map((r) => ({
    day: String((r as Row).day),
    n: Number((r as Row).n),
  }));

  const returnFunnel = (funnelRes.rows as Row[]).map((r) => ({
    stage: Number(r.stage),
    label: STAGE_LABELS[Number(r.stage)] ?? `Stage ${r.stage}`,
    n: Number(r.n),
  }));

  const residencyBreakdown = (residencyRes.rows as Row[]).map((r) => ({
    status: String(r.status ?? "unknown"),
    n: Number(r.n),
  }));

  const formRow = formRes.rows[0] as Row ?? {};
  const formUsage = FORM_FIELDS.map((f) => ({
    form: f.label,
    n: Number(formRow[f.key] ?? 0),
  })).sort((a, b) => b.n - a.n);

  const stateRow = stateRes.rows[0] as Row ?? {};
  const stateDistribution = [
    { state: "CA", n: Number(stateRow.ca ?? 0) },
    { state: "PA", n: Number(stateRow.pa ?? 0) },
    { state: "WA", n: Number(stateRow.wa ?? 0) },
    { state: "Other", n: Number(stateRow.other ?? 0) },
  ].filter((s) => s.n > 0);

  const admins = (adminsRes.rows as Row[]).map((r) => ({
    email: String(r.email),
    createdAt: String(r.created_at),
  }));

  const data: AnalyticsData = {
    kpis,
    userGrowth,
    returnFunnel,
    residencyBreakdown,
    formUsage,
    stateDistribution,
    admins,
  };

  return NextResponse.json(data);
}
