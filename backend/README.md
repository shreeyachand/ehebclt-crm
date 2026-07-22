# ehebclt-crm

## 🚀 Quick Start (Local Backend Setup)

This project uses **PocketBase** running inside Docker for the backend. Follow these steps to spin up your local instance with the pre-configured data models and sample data.

### Prerequisites
Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 1. Initialize the Database
Before running Docker, clone the sample database folder so you have a local working copy:
```bash
cp -r pb_data_sample pb_data
```
### 2. Start the Server
Spin up the PocketBase container using Docker Compose:

```bash
docker compose up -d
```

By default, this builds a local PocketBase image from the official release binary (`POCKETBASE_VERSION=0.31.0`), and you can override the version with an environment variable when needed.

### 3. Access the Dashboard & Create an Admin
Frontend API Endpoint: http://localhost:8090

Admin Dashboard: http://localhost:8090/_/

>💡 First Time Logging In? Because the sample database has been scrubbed of admin credentials, navigating to the Admin Dashboard link above will immediately prompt you to create your own local superuser account.

## Security

The container runs with a defense-in-depth posture:

- **First-party container build** — the image is built from the official PocketBase release binary, not from a third-party image or registry.
- **Read-only filesystem** — the container rootfs is read-only. Only `pb_data` is writable (for the SQLite database); `pb_migrations` and `pb_hooks` are mounted read-only.
- **No Linux capabilities** — `cap_drop: ALL` removes every capability.
- **No new privileges** — `no-new-privileges:true` blocks privilege escalation via `setuid`/`setgid` binaries.
- **Non-root user** — PocketBase runs as the `pocketbase` user, not root, limiting the blast radius of a container breakout.
- **TODO: custom seccomp profile** — add a seccomp profile to block dangerous syscalls like `mount`, `ptrace`, `bpf`, `unshare` (see `seccomp.json` branch history for a starting point). It can be hardened as needed. 
- **Internal network** — the service is isolated on a bridge network with no external access.

### 4. Database Migrations
The database schema is version-controlled inside the pb_migrations/ folder. Whenever you pull down new changes from GitHub, PocketBase will automatically apply any new schema updates upon container restart.