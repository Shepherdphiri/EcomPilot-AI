# Railway Deployment Workflow — EcomPilot SaaS

## 1. Provision Services on Railway
1. Create a Railway project and attach **Managed Redis** (`REDIS_URL` auto-injected).
2. Connect the GitHub repository and create two services from `/mvp`:
   - `ecompilot-api` (HTTP service on port 3000, healthcheck `/health`)
   - `ecompilot-worker` (BullMQ cron & async worker running `npm run worker --workspace=apps/api_node`)

## 2. Configure Production Secrets
Set the following environment variables in Railway Shared Variables:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_ENTERPRISE`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`, `EMAIL_FROM`
- `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`
- `SENTRY_DSN`, `CREDENTIALS_ENCRYPTION_KEY`

## 3. Automated GitHub Actions -> Railway Deploy
On push to `main`:
1. GitHub Actions runs `npm run typecheck`, `vitest run`, `flutter analyze`, and `supabase db push --dry-run`.
2. Applies pending SQL migrations (`0001` -> `0003`) to production Supabase.
3. Triggers `railway up --service ecompilot-api` and `railway up --service ecompilot-worker` with zero-downtime healthcheck cutover.
4. Verifies `GET https://api.ecompilot.ai/health` returns `200 OK` and sends release marker to Sentry.
