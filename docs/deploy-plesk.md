# Deploying to Plesk

The app runs on the Plesk Node.js extension. Neon is the database. Files are stored on the server's disk. GitHub Actions builds the app, so the server needs no SSH and no build step.

## How it works

- Push to `main` → `.github/workflows/deploy-plesk.yml` runs the unit tests, applies migrations to Neon (unless the `RUN_MIGRATIONS` variable is `false`), builds a standalone app and force-pushes it to the `deploy` branch.
- Plesk's Git extension pulls `deploy` into the app folder. `tmp/restart.txt` changes on every deploy, so Passenger restarts the app.
- `server.js` on the deploy branch is `scripts/plesk-server.js`; Next's own server is `next-server.js`. Next keeps pages it regenerates at runtime in `.next/server/route-cache/`. The deploy branch does not contain that folder, so Plesk never clears it, and pages from older builds (linking CSS and JS that no longer exist, so they show up unstyled) would outlive every deploy. When a new build starts, the wrapper empties `route-cache` and Next's data cache (`.next/cache/fetch-cache`), and deletes prerendered pages in `.next/server/app` that lack the current build ID. Next renders them again. A plain restart (idle shutdown, Restart App) keeps the caches.
- Content written through the admin console expires its own caches. Content written straight to the database shows up after the next deploy, or otherwise when the cache window passes: about a minute for alerts and the shuttle panel, up to a day for other content.
- `.github/workflows/cron-plesk.yml` (Scheduled jobs) calls the four nightly jobs. Their schedule for the admin "Scheduled jobs" health page is `lib/admin/health/cron-jobs.ts`, which a unit test keeps in step with the workflow.
- `STORAGE_DIR` is the file storage folder (required). Files are served by `app/files/[...key]/route.ts`: public ones at `/files/<key>`, private ones only with a signed link that expires.
- `SITE_ENV=production` marks the live site.

## 1. Collect the secrets

You need: `DATABASE_URL`, `AUTH_ALLOWED_EMAIL_DOMAINS`, `BETTER_AUTH_SECRET`, `PII_ENCRYPTION_KEY` (and `PII_ENCRYPTION_KEY_PREVIOUS` if set), `CRON_SECRET`, `EMAIL_REPLY_TO` and `RESEND_API_KEY` (see Email below).

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Neon console → Connection details (pooled) |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` (changing it signs everyone out once; passkeys keep working) |
| `PII_ENCRYPTION_KEY` | Cannot be replaced: data encrypted with a lost key cannot be recovered. Keep a copy somewhere safe |

## 2. GitHub settings

Settings → Secrets and variables → Actions.

Secrets:
- `DATABASE_URL`: Neon pooled connection string
- `CRON_SECRET`

Variables:
- `SITE_URL`: `https://trytpc.tuso.tu.ac.th`
- `PLESK_DEPLOY`: `true` (turns on the deploy workflow)
- `RUN_MIGRATIONS`: `false` to skip migrations on deploy (optional)
- `PLESK_CRON`: `true` (turns on the Scheduled jobs workflow)

Then run **Actions → Deploy to Plesk → Run workflow** once, and check the `deploy` branch exists. `CRON_SECRET` is sent as a Bearer token by the Scheduled jobs workflow, so it must match the value in Plesk.

## 3. Plesk

Subscription: `trytpc.tuso.tu.ac.th`.

1. **File Manager**: create a folder `trytpc-storage` next to `httpdocs`, not inside it. Note its full path (shown at the top of File Manager, e.g. `/var/www/vhosts/trytpc.tuso.tu.ac.th/trytpc-storage`).
2. **Git**: add `https://github.com/tuscthaprachan/tpclifeweb.git` (for a private repo use the SSH URL and add the key Plesk shows as a GitHub deploy key, read-only).
   - Branch: `deploy`
   - Deployment mode: automatic
   - Deployment path: `/trytpc-app` (or any folder outside `httpdocs`)
   - Copy the webhook URL Plesk shows into GitHub → Settings → Webhooks (content type `application/json`, push events).
3. **Node.js**:
   - Node.js version: 22 or later. CI builds on Node 24; the app needs 22+ at runtime (better-auth's `kysely`), so 20 does not work. On 20 Nov 2026 Plesk offered 23.11.1 and 20.20.2, so use 23
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
| `AUTH_ALLOWED_EMAIL_DOMAINS` | comma-separated list of allowed email domains |
| `BETTER_AUTH_SECRET` | from step 1 |
| `PII_ENCRYPTION_KEY` | from step 1 |
| `CRON_SECRET` | from step 1 (the same value as the GitHub secret) |
| `RESEND_API_KEY` | Resend API key, sending access to `notify.trytpc.tuso.tu.ac.th` (see Email below) |
| `EMAIL_FROM` | `TryTPC <no-reply@notify.trytpc.tuso.tu.ac.th>` |
| `EMAIL_REPLY_TO` | optional reply-to address |
| `STORAGE_DIR` | full path of `trytpc-storage` |
| `STORAGE_SIGNING_SECRET` | `openssl rand -base64 32` |

5. **Apache & nginx Settings** → Additional nginx directives: `client_max_body_size 6m;`
6. **Enable Node.js**, then **Restart App**.

## Email

Mail goes out through the Resend HTTPS API from `notify.trytpc.tuso.tu.ac.th`, a subdomain verified in Resend (its DKIM key at `resend._domainkey.notify…`, and the `send.notify…` MX and SPF records for bounces). DMARC is strict (`adkim=s`), so `EMAIL_FROM` must be exactly on `notify.trytpc.tuso.tu.ac.th`.

The Plesk mail service cannot deliver on its own: the university network blocks outbound SMTP from this server (checked 21 Nov 2026: ports 25, 465, 587 and 2525 to Microsoft 365, Gmail, mail.tu.ac.th and Resend all time out; HTTPS works). The SMTP sender is kept in the code. If IT opens port 25 or provides a relay (then set it under Mail → Smarthost and add it to SPF), remove `RESEND_API_KEY`, set `SMTP_HOST=localhost`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASSWORD` (mailbox `no-reply@trytpc.tuso.tu.ac.th`) and `EMAIL_FROM=TryTPC <no-reply@trytpc.tuso.tu.ac.th>`. Plesk signs that domain with DKIM. When both are set, Resend is used.

1. In Resend, keep `notify.trytpc.tuso.tu.ac.th` verified and create an API key with sending access to it.
2. Set `RESEND_API_KEY` (as a secret) and `EMAIL_FROM` in step 3.4 (Environment variables) and restart the app.
3. Send a staff invite to a Gmail address and to an Outlook or TU address. In each, open the original message and check SPF, DKIM and DMARC all say `pass` and that it did not land in spam. The health page (`/admin/health`) shows whether email is configured, not whether it was delivered.

## 4. DNS and certificate

1. Plesk → DNS Settings for `trytpc.tuso.tu.ac.th`: A `203.131.222.72`, plus AAAA `2404:140:1056:222::72` only if the subscription has that IPv6 address (Hosting & DNS → Hosting). Do not use "Restore Default".
2. SSL/TLS Certificates → Let's Encrypt for the domain and `www`.
3. Run **Scheduled jobs** by hand once for each job and check it succeeds.

## 5. Checks after a change to the setup

Home page, search, a complaint, lost-property and borrowing submission with their tracking links and emails, staff sign-in with an existing passkey, an image upload in the console, private photos in a case.

## 6. Backups

Back up the `trytpc-storage` folder regularly (Plesk Backup Manager can include it).
