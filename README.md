<div align="center">

# ⚡ Brightloop
### Subscription Management & Recurring Revenue Platform

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2_App_Router-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0_Strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-316192?style=flat-square&logo=postgresql)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22_ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-Modern_UI-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Odoo Compatible](https://img.shields.io/badge/Odoo_ERP-Compatible-714B67?style=flat-square&logo=odoo)](https://www.odoo.com/)

<br />

[🌐 **Live Demo**](http://localhost:3000) • [🎥 **Video Walkthrough**](https://youtu.be/demo-brightloop-preview) • [👥 **Demo Logins**](#-demo-accounts) • [📁 **Folder Structure**](#-folder-structure) • [🛠️ **Tech Stack**](#️-technology-stack)

---

</div>

## 🎥 Product Video & Live Demo

- **Live URL:** [http://localhost:3000](http://localhost:3000)
- **Video Walkthrough:** [https://youtu.be/demo-brightloop-preview](https://youtu.be/demo-brightloop-preview)

---

## 👥 Demo Accounts

Click any **Quick-Fill** button on the [Login Screen](http://localhost:3000/login) or use:

| Role | Email | Password | Access Scope |
|:---|:---|:---|:---|
| **👑 Admin** | `admin@brightloop.io` | `Password123!` | Full ERP control: Staff, Plans, Discounts, MRR Reports, Audit Logs |
| **💼 Staff** | `sarah.staff@brightloop.io` | `Password123!` | Operations: Customer CRM, Quotations, Invoices, Record Payments |
| **🏢 Customer** | `customer@techflow.io` | `Password123!` | Self-service portal: Active contracts, Invoices, PDF Downloads |

> *New customer accounts can also be created via [/register](http://localhost:3000/register).*

---

## 🛠️ Technology Stack

| Layer | Technology | Key Capabilities |
|:---|:---|:---|
| **Core Framework** | Next.js 14.2 (App Router) | Server Components, Streaming SSR, Route Handlers |
| **Language** | TypeScript 5 (Strict) | Compile-time type safety across database & client |
| **Database** | PostgreSQL (Supabase) | Cloud relational storage, connection pooling |
| **ORM** | Prisma v5.22.0 | Type-safe queries, relational migrations, Decimal support |
| **Authentication** | NextAuth.js + bcryptjs | Multi-role session management, 12 salt rounds hashing |
| **Styling & UI** | Tailwind CSS + Lucide Icons | Responsive enterprise dark/light theme tokens |
| **Analytics** | Recharts | Real-time MRR growth, ARR cohort & revenue distribution |
| **Validation** | Zod + React Hook Form | Strict schema validation with instant error feedback |

---

## 📁 Folder Structure

```
Brightloop/
├── prisma/
│   ├── schema.prisma               # Complete database schema (24 models & enums)
│   └── seed.ts                     # Idempotent realistic database seeder
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/              # Sign in with Quick-Fill demo buttons
│   │   │   ├── register/           # Customer registration form
│   │   │   ├── forgot-password/    # Password reset request
│   │   │   └── reset-password/     # Password reset token handler
│   │   ├── admin/                  # Administrative Suite
│   │   │   ├── dashboard/          # Real-time financial KPIs (MRR, ARR, Churn)
│   │   │   ├── customers/          # Customer CRM directory & [id] detail page
│   │   │   ├── products/           # Product catalog & variant price adjustments
│   │   │   ├── plans/              # Daily, Weekly, Monthly & Custom plans
│   │   │   ├── quotations/         # Sales proposals with 1-click subscription convert
│   │   │   ├── subscriptions/      # Contract lifecycle & [id] billing cycle engine
│   │   │   ├── invoices/           # Invoicing ledger & printable PDF view
│   │   │   ├── payments/           # Payment reconciliation & balance allocation
│   │   │   ├── taxes/              # Tax rules and rates management
│   │   │   ├── discounts/          # Percentage & fixed coupon campaigns
│   │   │   ├── reports/            # Executive revenue trend & breakdown charts
│   │   │   ├── staff/              # Staff account provisioning (Admin only)
│   │   │   ├── audit-logs/         # Immutable system audit trail
│   │   │   └── settings/           # System configuration
│   │   ├── staff/                  # Staff Operations Portal
│   │   ├── portal/                 # Customer Self-Service Portal (Invoices, Subscriptions)
│   │   └── api/                    # REST API Route Handlers
│   │       ├── auth/               # NextAuth handlers & password flows
│   │       ├── cron/billing/       # Automated recurring billing engine
│   │       ├── customers/          # Customer CRUD
│   │       ├── products/           # Product & variant operations
│   │       ├── plans/              # Plan management
│   │       ├── quotations/         # Quotations & convert-to-subscription
│   │       ├── subscriptions/      # Subscription lifecycle & status transitions
│   │       ├── invoices/           # Invoice generation & retrieval
│   │       ├── payments/           # Payment allocation with over-payment guards
│   │       └── reports/            # Financial reporting aggregations
│   ├── components/                 # Reusable UI, layout & chart components
│   │   ├── dashboard/              # Recharts visualizations (MRR growth, distribution)
│   │   ├── layout/                 # Sidebar, Header, ThemeToggle, Providers
│   │   └── ui/                     # Badges, modals, cards, empty states
│   ├── lib/
│   │   ├── auth/                   # NextAuth options & RBAC route protection
│   │   ├── billing/                # Automated recurring billing engine
│   │   ├── calculations/           # Exact Decimal financial arithmetic
│   │   ├── validations/            # Zod input schemas
│   │   └── prisma.ts               # Prisma singleton client
│   └── types/                      # TypeScript declarations
├── tests/
│   └── financial.test.ts           # 8 unit tests for financial math & password rules
├── .env.example                    # Environment template
└── README.md
```

---

## ⚡ Important System Highlights

1. **Idempotent Recurring Billing**:
   - Compound key (`sub-[id]-[YYYY-MM-DD]`) prevents duplicate invoice issuance.
   - Handles **Daily**, **Weekly**, **Monthly**, and **Yearly** billing with month-end (Jan 31 ➔ Feb 28) and leap-year rules.

2. **Zero-Float Financial Math**:
   - Uses `Prisma.Decimal` everywhere. Floating-point rounding errors are strictly eliminated.
   - Historical invoice prices are locked snapshots; modifying product prices never alters past invoices.

3. **Over-Payment Prevention**:
   - Payments exceeding an invoice's remaining balance are rejected at the database level.

4. **1-Click Quotation Conversion**:
   - Converts approved quotations (`Draft ➔ Sent ➔ Confirmed`) into active contracts and generates the initial billing cycle in a single transaction.

5. **Security & Auditability**:
   - bcryptjs hashing (12 salt rounds), strict password complexity, and immutable audit logs for every state change.

---

## 🚀 Quick Start

### 1. Configure `.env`
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-32-char-secret"
DATABASE_URL="postgresql://postgres.[USER]:[PASS]@[HOST]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[USER]:[PASS]@[HOST]:5432/postgres"
CRON_SECRET="brightloop-cron-authorization-secret-token"
```

### 2. Sync Database & Seed Data
```bash
npx prisma db push
npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed.ts
```

### 3. Run Dev Server & Tests
```bash
# Start server
npm run dev

# Run unit tests
npx ts-node --compiler-options '{"module":"commonjs"}' tests/financial.test.ts
```

---

## 🔌 Key API Endpoints

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `POST` | `/api/cron/billing` | Bearer Token / Admin | Run recurring billing cycle |
| `POST` | `/api/quotations/[id]/convert` | Admin, Staff | Convert quotation to active subscription |
| `POST` | `/api/subscriptions/[id]/status`| Admin, Staff | Contract action (`PAUSE`, `RESUME`, `CLOSE`, `RENEW`) |
| `POST` | `/api/payments` | Admin, Staff | Record payment with balance check |
| `GET`  | `/api/reports` | Admin, Staff | Fetch live MRR, ARR & revenue metrics |

---

<div align="center">

### 🟣 Engineered for Enterprise ERP & Odoo Ecosystems

*Built with the design elegance of **Linear**, the financial precision of **Stripe Billing**, and the operational depth of **Odoo Enterprise Subscriptions**.*

*Architected to seamlessly integrate with **Odoo ERP pipelines**, multi-tier product variants, automated recurring invoicing, and corporate audit ledgers.*

<br />

**Brightloop Software Inc.** • Enterprise Subscription Infrastructure

</div>
