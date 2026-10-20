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

## Automatic Android APK publishing (recommended)

**No manual reupload after changes.** When source files under `apps/mobile/` are pushed to `main`, GitHub Actions builds an Android test APK and uploads it to the existing `preview-latest` GitHub Release. The APK is available at the same stable URL each time:

```
https://github.com/gergeant5-sketch/Mobileapp/releases/download/preview-latest/Invoice-Maker.apk
```

The Next.js download page points to that URL automatically. The URL starts working after the initial successful publish. App downloads do not consume your VPS bandwidth or disk. No Coolify persistent storage or APK upload is needed; the existing mount may remain unused. If you prefer a different hosting source later, you can override it with `APK_DOWNLOAD_URL` in Coolify.

**Testing limitation:** The current GitHub Actions Android preview build may use a different signing key each run. As a result, a new APK may not install as an update over the previous one, and uninstalling the old app deletes locally stored invoices. For repeatable in-place upgrades and customer releases, configure a stable private Android signing key (and use a proper production build) before publishing. Do not upload the current test APK to Google Play.

## Run the download website

```bash
npm run server
```

Set `APP_STORE_URL` and `PLAY_STORE_URL` once the official store listings are ready. The Android **Test APK** button uses the automated GitHub Release by default. `APK_DOWNLOAD_URL` is an optional override.

## Optional: Host the Android APK on your OWN Coolify server

This method is **optional** if you want the APK bytes on your VPS rather than hosted by GitHub Releases. The Next.js API route `/api/download/android` streams an APK from persistent storage, but you would need to automate copying new builds to the server separately. The recommended workflow above avoids that work.

1. On your **Ubuntu VPS host**, create a folder that survives deployments:

   ```bash
   sudo mkdir -p /opt/invoice-maker/apk
   sudo chmod 755 /opt/invoice-maker/apk
   ```

2. Transfer the existing test APK from your Windows PC with **WinSCP (SFTP)** or `scp` to the VPS. If you log in with a normal (non-root) account, upload to your home directory and move it with `sudo`:

   ```bash
   sudo mv ~/Invoice-Maker.apk /opt/invoice-maker/apk/Invoice-Maker.apk
   sudo chmod 644 /opt/invoice-maker/apk/Invoice-Maker.apk
   ```

   The **filename is case-sensitive** and must match `Invoice-Maker.apk`. Do not upload the ZIP; extract the APK first.

3. In **Coolify → Project → mobile app → Persistent Storage**, add a **directory bind mount**:
   - Source (host): `/opt/invoice-maker/apk`
   - Destination (container): `/data/apk`

   Use a **host directory bind mount**, not an anonymous Docker volume. Save and **Deploy** (recreate the container for the mount to take effect).

4. Verify the file exists in the app container using **Coolify → Terminal**:

   ```bash
   ls -lh /data/apk/Invoice-Maker.apk
   ```

5. Visit `https://YOUR-DOMAIN/api/download/android` to download from your server. To make the homepage use this option instead of GitHub Releases, set `APK_DOWNLOAD_URL=/api/download/android` in Coolify and redeploy.

To upload a new version of the APK, replace the existing `/opt/invoice-maker/apk/Invoice-Maker.apk` host file. App data is not stored there. Test APKs can have different signing keys; do not treat them as stable production releases. Configure a trusted HTTPS domain before sharing the direct link.

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
