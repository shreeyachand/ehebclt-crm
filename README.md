# EHEBCLT CRM

A lightweight CRM for the **East Harlem / El Barrio Community Land Turst** to manage properties, residents, leases, subsidies, and income certifications, built during [hackNY's 2026 Public Interest Lab (PIL)](https://hackny.org/pil-fellow).

Built with **React + Vite (frontend)** and **PocketBase (backend)**, a single binary, SQLite, file-backed, easy to run locally or self-host.

## Alternatives Considered
- **CiviCRM**: Open-source and mission-aligned, but its rigid data models, dated interface, and poor mobile responsiveness demanded more custom development than our ten-week fellowship allowed
- **Yardi**: Powerful for property management, but per-unit pricing and monthly minimums made it an expensive, overly complex choice
- **Twenty**: Highly flexible with low-cost self-hosting, but its enterprise-first architecture didn't map cleanly to EHEBCLT's specific needs

*Exploring and prototyping these tools was an important part of this project: public interest tech is not about the most impressive tech stack, it's about building something that is actually intuitive, usable, and maintainable.*

## Design

### PocketBase
- Single Go binary + SQLite — no separate DB to operate.
- Built-in auth (`users` collection), admin UI at `/_/`, file storage, and REST API.
- Migrations version-controlled in `backend/pb_migrations/` — schema changes apply automatically on restart.
- `pb_public/` serves the built frontend — one service hosts both API + UI, no CORS/proxy needed.
- Hooks in `backend/pb_hooks/` for audit trail and retention.

#### Hooks (`backend/pb_hooks/`)
PocketBase hooks are server-side event listeners — small JS functions that run inside the PocketBase process itself. We built these:

- **`audit_log.pb.js`** — intercepts every `onRecordCreate/Update/Delete` (via `onRecord*Request` + `onRecordAfter*Success`) and writes a row to `_audits` with `action`, `collection_name`, `record_id`, `changes`, and actor (`actor_email`/`actor_id`).
- **`cron.pb.js`** — daily `audit_logs_cleanup` (`0 0 * * *`) deletes `_audits` rows older than `Settings → Logs → Max days`.
- **`auth.pb.js`** — adds `POST /api/_app_auth` (requires a logged-in `users` record) that returns a static superuser token from `PB_SUPERUSER_EMAIL`/`PB_SUPERUSER_PASSWORD` for server-side tasks.

### React + Vite
- `frontend/package.json:12-17` — React 19 + Vite for fast HMR/build, `pocketbase` JS SDK + `chart.js` for dashboard.
- Direct SDK calls (`frontend/src/pb.js`) keep fetching simple: `pb.collection("unit").getFullList()`.

### Docker + Caddy
- `backend/Dockerfile:2-15` builds from official PocketBase release with SHA-256 verification, runs as non-root `pocketbase` user.
- `backend/docker-compose.yml:9-28` — read-only rootfs, `cap_drop: ALL`, `no-new-privileges`, isolated `pocketbase_internal` network. `pb_data` is the only writable volume.
- Caddy fronting port 80/443 for TLS/reverse-proxy in production; PocketBase bound to `127.0.0.1:8090` locally.


## Data Model

Seven collections + `_audits` (auto-generated) and `users` (PocketBase auth). See [docs/data-model.md](docs/data-model.md) for the full schema, fields, and diagram.

- `building` — properties (address, name)
- `unit` — apartments within a building (`building_id`)
- `tenant` — head-of-household (`building_id` shortcut for tenants without an active lease)
- `lease` — links `unit` + `tenant` (rents, dates, status)
- `household_member` — other residents (`head_tenant_id → tenant`)
- `subsidy` / `income_certification` — per-lease programs and compliance

## Repo Structure

```
ehebclt-crm/
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── pb.js           # PocketBase client
│   │   ├── App.jsx         # Sidebar nav
│   │   ├── tabs/           # DashboardTab, PropertiesTab, ResidentsTab, ResidentDetail
│   │   ├── components/
│   │   └── theme.css
│   ├── vite.config.js
│   └── package.json
├── backend/                # PocketBase
│   ├── pb_migrations/      # Versioned schema (JS migrations)
│   ├── pb_hooks/           # audit_log.pb.js, cron.pb.js, auth.pb.js
│   ├── pb_data_sample/     # Sample DB for local dev
│   ├── pb_data/            # Local SQLite data
│   ├── pb_public/          # Static hosting for frontend/dist
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── Caddyfile
│   └── entrypoint.sh
├── docs/
│   └── data-model.md
└── README.md
```

## Local Development

### Prerequisites
- Docker Desktop, Node 18+, npm

### Backend (PocketBase)
```bash
# 1. Copy sample DB (first time only)
cp -r backend/pb_data_sample backend/pb_data

# 2. Configure env (see backend/.env.example if present — set PB_SUPERUSER_* if needed)
# 3. Start
cd backend
docker compose up -d

# API: http://localhost:8090
# Admin UI: http://localhost:8090/_/  (create local superuser on first visit)
```

Migrations in `pb_migrations/` apply automatically on container restart.

### Frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

The frontend connects via `src/pb.js` → `http://localhost:8090`.

### Production build
```bash
cd frontend && npm run build
cp -r dist/* ../backend/pb_public/
cd ../backend && docker compose restart
# App now served at http://localhost:8090
```

## Deployment

We run our prototype on a free **Oracle Cloud** VM (Ubuntu) with Docker + Caddy, deployed via GitHub Actions. Fork the repo to host your own instance.

### One-time VM setup
1. **Fork** this repo.
2. **Provision a VM** — Oracle Free Tier `VM.Standard.E2.1.Micro` (or any Docker host). Open ports `80`/`443`. Install Docker + Docker Compose.
3. **Point a domain at it** — we use `ehebclt.duckdns.org` (`backend/Caddyfile:1`). Update `backend/Caddyfile` in your fork to your domain:
   ```
   your-domain {
       reverse_proxy pocketbase:8090
   }
   ```
   Caddy will auto-provision TLS via Let's Encrypt.
4. **Seed data (first deploy only)** — `scp` your `backend/pb_data` to `~/pocketbase/pb_data` on the VM, or let PocketBase create a fresh DB and create the superuser at `https://your-domain/_/`.

### GitHub Secrets
Add these in **Settings → Secrets and variables → Actions** on your fork:

| Secret | Used in | Purpose |
|---|---|---|
| `REMOTE_HOST` | `deploy.yml:42,53` | VM public IP / hostname |
| `REMOTE_USER` | `deploy.yml:43,54,58` | SSH user (e.g. `ubuntu`) |
| `SSH_PRIVATE_KEY` | `deploy.yml:44,55` | Private key matching `~/.ssh/authorized_keys` on the VM |
| `VITE_PB_URL` | `deploy.yml:32` | Frontend → PocketBase URL (e.g. `https://your-domain`)|

### GitHub Actions

This repo uses a single workflow at `.github/workflows/deploy.yml`. On every push to `main` (or manual run), it builds the frontend and deploys to the Oracle VM, no manual SSH or `docker compose` needed.

## Future Work

- **Resident portal**: a platform where residents can log in and keep track of their own rent payments and lease information. Pocketbase supports scoped permissions for authentication, making this possible without architecture overhaul in the future.
- **PDF uploads**: much of EHEBCLT's is currently a collection of files with data that requires manual entry into the platform. It would be useful if staff could (securely) upload documents and have the relevant fields auto-populate when adding data.

---

<p align="center">Made with ❤️ in NYC</p>