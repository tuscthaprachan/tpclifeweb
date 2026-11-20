# Moving from Vercel to Plesk

The app runs on the Plesk Node.js extension. Neon stays as the database. Files move from Vercel Blob to the server's disk. GitHub Actions builds the app, so the server needs no SSH and no build step.

## How it works

- Push to `main` → `.github/workflows/deploy-plesk.yml` runs the unit tests, applies migrations to Neon, builds a standalone app and force-pushes it to the `deploy` branch.
- Plesk's Git extension pulls `deploy` into the app folder. `tmp/restart.txt` changes on every deploy, so Passenger restarts the app.
- `.github/workflows/cron-plesk.yml` calls the four nightly jobs (replaces `vercel.json`).
- `STORAGE_DIR` switches file storage to disk. Files are served by `app/files/[...key]/route.ts`: public ones at `/files/<key>`, private ones only with a signed link that expires.
- `SITE_ENV=production` does what `VERCEL_ENV=production` did.

Nothing runs until the GitHub variables below are set, so Vercel keeps working until the switch.

## 1. Collect the secrets

From Vercel (Project → Settings → Environment Variables, Production): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `PII_ENCRYPTION_KEY` (and `PII_ENCRYPTION_KEY_PREVIOUS` if set), `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`.

Sensitive variables cannot be read back. Replace them, except `PII_ENCRYPTION_KEY`:

| Variable | If hidden |
|---|---|
| `DATABASE_URL` | Neon console → Connection details (pooled) |
| `RESEND_API_KEY` | New key in Resend |
| `CRON_SECRET` | `openssl rand -hex 32` (also set it on Vercel) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` (signs everyone out once, passkeys keep working) |
| `PII_ENCRYPTION_KEY` | Cannot be replaced. Find the original before going further |

Also create a Blob read-write token: Vercel → Storage → the Blob store → Settings. It is only needed while copying files.

Make sure the Neon project is owned by a Neon account, not only by the Vercel integration, before deleting anything on Vercel.

## 2. GitHub settings

Settings → Secrets and variables → Actions.

Secrets:
- `DATABASE_URL`: Neon pooled connection string
- `CRON_SECRET`

Variables:
- `SITE_URL`: `https://trytpc.tuso.tu.ac.th`
- `NODE_VERSION`: the major version Plesk runs, e.g. `24`
- `PLESK_DEPLOY`: `true` (turns on the deploy workflow)
- `RUN_MIGRATIONS`: `false` to skip migrations on deploy (optional)
- `PLESK_CRON`: leave unset until the switch

Then run **Actions → Deploy to Plesk → Run workflow** once, and check the `deploy` branch exists.

## 3. Plesk

Subscription: `trytpc.tuso.tu.ac.th`.

1. **File Manager**: create a folder `trytpc-storage` next to `httpdocs`, not inside it. Note its full path (shown at the top of File Manager, e.g. `/var/www/vhosts/trytpc.tuso.tu.ac.th/trytpc-storage`).
2. **Git**: add `https://github.com/tuscthaprachan/tpclifeweb.git` (for a private repo use the SSH URL and add the key Plesk shows as a GitHub deploy key, read-only).
   - Branch: `deploy`
   - Deployment mode: automatic
   - Deployment path: `/trytpc-app` (or any folder outside `httpdocs`)
   - Copy the webhook URL Plesk shows into GitHub → Settings → Webhooks (content type `application/json`, push events).
3. **Node.js**:
   - Node.js version: the same major as `NODE_VERSION`
   - Application root: the deployment path
   - Document root: `<deployment path>/public`
   - Application mode: production
   - Application startup file: `server.js`
   - Do not click "NPM install". The deploy branch already contains `node_modules`.
4. **Environment variables** (Node.js → Custom environment variables):

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SITE_ENV` | `production` |
| `NEXT_PUBLIC_SITE_URL` | `https://trytpc.tuso.tu.ac.th` |
| `BETTER_AUTH_URL` | `https://trytpc.tuso.tu.ac.th` |
| `DATABASE_URL` | Neon pooled connection string |
| `BETTER_AUTH_SECRET` | from step 1 |
| `PII_ENCRYPTION_KEY` | from step 1 |
| `CRON_SECRET` | from step 1 |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | from step 1 |
| `STORAGE_DIR` | full path of `trytpc-storage` |
| `STORAGE_SIGNING_SECRET` | `openssl rand -base64 32` |
| `BLOB_READ_WRITE_TOKEN` | the Blob token, only until files are copied |

5. **Apache & nginx Settings** → Additional nginx directives: `client_max_body_size 6m;`
6. **Enable Node.js**, then **Restart App**.

## 4. Switch over

1. Tell staff not to edit for half an hour.
2. Plesk → DNS Settings for `trytpc.tuso.tu.ac.th`:
   - delete A `216.198.79.1` and A `64.29.17.1`
   - add A `203.131.222.72`
   - add AAAA `2404:140:1056:222::72` only if the subscription has that IPv6 address (Hosting & DNS → Hosting)
   - leave every other record. Do not use "Restore Default"
3. Wait about 5 minutes, then SSL/TLS Certificates → Let's Encrypt for the domain and `www`.
4. Actions → **Copy files from Vercel Blob to Plesk** → Run workflow. It copies in batches, skips files already there, then points open-data download links at `/files/...`. It must end with `Failed: 0`. Pictures are missing until it finishes.
5. Pause the Vercel project, so its own scheduled jobs stop.
6. Set the GitHub variable `PLESK_CRON` to `true`. Run **Scheduled jobs** by hand once for each job and check it succeeds.
7. Check: home page, search, a complaint, lost-property and borrowing submission with their tracking links and emails, staff sign-in with an existing passkey, an image upload in the console, private photos in a case.
8. Remove `BLOB_READ_WRITE_TOKEN` from Plesk.

To go back: restore the two Vercel A records, unpause Vercel, set `PLESK_CRON` to `false`.

## 5. After a week

- Vercel: remove the domain, disconnect Git, delete the Blob store, delete the project.
- Remove `app/api/migration`, `lib/migration`, `.github/workflows/import-blob.yml`, the Vercel Blob code in `lib/storage` and `vercel.json`.
- Back up the `trytpc-storage` folder regularly (Plesk Backup Manager can include it).
