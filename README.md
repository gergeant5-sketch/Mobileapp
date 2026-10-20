# Invoice Maker — iOS, Android & Coolify

One GitHub repository containing a React Native + Expo invoice maker and one Next.js server that doubles as the public app-download landing page and a small API.

## Mobile features
- Create, edit, duplicate, delete, search and filter invoices
- Business and customer details; multiple line items with quantities and prices
- Fixed discount, percentage tax, automatic totals, INR/USD/GBP/EUR
- Draft, Unpaid and Paid status
- Invoices stored on device with SQLite; offline and survive app restarts
- Generate and share a professional invoice PDF on Android or iOS

**Important:** This first release is **offline-first**. Invoices live on the device, **not** in PostgreSQL. Do not uninstall the app or clear its storage without keeping copies of needed PDFs. Login and authenticated PostgreSQL sync can be added in v2. The server does not receive customer or invoice data.

## Structure

```text
apps/mobile/        React Native + Expo iOS and Android
apps/server/        Next.js download site + /api/health + /api/db-health
packages/shared/    Future shared types/schemas
Dockerfile          Coolify server deployment from the monorepo root
.github/workflows/  Manually triggered Android APK build via EAS
```

## Develop on Windows, macOS or Linux

Install Node.js 22.13 or newer.

```bash
git clone https://github.com/gergeant5-sketch/Mobileapp.git
cd Mobileapp
npm install
npm run mobile
```

Expo CLI displays a QR code to try the app on a device using the compatible Expo Go version. Alternatively use an Expo development build. Test and fix the build before store submission.

## Generate an installable APK (Android)

You need an Expo account. In a terminal:

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform android --profile preview
```

The first build may prompt to create/manage your Android signing credentials. EAS uploads the build and returns a downloadable .apk URL. Open it on your Android phone and install it (allow installs from that source as needed).

### GitHub Actions test APK (without an Expo account)

The workflow **Android test APK (Gradle)** is configured to build a standalone Android APK on GitHub's runner and attach it as the `invoice-maker-android-test-apk` artifact if the Gradle build succeeds. Go to **GitHub → Actions → Android test APK (Gradle) → latest successful run → Artifacts**, download the ZIP, extract the APK, and install it on Android. This build uses a non-store test signing configuration; **do not submit it to Google Play** or use it for production updates. The signing identity may change across runners, so you may have to uninstall the previous test APK first (this deletes offline data).

**Optional Expo EAS build:** After linking this Expo project with `eas init` and committing the resulting `extra.eas.projectId` in `app.json`, add a GitHub Actions repository secret named `EXPO_TOKEN` from your Expo account, complete the required credentials setup once interactively, then run the **Build Android APK** workflow manually under GitHub Actions. This uses Expo Cloud, not your Coolify server. The workflow doesn't upload an APK to GitHub itself; the download is provided by Expo.

### Play Store and App Store
The production Android build outputs an AAB for Play Store upload. For iOS run:

```bash
npx eas-cli build --platform ios --profile production
```

Apple signing and an Apple Developer account are required for store distribution. Replace the sample `com.example.invoicemaker` bundle/package IDs in `apps/mobile/app.json` with your chosen globally unique IDs before release.

## Run the download website

```bash
npm run server
```

Set the following Coolify environment variables *after publishing*, so the homepage automatically shows download buttons rather than Coming Soon:
- `APP_STORE_URL`
- `PLAY_STORE_URL`
- `APK_DOWNLOAD_URL` — optional, direct stable URL to an Android APK you have securely hosted (not the temporary Actions artifact page)

## Coolify: exactly two resources

1. **PostgreSQL** resource: private internal connection, persistent disk and scheduled backups. Not used by invoices until we add authenticated cloud sync.
2. **Application** resource: same `gergeant5-sketch/Mobileapp` repository, **Build pack: Dockerfile**, **Base Directory: /**, **Dockerfile location: /Dockerfile**, **Port: 3000**; connect your domain over HTTPS.

Set `DATABASE_URL` on the Coolify Application to PostgreSQL's *internal* connection string. Never put a live database password or Expo token into GitHub code or public mobile config.

`GET /api/health` checks HTTP service, and `GET /api/db-health` checks PostgreSQL access. The latter returns only connected/unavailable; no customer data.

### Testing scripts

```bash
npm install
npm run typecheck:mobile
npm run typecheck:server
npm run build:server
```

## Notes

Not a certified tax invoicing system. Validate business identifiers, tax rules, sequential numbering and jurisdiction-specific GST/VAT requirements before issuing official invoices. Local SQLite data is not encrypted by default. Protect the phone and share PDFs only with the intended recipients.
