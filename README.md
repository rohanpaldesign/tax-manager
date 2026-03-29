# Tax Manager

Free, open-source US income tax preparation tool for tax year 2025.

Covers federal Form 1040 (all schedules) plus California (Form 540), Pennsylvania (PA-40), and Washington state. Generates a print-ready PDF with filing instructions.

## Features

- **All income types** — W-2, 1099-NEC/MISC/DIV/INT/B/R, Schedule C (self-employment), Schedule E (rental), capital gains, Social Security, foreign income
- **Full deduction analysis** — automatically compares standard vs. itemized, QBI (Section 199A), SALT cap, mortgage interest
- **All credits** — EITC, Child Tax Credit, education credits (AOC + LLC), child care, foreign tax, retirement saver's
- **Edge cases** — AMT, NIIT (3.8%), Additional Medicare Tax (0.9%), passive activity loss rules, SE tax, IRA deductibility phase-outs
- **Print-ready PDF** — summary tax return with all calculations, filing instructions, and mailing addresses
- **No account required** — session-based, anonymous by default

## Tech Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Database | Turso (SQLite, free tier) — optional |
| PDF | pdf-lib |
| Validation | Zod |
| Hosting | Vercel (free tier) |

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Turso (optional)

The app runs in **stateless mode** without a database. Tax calculations and PDF generation work fully; returns just aren't persisted between sessions.

To enable persistence:

1. Create a free account at [turso.tech](https://turso.tech)
2. Create a database: `turso db create tax-manager`
3. Get credentials:
   ```bash
   turso db show tax-manager --url
   turso db tokens create tax-manager
   ```
4. Fill in `.env.local`:
   ```env
   TURSO_DATABASE_URL=libsql://your-db.turso.io
   TURSO_AUTH_TOKEN=your-token-here
   ```

Schema is created automatically on first request.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Set environment variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
4. Deploy

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── prepare/page.tsx          # Multi-step tax wizard
│   └── api/
│       ├── returns/              # POST/GET tax returns
│       │   └── [id]/             # GET/PUT/DELETE individual return
│       └── pdf/                  # POST → generate PDF (no DB needed)
├── components/forms/
│   ├── StepPersonalInfo.tsx      # Filing status, name, address
│   ├── StepIncome.tsx            # W-2, 1099s, Schedule C, rental, foreign
│   ├── StepDeductions.tsx        # SALT, mortgage, charitable, retirement
│   ├── StepCredits.tsx           # Dependents, education, energy credits
│   ├── StepReview.tsx            # Review before calculating
│   └── ResultsDashboard.tsx      # Results + PDF download
├── lib/
│   ├── tax-engine/
│   │   ├── federal/              # Form 1040 + 2025 IRS constants
│   │   ├── states/ca/            # CA Form 540
│   │   ├── states/pa/            # PA Form PA-40
│   │   └── states/wa/            # WA LTCG + Working Families Credit
│   ├── db/                       # Turso client (lazy init) + CRUD
│   ├── pdf/                      # PDF generator
│   └── validation.ts             # Zod input schemas
└── types/tax.ts                  # TypeScript types for all tax forms
```

## 2025 Key Constants

| | Single | MFJ | HOH |
|---|---|---|---|
| Standard Deduction | $15,000 | $30,000 | $22,500 |
| Top bracket (37%) starts | $626,350 | $751,600 | $626,350 |
| LTCG 0% threshold | $48,350 | $96,700 | $64,750 |
| AMT Exemption | $88,100 | $137,000 | $88,100 |
| SS Wage Base | $176,100 | — | — |
| SALT Cap | $10,000 ($5,000 MFS) | — | — |
| IRA Limit | $7,000 ($8,000 age 50+) | — | — |
| Business mileage | $0.70/mile | — | — |

## Supported States (v0.1)

| State | Form | Notes |
|---|---|---|
| California | Form 540 | Up to 13.3%; no SALT cap; no HSA deduction |
| Pennsylvania | Form PA-40 | Flat 3.07%; retirement income largely exempt |
| Washington | N/A | No income tax; LTCG 7% over $270k; WFTC |

## Known Limitations (v0.1)

- IRS 2025 fillable PDFs not yet available — output is a formatted summary
- Kiddie Tax (Form 8615) not yet implemented
- Premium Tax Credit (Form 8962) not yet implemented
- Passive loss carryforwards not tracked across years

## Disclaimer

For informational purposes only. Not tax, legal, or financial advice. Verify with IRS guidance or a licensed tax professional before filing.
