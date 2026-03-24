# GetHelp.uz — Qurilish Asboblari Ijarasi Platformasi

## Loyiha haqida
Qurilish asboblarini ijaraga berish va boshqarish uchun O'zbekistonga mo'ljallangan yaxlit platforma. pnpm monorepo strukturasi.

## Arxitektura
- **API Server**: Node.js/Express, port 8080 (`artifacts/api-server`)
- **Web App**: React/Vite, port 5000 (`artifacts/web-app`)
- **Mobile App**: Expo (`artifacts/mobile-app`)
- **Prezentatsiya**: React/Vite, port 24227 (`artifacts/gethelp-presentation`) — 18 slaydli startup pitch
- **DB**: PostgreSQL (Drizzle ORM + raw SQL via `db.$client.query()`)

## Foydalanuvchi rollari
- `customer` — asbob ijaraga oluvchi mijoz (`/home` ga yo'naltiriladi)
- `shop_owner` — do'kon egasi (`/shop`)
- `worker` — hodim (`/worker`)
- `super_admin` — platforma administratori (`/admin`)

## To'lov tizimlari (To'liq integratsiya)
Barcha to'lov tizimlarini sozlash: `/admin/payment-settings`

| Provayder | Webhook URL | Hujjatlar |
|-----------|-------------|-----------|
| **Click** | `POST /api/pay/click/prepare` + `/api/pay/click/complete` | https://docs.click.uz |
| **Payme** | `POST /api/pay/payme` (JSON-RPC) | https://developer.help.paycom.uz |
| **Paynet** | `POST /api/pay/paynet/check` + `/api/pay/paynet/notify` | https://paynet.uz |
| **Uzum Bank** | `POST /api/pay/uzum/notify` + `/api/pay/uzum/create` | https://developers.uzum.uz |

`payment_settings` jadvali server ishga tushganda avtomatik yaratiladi (click, payme, paynet, uzum standart qatorlar bilan).

## SMS tizimi
- **SMS provayderlar**: Eskiz, PlayMobile, SMSC, Infobip, Twilio, Vonage
- **SMS paket rejalari**: Boshlang'ich (100 SMS), Professional (500 SMS), Biznes (2000 SMS)
- **Do'kon SMS obunalari**: Har bir do'konga paket ulash/o'chirish
- `sms_packages` + `shop_sms_subscriptions` jadvallar avtomatik yaratiladi

## Muhim fayllar
| Fayl | Maqsad |
|------|--------|
| `artifacts/api-server/src/app.ts` | CORS (Replit domenlarini qo'llab-quvvatlaydi) |
| `artifacts/api-server/src/routes/index.ts` | Barcha routerlar ro'yxati |
| `artifacts/api-server/src/routes/payment-settings.ts` | To'lov sozlamalari + `payment_settings` jadval yaratish |
| `artifacts/api-server/src/routes/payment-webhooks.ts` | Click/Payme/Paynet/Uzum webhook handlerlari |
| `artifacts/api-server/src/routes/wallet.ts` | Hamyon — to'ldirish (Click, Payme, Paynet, Uzum) |
| `artifacts/api-server/src/routes/sms.ts` | SMS provayder + paket boshqaruvi |
| `artifacts/web-app/src/App.tsx` | Barcha marshrutlar (routing) |
| `artifacts/web-app/src/pages/admin/AdminPaymentSettings.tsx` | Admin to'lov integratsiyasi sahifasi |
| `artifacts/web-app/src/pages/admin/AdminSms.tsx` | Admin SMS boshqaruvi (tabs: Do'konlarga SMS, Paketlar, ...) |
| `artifacts/web-app/src/pages/wallet/Wallet.tsx` | Hamyon sahifasi (4 provayder) |
| `artifacts/web-app/src/pages/customer/CustomerDashboard.tsx` | Mijoz bosh sahifasi |
| `artifacts/web-app/src/pages/customer/BrowseTools.tsx` | Asboblar katalogi |
| `artifacts/web-app/src/components/layout/DashboardLayout.tsx` | Sidebar navigatsiya |

## DB sxema yondashuvi
- **Drizzle ORM** asosiy jadvallar uchun (users, shops, tools, rentals, payments, ...)
- **Raw SQL** (`db.$client.query()`) qo'shimcha jadvallar uchun
- `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` — xavfsiz migratsiya

## Muhim konfiguratsiya
- `JWT_SECRET` — Replit env secret sifatida saqlangan
- `PORT=8080` — API server port
- CORS: localhost portlar + barcha `*.replit.dev`, `*.repl.co`, `*.replit.app` domenlar

## To'lov tizimi qanday ishlaydi
1. Foydalanuvchi `POST /api/wallet/topup` ga so'rov yuboradi (provider, amount)
2. Server `wallet_transactions` jadvalida pending tranzaksiya yaratadi
3. To'lov URL qaytariladi (har provayder o'z formatida)
4. Foydalanuvchi to'lov sahifasiga o'tadi
5. To'lov amalga oshganda provayder webhook URL ga POST yuboradi
6. Webhook handler `confirmWalletTopup()` ni chaqiradi — balans yangilanadi
