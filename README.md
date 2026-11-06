# ClassNest Offline

An installable B.Pharm class-management app for Android and Windows. It runs on GitHub Pages without ChatGPT, Supabase, Firebase, a hosted database, or online user accounts.

## Features

- Daily attendance with unsaved-change protection.
- Student directory, search, filters and roster import.
- Notes and local file attachments up to 10 MB each.
- Marks, assignments, student responses and class notices.
- Staff lesson plans with dates, objectives, teaching activities and assessments.
- Manual absence messages opened in a phone's SMS app.
- Full-device backups and individual student exports, including permitted attachments.

## How data works

Records and files are stored in IndexedDB in the browser on each device. The repository and published website contain application code only. No student data is bundled.

Staff and student views are local display modes, **not authenticated accounts or a security boundary**. Use a separate browser profile or device for private staff records. Student export files exclude other students' information and staff lesson plans. A staff backup contains all locally saved records and files.

Devices do not sync automatically. Export a backup to transfer data. Each copy can then change independently. Clearing browser/site data, using an ephemeral private window, or browser storage removal can erase the device copy. Export backups regularly and keep a copy outside the browser.

The app works offline after the first successful visit has downloaded the application files. Installing it does not create an Android APK or Windows EXE; it uses the browser's installable web-app feature.

## Open or install

Published URL: `https://dr-nandhakumar.github.io/classnest/`

Android: open in Chrome, then use the menu's **Install app / Add to Home screen** action.

Windows: open in Edge or Chrome, then choose **Install this site as an app**.

## First use

1. Choose **Staff workspace** and create a class, or import a private ClassNest backup.
2. Use **Backup / restore** to download full backups, transfer data, or export one student's file.
3. A student imports their individual file and uses **Student view**. Staff can also preview student views on their own device.
4. Parent messages require a parent contact and the per-student message-preparation option. Save an absence, open **Parent messages**, and choose **Open SMS** on a phone. Review and send it in the SMS app. The app cannot send automatically or verify delivery.

## Development and deployment

Node.js 22.13 or later:

```sh
npm ci
npm test
npm run build
npm run dev
```

Set `VITE_BASE_PATH=/classnest/` for this repository. The default matches that path. Use `/` for a root domain. The build generates the service worker's precache from the actual output assets.

In GitHub Settings → Pages, select **GitHub Actions** as the deployment source. The included workflow tests, builds and publishes `dist/` on pushes to `main`.

Keep backups, ERP workbooks, student exports, passwords and private keys out of this repository. No backend configuration or secrets are required.
