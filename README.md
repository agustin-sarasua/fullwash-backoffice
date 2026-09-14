# FullWash Backoffice

Admin web app for managing machines, clients and push campaigns. Expo + react-native-web,
exported as a static site.

It talks to the admin API in `fullwash-backend` (`/admin/*`). It is web-only by design —
there is no native build, and no code is shared with `fullwash-app`, which is Flutter.

## Running it

```bash
npm install
cp .env.example .env     # then fill in the Firebase web config
npm start                # http://localhost:8081, against APP_ENV=local
```

Point at a deployed backend instead:

```bash
APP_ENV=staging npm start     # api-sbx.fullwash.uy
```

`npm run typecheck` · `npm test` · `npm run build` (static export to `dist/`).

## Two things are needed before it can sign anyone in

**1. A Firebase Web app.** Only iOS and Android are registered in the `full-wash`
project today. Register a Web app in the Firebase console and copy its config into
`.env`. Those values are not secrets — they identify the project, they don't grant
access. Access is the `admin` custom claim, which the backend verifies on every request.

**2. An admin account.** No account has the claim yet. From `fullwash-backend`:

```bash
export FIREBASE_SECRET="$(aws secretsmanager get-secret-value \
    --secret-id staging/firebase-service-account --profile fullwash \
    --query SecretString --output text)"
poetry run python scripts/grant_admin.py --email you@fullwash.uy
```

The account must already exist — sign in through the mobile app once first. **Then sign
out and back in here**: custom claims only appear in a token minted after they were
granted, so without a fresh token the new admin gets a 403 and reasonably assumes the
grant failed. This app forces a refresh on login for exactly that reason, but an already
open session still needs to re-authenticate.

## Layout

```
app/                     expo-router; (auth) and (admin) groups
src/api/                 client.ts (auth, timeouts, errors), endpoints.ts, types.ts
src/api/query.ts         pure helpers, unit tested in plain node
src/auth/                Firebase web SDK + the admin-claim gate
src/components/          Table, Modal, and the ui.tsx primitives
src/theme.ts             design tokens
src/format.ts            es-UY dates, currency, relative times
```

The API client is the only place that knows about auth, timeouts and error shapes. It
reads both `detail` and `message` from error bodies, because the backend returns
`{"detail": …}` for `HTTPException` and `{"message": …}` for its own `BusinessException`,
and the Flutter app depends on both shapes staying as they are.

## Things worth knowing

- **Revenue per machine is an estimate.** Token purchases happen in the app's checkout,
  with no machine attached, so per-machine figures are derived from consumption at list
  price. The bulk discount ladder puts realised revenue up to 15% lower.
- **A client's location is inferred**, not declared: it's the site where they washed most
  in the last 90 days. Clients who have only used machines with no site assigned have no
  home site, which is why assigning machines to sites matters for segmentation.
- **Granting tokens is audited.** Amount, reason and the granting admin are recorded. The
  form sends an idempotency key per opening, so a double-click credits once.
- **Audience previews are advisory.** The segment is resolved again at send time.

## Deploying

`npm run build` produces `dist/`, which is synced to S3 and served by CloudFront. The
distribution rewrites 404s to `/index.html` so client-side routes like `/clients/abc`
resolve on a hard refresh.

The backend must allow this origin: `ALLOWED_ORIGINS` on the ECS task, or the
per-environment defaults in `fullwash-backend/app/config.py`.
