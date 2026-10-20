# Invoice Maker — iOS, Android & Coolify

One GitHub repository containing a real Expo mobile invoice maker, and one Next.js server that doubles as the public app-download landing page and API health endpoint.

## What works in the mobile app
- Create, edit, duplicate, delete and search invoices
- Business details and customer details
- Multiple line items with quantity and unit price
- Fixed discount, percent tax, automatic totals and four currencies (INR, USD, GBP, EUR)
- Status: Draft, Unpaid, Paid
- Save locally to on-device SQLite (works offline, survives app restarts)
- Generate a PDF and share it from iOS or Android

**Important:** This first version is local-first. Invoices stay on the device, **not** in PostgreSQL. Do not uninstall or clear app data without first exporting PDFs. Account login and encrypted cloud sync will be a separate feature; don't expose any invoice API without authentication.

## Repository

```text
apps/mobile/       Expo + React Native app for Android and iOS
apps/server/       Next.js download page + /api/health + /api/db-health
packages/shared/   Reserved for future shared client/server models
Dockerfile         Coolify build from repository root
```

## Run mobile (Node.js 22.13+)

```bash
git clone https://github.com/gergeant5-sketch/Mobileapp.git
cd Mobileapp
npm install
npm run mobile
```

Open the QR code in Expo Go (check that your installed Expo Go version supports SDK 57), or create an Expo development build. This is a source-code project, not an already-built IPA/APK. For release builds:

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android
npx eas-cli build --platform ios
```

Change the iOS bundle identifier and Android package name in `apps/mobile/app.json` before production release.

## Run Next.js locally

```bash
npm run server
```

The server has a download-only marketing page; links appear only after these environment variables are supplied:

- `NEXT_PUBLIC_APP_STORE_URL` — published App Store listing URL
- `NEXT_PUBLIC_PLAY_STORE_URL` — published Play Store listing URL

`GET /api/health` verifies the HTTP server. `GET /api/db-health` checks the optional PostgreSQL connection, never returns secrets or customer records.

## Deploy with Coolify — 2 resources

**Resource 1 — PostgreSQL:** Create a PostgreSQL database inside your Coolify project. Keep its service private (don't publish the database port externally). Enable persistence and scheduled backups.

**Resource 2 — Application:** Add this *same* GitHub repository. Use **Dockerfile** build pack, **Base Directory: /** (repository root), **Dockerfile Location: /Dockerfile**, **Port: 3000**. Attach your HTTPS domain, e.g. `invoices.example.com`.

In Coolify set server-only environment variable `DATABASE_URL` to your PostgreSQL's **internal** connection string from Coolify. Optionally set the two `NEXT_PUBLIC_` app-store URLs after publishing. No API keys or database passwords should be committed to GitHub.

PostgreSQL is connected only for a health check in v1. It is **not required to use the offline mobile invoice maker**, and no invoice data is transmitted from the phone. Configure authenticated user accounts and authorization before adding server-side invoice storage.

## Check and build

```bash
npm install
npm run typecheck:mobile
npm run typecheck:server
npm run build:server
```

## Safety & invoicing notes

This is a general invoice generator, not a certified tax/compliance system. Verify tax percentages, invoice numbering, GST/VAT requirements and business details for your jurisdiction. Prices are rounded to two decimal places. PDFs and local invoices may contain personal data; protect the phone and share them only with intended recipients.
