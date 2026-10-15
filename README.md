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
