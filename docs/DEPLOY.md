# Deploying Posterboy

Production runs as a single-origin container on **Google Cloud Run**: one
FastAPI process serves the API and the built Vite frontend from the same
domain, so the browser never makes a cross-origin request and the session
cookie stays a plain `SameSite=Lax` first-party cookie.

`.github/workflows/deploy.yml` builds and rolls this out on every push to
`main`. Everything below is one-time setup.

## What you need first

- A Google Cloud project with billing enabled (Cloud Run scales to zero, so
  an idle app costs nothing, but the project still needs a billing account).
- A Postgres database. Cloud Run has no built-in one — [Neon][neon] and
  [Supabase][supabase] both have a free tier that works. Take the connection
  string and make sure it ends in `?sslmode=require`.
- The `gcloud` CLI, authenticated: `gcloud auth login`.

[neon]: https://neon.tech
[supabase]: https://supabase.com

## 1. Project, APIs, and image registry

```bash
export PROJECT_ID=your-project-id
export REGION=us-central1

gcloud config set project "$PROJECT_ID"

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com

# Where the workflow pushes the built image.
gcloud artifacts repositories create posterboy \
  --repository-format=docker \
  --location="$REGION"
```

## 2. Runtime configuration

The four sensitive values live in Secret Manager; the workflow wires them into
the container as environment variables. The non-secret ones
(`COOKIE_SECURE`, `COOKIE_SAMESITE`, `FRONTEND_URL`, `SPOTIFY_REDIRECT_URI`)
are set by the workflow itself, so they are not listed here.

```bash
for s in spotify-client-id spotify-client-secret session-secret database-url; do
  gcloud secrets create "$s" --replication-policy=automatic
done

# Then put a value in each (repeat per secret):
printf '%s' 'your-spotify-client-id'  | gcloud secrets versions add spotify-client-id  --data-file=-
printf '%s' 'your-spotify-secret'     | gcloud secrets versions add spotify-client-secret --data-file=-
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets versions add session-secret     --data-file=-
printf '%s' 'postgresql://...?sslmode=require' | gcloud secrets versions add database-url --data-file=-
```

Let the Cloud Run runtime service account read them:

```bash
export PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

for s in spotify-client-id spotify-client-secret session-secret database-url; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role=roles/secretmanager.secretAccessor
done
```

## 3. Let GitHub Actions deploy, without a stored key

Workload Identity Federation lets the workflow exchange its short-lived GitHub
OIDC token for Google credentials, so no service-account JSON file is ever
stored in the repo.

```bash
export DEPLOY_SA="github-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions deployer"

for role in roles/run.admin roles/artifactregistry.writer roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOY_SA}" --role="$role"
done

gcloud iam workload-identity-pools create github \
  --location=global --display-name="GitHub Actions"

# The attribute condition is what stops any other repo on GitHub from
# authenticating as this service account. Do not remove it.
gcloud iam workload-identity-pools providers create-oidc github \
  --location=global \
  --workload-identity-pool=github \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository == 'rkolan-alt/Posterboy'"

gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/rkolan-alt/Posterboy"
```

## 4. Tell the repo about it

Under **Settings → Secrets and variables → Actions**:

*Variables* tab:

| Name | Value |
|---|---|
| `GCP_PROJECT_ID` | your project id |
| `GCP_REGION` | `us-central1` (or whichever you used) |

*Secrets* tab:

| Name | Value |
|---|---|
| `GCP_SERVICE_ACCOUNT` | `github-deployer@<project-id>.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<project-number>/locations/global/workloadIdentityPools/github/providers/github` |

Print the provider string with:

```bash
echo "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/providers/github"
```

## 5. First deploy

Push to `main` (or run the workflow manually from the Actions tab).

`FRONTEND_URL` and `SPOTIFY_REDIRECT_URI` have to point at the service's own
URL, which does not exist until the service does. The workflow handles the
chicken-and-egg itself: the first run deploys with a placeholder, reads back
the real `*.run.app` URL, then patches it in — so the first push produces two
revisions. Later runs reuse the existing URL and produce one.

The run summary prints the URL. **Add `<url>/api/auth/callback` to your Spotify
app's redirect URI allowlist** in the [Spotify developer dashboard][dash], or
login will fail with `INVALID_CLIENT`.

[dash]: https://developer.spotify.com/dashboard

## Notes

- **Chromium.** The poster renderer drives headless Chromium via Playwright,
  which is why the service asks for 2Gi and the gen2 execution environment —
  gen2 sizes `/dev/shm` to the memory limit, while the gen1 64MB default
  crashes the renderer on larger posters.
- **Cold starts.** `min-instances` is 0, so an idle app costs nothing but the
  first request after a quiet spell pays for pulling a fairly large image. Set
  `--min-instances 1` in the workflow if you would rather keep it warm.
- **Schema.** `app/main.py` runs `Base.metadata.create_all()` at import, so the
  container will not start if `DATABASE_URL` is unreachable. There is no
  migration step in the deploy; Alembic is in `requirements.txt` but unused.
- **Rollback.** `gcloud run services update-traffic posterboy --region=$REGION
  --to-revisions=<previous>=100`. Images are tagged with the commit SHA.
