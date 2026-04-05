import Link from "next/link";

const features = [
  {
    icon: "📄",
    title: "All Income Types",
    desc: "W-2, 1099-NEC/MISC/DIV/INT/B/R, Schedule C, rental income, investments, retirement, Social Security, and more.",
  },
  {
    icon: "🏛️",
    title: "Federal + State",
    desc: "Full Form 1040 with all schedules, plus CA Form 540, PA Form PA-40, and WA capital gains tax.",
  },
  {
    icon: "🖨️",
    title: "Print-Ready PDFs",
    desc: "Download completed tax forms as print-ready PDFs with step-by-step filing instructions.",
  },
  {
    icon: "📊",
    title: "All Tax Situations",
    desc: "Self-employment, rental properties, capital gains, AMT, NIIT, EITC, child tax credit, education credits, and every edge case.",
  },
  {
    icon: "🔒",
    title: "Private by Default",
    desc: "No account required to start. Your data stays in your browser session.",
  },
  {
    icon: "💰",
    title: "100% Free",
    desc: "No subscription. No hidden fees. Prepare and print your complete tax return at zero cost.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium mb-6">
          <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
          Tax Year 2025 — File by April 15, 2026
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Prepare Your US Taxes
          <br />
          <span className="text-blue-600">Free. Complete. Printable.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Answer questions about your income and deductions. We calculate your
          federal and state taxes, then generate the exact forms you need to
          print and mail — with step-by-step instructions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/prepare"
            className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Start My 2025 Tax Return →
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          No account required. Works for residents and non-residents.
        </p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="border border-gray-100 rounded-xl p-6 bg-gray-50 hover:border-blue-200 transition-colors"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* States */}
      <section className="bg-gray-50 border-t border-gray-100 py-12">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Supported States
          </h2>
          <p className="text-gray-500 mb-8">
            More states coming soon. Federal 1040 works for all 50 states.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {[
              { code: "CA", name: "California", form: "Form 540" },
              { code: "PA", name: "Pennsylvania", form: "Form PA-40" },
              { code: "WA", name: "Washington", form: "No income tax", note: "LTCG applies" },
            ].map((s) => (
              <div key={s.code} className="bg-white border border-gray-200 rounded-xl px-6 py-4 min-w-48">
                <div className="text-2xl font-bold text-blue-600 mb-1">{s.code}</div>
                <div className="font-medium text-gray-900">{s.name}</div>
                <div className="text-sm text-gray-400">{s.form}</div>
                {s.note && <div className="text-xs text-orange-500 mt-1">{s.note}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-xs text-gray-400">
          <p>
            Tax Manager is an open-source tax preparation tool. Always verify your
            return with the latest IRS guidance or a licensed tax professional before
            filing. This tool does not provide legal or financial advice.
          </p>
          <p className="mt-2">Built with Next.js · Hosted on Vercel · Open Source</p>
        </div>
      </footer>
    </div>
  );
}
