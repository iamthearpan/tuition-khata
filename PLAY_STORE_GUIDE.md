# Tuition Khata (টিউশন খাতা) — Play Store guide

**Package name:** `com.tuitionkhata.app` (checked on Play Store: no existing app uses it, 404 on 7 Nov 2026 — it is only truly yours once you upload your first release, so do that soon).

## 1. Before you publish — replace placeholders
- `docs/index.html`, `docs/privacy.html`: replace `YOUR_EMAIL@example.com` and `YOUR NAME / BUSINESS NAME`.
- Host the `docs/` folder (GitHub Pages: repo → Settings → Pages → `/docs`). Then set the real URL in `src/screens/SettingsScreen.tsx` (`PRIVACY_URL`) and paste the privacy URL into Play Console.

## 2. Create a release key (once, keep it safe — losing it = can't update the app)
```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore tuitionkhata-release.keystore -alias tuitionkhata -keyalg RSA -keysize 2048 -validity 10000
```
Create `android/keystore.properties` (git-ignored):
```
storeFile=tuitionkhata-release.keystore
storePassword=YOUR_PASSWORD
keyAlias=tuitionkhata
keyPassword=YOUR_PASSWORD
```
Play Console → enable **Play App Signing** when uploading.

## 3. Build the upload bundle
```bash
cd android && ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```
Bump `versionCode` in `android/app/build.gradle` for every new upload.

## 4. Store listing
- **App name:** Tuition Khata – Fee Tracker
- **Short description (80):** Track tuition fees & dues of your students. Offline, ₹ INR, Bengali.
- **Full description:**
  Tuition Khata (টিউশন খাতা) is a simple fee register for private tutors and coaching teachers. Add students and batches, set monthly fees, record payments and instantly see who owes what.
  • Indian Rupee (₹) first, with lakh grouping — plus USD, EUR, GBP, AED, BDT and more
  • Month-wise ledger, part payments and advance payments
  • Batches with default fees
  • One-tap WhatsApp / SMS fee reminders
  • Bengali and English
  • 100% offline SQLite storage — no sign-up, no ads, no internet needed
- **Category:** Education (or Business) · **Tags:** tuition, fee tracker, tutor
- **Assets:** icon `store-assets/logo.png` (512×512), feature graphic `store-assets/feature-graphic.png` (1024×500). Phone screenshots (min 2) — take from the running app.

## 4a. Data safety form (Play Console)
- Does your app collect or share any required user data types? **No**
- (All data is stored on-device only; the release build has no INTERNET permission.)
- Ads: **No** · Target audience: 18+ (tutors) · App access: all features available without login.

## 5. Content rating & policy
Fill the IARC questionnaire (no violence, no user-generated content shared, no purchases). New personal developer accounts must run a **closed test with 12+ testers for 14 days** before production access.
