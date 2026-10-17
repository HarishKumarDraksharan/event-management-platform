# TSG EVENTS - Event Management Platform

A Docker based foundation for a future event management business platform. This phase includes a placeholder public site, a separate API service, PostgreSQL with Prisma initialization, Nginx routing, and a Vagrant development VM. Company details and portfolio material are intentionally placeholders until supplied.

## Architecture

```text
Windows host browser :8080
          │ Vagrant forwarded port (bound to 127.0.0.1)
Ubuntu VM :80
          │
        Nginx ── / ─────> frontend (Next.js :3000)
          └── /api/ ────> backend (Next.js :3001) ──> PostgreSQL :5432
```

The frontend and backend are independent Next.js App Router applications. Only Nginx publishes a port. PostgreSQL is reachable on the private Docker network and persists data in a named volume. The backend health route runs a Prisma query so it reports database availability as well as API availability.

## Repository structure

```text
Vagrantfile
frontend/             Public Next.js placeholder site and Dockerfile
backend/              Next.js API, Prisma schema/config, and Dockerfile
nginx/nginx.conf       Reverse proxy for / and /api/
compose.yaml           Base service definitions
compose.dev.yaml       Source mounts and hot reload
compose.test.yaml      Separate test PostgreSQL database and volume
.env.example           Safe local development settings
```

## Windows prerequisites

Install VirtualBox, Vagrant, Git, and VS Code/Codex on Windows. Docker Engine, Docker Compose, Node.js, npm, and PostgreSQL are provided or run inside the Ubuntu VM and application containers; no application runtime needs to be installed on Windows. Ensure private address `192.168.56.18` and host port `8080` are available.

## First start

Run these commands in PowerShell from the repository root:

```powershell
vagrant up
vagrant ssh
```

Inside Ubuntu:

```bash
cd /home/vagrant/event-management-platform
docker --version
docker compose version
docker ps
cp .env.example .env
```

The first `vagrant up` installs Docker Engine and the Compose plugin if needed. Provisioning adds `vagrant` to the Docker group. If `docker` reports a permission error after provisioning, exit the VM and reconnect with `vagrant ssh` so the new group membership is applied.

Start the development stack inside Ubuntu:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

Open **http://localhost:8080** in the Windows browser. The dev overlay mounts source code for hot reload. The first build downloads dependencies into containers and may take several minutes.

## Health and logs

In a second Ubuntu SSH session:

```bash
cd /home/vagrant/event-management-platform
curl -i http://localhost/
curl -i http://localhost/api/health
docker compose -f compose.yaml -f compose.dev.yaml ps
docker compose -f compose.yaml -f compose.dev.yaml logs -f nginx frontend backend postgres
```

The frontend responds at `/`. The API health route should return `{"status":"ok","database":"connected"}` with HTTP 200. Nginx returns `/api/health` to the backend without removing the `/api` prefix. Each service has a Docker health check; Nginx waits until both applications report healthy and the backend waits for PostgreSQL to become healthy.

Validate Nginx configuration in the running container:

```bash
docker compose -f compose.yaml -f compose.dev.yaml exec nginx nginx -t
```

## Database and Prisma

PostgreSQL data is stored in the `postgres_data` named volume and survives normal container recreation. Phase 3 adds an `Enquiry` model and an additive migration at `backend/prisma/migrations/20261015000000_add_enquiries`. The migration creates one table and its indexes; it does not alter or remove existing tables or rows.

Before enabling enquiry submissions against an existing database, review the migration and apply it with Prisma's deploy command. This command applies pending committed migrations and does not reset the database:

```bash
docker compose -f compose.yaml -f compose.dev.yaml exec backend npm run db:deploy
```

Regenerate the client after schema changes (the Docker build also generates it):

```bash
docker compose -f compose.yaml -f compose.dev.yaml exec backend npm run db:generate
```

## Gallery image uploads

Administrators can upload JPEG, PNG, and WebP images when creating or editing a gallery entry, hero slide, About Us section, or service. The backend decodes and normalizes each image, keeps it in a generated-name managed directory, and serves it through `/api/uploads/`. Selected-but-unsaved uploads are private to administrators and expire after 24 hours. Replacing an image updates its content record before attempting reference-aware cleanup of the previous managed image; cleanup checks portfolio, hero, service, and About Us references and safely queues files that cannot yet be removed. The Homepage Gallery continues to reference published gallery entries and never owns or deletes their image files.

Uploads are stored in the `gallery_uploads` named volume mounted at `/app/uploads`, separate from source code and container images. Normal Compose recreation preserves it. The default maximum source image size is 10 MiB. Set `MAX_GALLERY_IMAGE_SIZE_BYTES` in the ignored `.env` file to a positive value up to 100 MiB; Nginx allows the corresponding multipart overhead. Back up this volume as persistent customer media. Production deployments currently use local persistent storage; an S3 deployment still requires a configured storage adapter, bucket, access policy, and credentials supplied through the deployment's secret manager.

## Phase 4: administrator access

Authentication runs in the backend with Better Auth and the existing Prisma 7/PostgreSQL database. Passwords use Better Auth's scrypt hashing. The backend stores opaque sessions in PostgreSQL and sends them in `HttpOnly`, `SameSite=Lax` cookies; `Secure` is enabled in production. Session lifetime is 12 hours with periodic refresh. Signup and password reset are not exposed. The Admin plugin supplies server-side role fields, while the public auth route only allows sign-in, sign-out, and current-session checks.

Admin API requests independently verify the database session and the server-controlled `admin` role. The `user` role is the non-admin default and leaves a clear place for customer access in a later phase. The dashboard is available at `/admin`, and login is at `/admin/sign-in`. Enquiries are returned in pages of 20 and only the fields needed for follow-up are selected. The auth API accepts same-origin POST requests, validates email and password input, limits request size, and stores rate-limit counters in PostgreSQL (five sign-in attempts per IP per minute). Nginx supplies the client address used by the limiter; if another proxy is added later, its trusted address handling must be reviewed.

### Configure the auth secret in Ubuntu

Keep `.env.example` as the template and add these two values to the VM's ignored `.env` file. Use the public origin at which the browser opens the site. Generate the secret in the VM; do not paste it into Git, this README, or a browser variable:

```bash
cd /home/vagrant/event-management-platform
openssl rand -base64 48
nano .env
```

Add `BETTER_AUTH_URL=http://localhost:8080` and `BETTER_AUTH_SECRET=<generated value>` to `.env`, save, and restart the development services only when you choose to load the new Compose environment. For production, use the site's HTTPS origin and a separately generated secret. Do not reuse the Docker build-only value.

Apply the additive Phase 4 migration and generate the client from inside the backend container:

```bash
docker compose -f compose.yaml -f compose.dev.yaml exec backend npm run db:deploy
docker compose -f compose.yaml -f compose.dev.yaml exec backend npm run db:generate
```

Create the first administrator interactively. The command prompts twice for a hidden password; it is not placed in shell history or printed. Rerunning it for the same administrator makes no changes. It refuses to promote a pre-existing non-admin account and never resets a password:

```bash
docker compose -f compose.yaml -f compose.dev.yaml exec -it backend npm run auth:bootstrap -- --email admin@example.com --name "TSG Events Admin"
```

If the CLI reports an existing account, stop and verify that it is the intended administrator. Sign in at `http://localhost:8080/admin/sign-in`; use **Sign out** to revoke the active database session. The public site and contact form remain available at the root and `/contact`.

### Authentication and admin checks

Run unit tests and PostgreSQL integration tests against the isolated test Compose project. The test database uses its own named volume and `event_management_test` database; it does not share the development volume:

```bash
docker compose -f compose.yaml -f compose.dev.yaml -f compose.test.yaml run --rm backend sh -lc 'npm run db:generate && npm run db:deploy && npm test'
```

Run backend lint/type-check/build and frontend lint/type-check/test/build using the quality-check commands below. Then verify the browser flow:

1. Visit `/admin` while signed out; it should send you to the sign-in page.
2. Sign in with the bootstrap admin and confirm the dashboard opens.
3. Submit a public enquiry from `/contact`; confirm the dashboard lists it.
4. Sign out, then request `/api/admin/enquiries`; it should return `401`.
5. Sign in with a non-admin account if one is introduced later; the dashboard/API should deny it.

Never test with real customer details in the isolated test database. The Phase 4 admin interface is read-only; it has no delete, export, customer registration, password reset, or user-management interface.

## Quality checks

The frontend and backend each have lint, type-check, test, and production build scripts. Run them in the development containers:

```bash
docker compose -f compose.yaml -f compose.dev.yaml exec frontend npm run lint
docker compose -f compose.yaml -f compose.dev.yaml exec frontend npm run typecheck
docker compose -f compose.yaml -f compose.dev.yaml exec frontend npm test
docker compose -f compose.yaml -f compose.dev.yaml exec frontend env NODE_ENV=production npm run build

docker compose -f compose.yaml -f compose.dev.yaml exec backend npm run db:generate
docker compose -f compose.yaml -f compose.dev.yaml exec backend npm run lint
docker compose -f compose.yaml -f compose.dev.yaml exec backend npm run typecheck
docker compose -f compose.yaml -f compose.dev.yaml exec backend npm test
docker compose -f compose.yaml -f compose.dev.yaml exec backend env NODE_ENV=production npm run build
```

For the backend PostgreSQL integration test, use the isolated test Compose overlay, which sets a separate database and volume:

```bash
docker compose -f compose.yaml -f compose.dev.yaml -f compose.test.yaml run --rm backend sh -lc 'npm run db:generate && npm run db:deploy && npm test'
```

The integration test runs when `TEST_DATABASE_URL` is set; without it, the database-specific test is skipped while unit tests still cover both healthy and failed database probes. The tests do not modify the development database volume.

## Stop and restart

Stop containers and retain database data:

```bash
docker compose -f compose.yaml -f compose.dev.yaml down
```

Start them again with the development command above. To stop the VM, run `exit` and then `vagrant halt` on Windows. `vagrant destroy` removes the VM; it is not needed for normal use. Removing the `postgres_data` volume destroys local database data, so do not use `docker compose down -v` unless you intend to reset it.

## Troubleshooting

- **Docker permission denied:** reconnect to the VM after first provisioning (`exit`, then `vagrant ssh`).
- **Port 8080 is occupied:** stop the Windows process using that port before `vagrant up`; the forwarded port is intentionally bound to loopback only.
- **Address 192.168.56.18 conflicts:** choose an available private IP and update this file and `Vagrantfile` together. Do not use the ShopSphere VM address `192.168.56.17`.
- **Containers are unhealthy:** inspect `docker compose -f compose.yaml -f compose.dev.yaml logs --tail=100 postgres backend frontend nginx`. Wait for the first dependency install/build to finish, then check again.
- **Schema edits do not appear in Prisma:** run the `db:generate` command above and restart the backend container.

## Git workflow

Use feature branches, open a pull request for review, wait for CI checks before merging, and merge validated work to `main`. The `CI/CD` workflow runs separate backend and frontend jobs on pushes to `main`, `development`, and `feature/**`, and on pull requests targeting `main` or `development`. The backend job uses a PostgreSQL service and requires the health integration test to connect; both app jobs install from their committed lockfiles. Only after both pass does CI call the reusable Docker workflow to validate Compose and build the production images tagged with the commit SHA. Images are not pushed and the workflow does not authenticate to AWS.

### Slack CI notifications

The `CI/CD` workflow sends one consolidated Slack Incoming Webhook notification after the backend tests, frontend tests, and reusable Docker image validation finish. It reports success only when all three jobs succeed; failures, skipped required jobs, and cancellations are reported as failure or cancelled. The reusable Docker workflow does not send a separate notification, preventing duplicates. Slack delivery errors do not change the CI result. If the webhook secret is absent, the notification is skipped and the Actions log shows a safe warning. Repository secrets are not exposed to pull requests from forks, so those runs cannot send Slack notifications.

Configure the repository secret in **GitHub → Settings → Secrets and variables → Actions → Repository secrets → New repository secret**. Set its name to `SLACK_WEBHOOK_URL` and paste the Slack Incoming Webhook URL into the secret value field. Do not add the URL to workflow YAML, repository variables, or this README.

To test delivery, push a harmless commit to a branch matching `feature/**` or open a pull request targeting `main` or `development`. After the required jobs finish, confirm one Slack message names the workflow, branch, short commit SHA, trigger, and final status and links to the Actions run. A normal passing run tests success delivery; failure and cancellation messages can be confirmed from corresponding failed or cancelled runs.

### AWS deployment readiness

The `Deploy to AWS` job in the reusable Docker workflow is a fail-closed scaffold, not an active deployment. It is skipped unless the repository variable `AWS_DEPLOYMENT_ENABLED` is explicitly set to `true` on a push to `main`; even then, it stops with an error until deployment steps are implemented. It has no AWS credentials or OIDC permissions, and image publishing remains disabled.

Before enabling production deployment, configure and review all of the following:

- A GitHub `production` environment restricted to `main`, with required reviewers and deployment protection rules.
- AWS authentication through GitHub OIDC and a least-privilege IAM role. Limit permissions to the approved ECR repositories and ECS services; do not store long-lived AWS keys in GitHub secrets.
- ECR repositories for the frontend and backend, with SHA-based image retention and scanning policies.
- An ECS Fargate cluster, task definitions, and services behind the Application Load Balancer, including target-group health checks and appropriate deployment health thresholds.
- A private RDS PostgreSQL instance, network rules, backups, and application database credentials stored in AWS Secrets Manager and injected into ECS tasks.
- A tested rollback procedure, such as ECS deployment circuit-breaker rollback and redeployment of the previous known-good image tags, plus a way to verify application and database health after rollout.

Only add ECR publishing and deployment steps after these resources, authentication permissions, environment approvals, health checks, and rollback behavior have been explicitly configured and approved.

## Phase status

**Phase 1 foundation:** Vagrant, Docker Compose, frontend/backend skeletons, PostgreSQL/Prisma initialization, and Nginx routing.

**Phase 2 quality and CI:** lint, TypeScript checks, unit tests, PostgreSQL health integration, lockfile-based installs, GitHub Actions, Compose validation, and production image builds.

**Phase 3 public website:** responsive TSG EVENTS pages, sample portfolio artwork, and the enquiry API backed by PostgreSQL/Prisma. Apply the committed migration before accepting enquiries in an existing environment.

The portfolio visuals in `frontend/public/images/` are original SVG concept illustrations labelled as sample artwork. They are local, replaceable placeholders; no third-party image URLs, client names, event history, or contact details are presented as real business content.

**Planned later:** authentication/admin (Phase 4); customer portal and quotation workflows (Phase 5); payments and private media (Phase 6); Terraform and AWS (Phase 7). No paid services or AWS resources are configured.
