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

### 3. Access the Dashboard & Create an Admin
Frontend API Endpoint: http://localhost:8090

Admin Dashboard: http://localhost:8090/_/

>💡 First Time Logging In? Because the sample database has been scrubbed of admin credentials, navigating to the Admin Dashboard link above will immediately prompt you to create your own local superuser account.

### 4. Database Migrations
The database schema is version-controlled inside the pb_migrations/ folder. Whenever you pull down new changes from GitHub, PocketBase will automatically apply any new schema updates upon container restart.