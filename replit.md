# ToolRent Platform — Uzbekistan

## Loyiha haqida
To'liq stekli qurilish asboblari ijarasi platformasi. Rollar: super_admin, shop_owner, worker, customer. UI: O'zbek tilida.

**Admin login**: im_yakuboff98 / wer5459865
**Shop owner**: phone=998901111111 / password123
**Worker**: phone=998902222222 / password123

## 8 ta yangi funksiya (Mar 2026)

### 1. Statistika dashboard (ShopStats.tsx)
- `/shop/stats` — recharts bilan daromad grafigi, asbob holati pie chart, reyting taqsimoti, top asboblar
- Mobile: `stats.tsx` tab (shop_owner uchun)

### 2. Reyting va sharhlar
- `tool_ratings` jadvali mavjud edi; `POST /api/ratings` endpoint mavjud
- Web: `MyRentals.tsx` — qaytarilgan ijara uchun baho berish dialog (1-5 yulduz + izoh)
- Mobile: `my-rentals.tsx` tab'ga baho berish tugmasi qo'shish rejalashtirilgan

### 3. Narx kalkulyator
- `ToolDetails.tsx` — ijara olinishdan oldin kun sonini o'zgartirib narxni ko'rish (ijara + depozit = jami)
- Mobile: `tool/[id].tsx`'ga qo'shish rejalashtirilgan

### 4. Do'kon umumiy profil sahifasi
- `/shops/:id` — ommaviy do'kon profili: asboblar, baholar, filiallar (auth talab qilinmaydi)
- `GET /api/shops/:id/public` endpoint qo'shildi

### 5. Asbob zaxira boshqaruvi
- `tools` jadvaliga `stock_count integer DEFAULT 1` qo'shildi
- `/shop/inventory` — zaxira miqdorini ko'rish va tahrirlash sahifasi
- `PATCH /api/tools/:id/stock` endpoint qo'shildi

### 6. Push bildirishnomalar
- `expo-notifications` + `expo-device` o'rnatildi
- `utils/notifications.ts` — ruxsat so'rash va token olish
- `POST /api/users/push-token` endpoint qo'shildi
- `AuthContext.tsx` — login/register'da avtomatik push token saqlaydi

### 7. Sodiqlik ballari (Loyalty)
- `loyalty_points`, `loyalty_transactions` jadvallar mavjud edi
- Web: `LoyaltyPage.tsx` (184 qator) mavjud edi
- Mobile: yangi `loyalty.tsx` tab — daraja kartasi, progress bar, ball sarflash, liderlar jadvali

### 8. Asbob holati (Before/After)
- `damage-reports.ts` API va `ShopDamageReports.tsx` mavjud edi
- DashboardLayout: Statistika va Zaxira nav elementlari qo'shildi

## GPS Monitoring tizimi (Mar 2026)
- DB: `gps_devices`, `gps_tracking_logs`, `gps_geofences` jadvallar; `tools` jadvalida `gps_device_id`, `gps_enabled`
- API: `POST /api/gps/ping` (GPS hardware → server, autentifikatsiyasiz); `GET /api/gps/monitoring/:shopId`; device CRUD; history; geofence CRUD; `POST /api/gps/simulate`
- Web: `/shop/gps` — OpenStreetMap xarita (react-leaflet), qurilmalar ro'yxati, tarix, geofence, simulyatsiya
- ShopTools.tsx: Asbob qo'shishda ixtiyoriy GPS qurilma ulash tugmasi
- Qo'llab-quvvatlanadigan qurilmalar: TK103, GT06N, TK110, Coban GPS, Concox, Queclink va boshqa GPRS trackerlar
- Onlayn/oflayn holat (5 daqiqa ping bo'lmasa = oflayn), tezlik, batareya monitoring
- Geofence: ruxsat etilgan zona, zonadan chiqsa do'kon egasiga bildirishnoma
- DashboardLayout.tsx: "GPS Monitoring" nav elementi qo'shildi (shop_owner uchun)

## Yangi funksiyalar (Mar 2026)

### Hamyon (Wallet) tizimi
- `wallets` va `wallet_transactions` jadvallar
- API: `GET /api/wallet/me`, `POST /api/wallet/topup`, `POST /api/wallet/topup/confirm`
- `POST /api/wallet/pay`, `POST /api/wallet/deposit-hold`, `POST /api/wallet/deposit-release`
- Click/Payme/Paynet to'lov URL generatsiyasi
- Escrow tizimi: depozit ushlab qolish va qaytarish
- Web: `/wallet` sahifasi (mijoz + do'kon egasi)
- Mobile: Wallet tab (barcode)

### Asbob inventar yaxshilanishi
- `tools` jadvaliga `price_per_hour`, `barcode` ustunlari qo'shildi
- QR kod + Shtrix kod generatsiyasi (qrcode.react + jsbarcode)
- Chop etish (print) va yuklab olish funksiyalari
- Qidruv va filter funksiyalari qo'shildi

### Mobile Wallet tab
- Balans ko'rsatish, escrow ko'rsatish
- Tranzaksiyalar ro'yxati (kirim/chiqim)
- Click/Payme/Paynet orqali to'ldirish
- api.wallet metodlari qo'shildi



## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
