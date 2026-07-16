# EHEBCLT CRM Dashboard

A full-stack CRM dashboard built with **React + PocketBase**, designed for managing buildings, units, tenants, leases, subsidies, household members, and income certifications.

This README explains how to install, run, deploy, and understand the entire system.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Backend Setup (PocketBase)](#2-backend-setup-pocketbase)
3. [Authentication](#3-authentication)
4. [PocketBase Collections](#4-pocketbase-collections)
5. [Frontend Setup (React + Vite)](#5-frontend-setup-react--vite)
6. [How the Frontend Connects to PocketBase](#6-how-the-frontend-connects-to-pocketbase)
7. [Data Fetching Pattern](#7-data-fetching-pattern)
8. [Buildings Tab](#8-buildings-tab)
9. [Extras Tab (Expiring Leases)](#9-extras-tab-expiring-leases)
10. [Deployment Using pb_public](#10-deployment-using-pb_public)
11. [Understanding pb_public](#11-understanding-pb_public)
12. [Useful Development Commands](#12-useful-development-commands)
13. [Summary](#13-summary)

---

## 1. Project Structure

```
frontend/
  src/
    pb.js
    main.jsx
    App.jsx
    components/
    tabs/
    theme.css
  public/

backend/
  pocketbase/
    pb_data/
    pb_public/
    docker-compose.yml
```

---

## 2. Backend Setup (PocketBase)

### Run PocketBase using Docker

```bash
cd backend/pocketbase
docker compose up -d
```

PocketBase will be available at:

```
http://localhost:8090
```

### Run PocketBase manually

Download PocketBase from:

https://pocketbase.io

Then run:

```bash
./pocketbase serve
```

---

## 3. Authentication

The frontend logs in as a PocketBase superuser to access all collections.

In `main.jsx`:

```jsx
import pb from "./pb";

pb.admins
  .authWithPassword("YOUR_EMAIL", "YOUR_PASSWORD")
  .then(() => console.log("Superuser logged in"))
  .catch(err => console.error("Failed to login:", err));
```

This prevents `403 Forbidden` errors and allows full CRUD access.

---

## 4. PocketBase Collections

The project's actual collection names:

```
building
tenant
unit
household_member
lease
subsidy
income_certification
```

Use these exact names in the frontend:

```js
pb.collection("unit")
pb.collection("tenant")
pb.collection("building")
pb.collection("lease")
pb.collection("subsidy")
pb.collection("household_member")
pb.collection("income_certification")
```

---

## 5. Frontend Setup (React + Vite)

Install dependencies:

```bash
cd frontend
npm install
```

Run the development server:

```bash
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

## 6. How the Frontend Connects to PocketBase

The connection is defined in `pb.js`:

```js
import PocketBase from "pocketbase";

const pb = new PocketBase("http://localhost:8090");

export default pb;
```

The frontend communicates directly with PocketBase's REST API. No proxy or CORS configuration is required.

---

## 7. Data Fetching Pattern

Each tab loads data using the same basic pattern:

```jsx
useEffect(() => {
  async function load() {
    const records = await pb.collection("unit").getFullList();
    setUnits(records);
  }
  load();
}, []);
```

This:

- Fetches all records from a collection
- Stores them in React state
- Renders them in the UI

---

## 8. Buildings Tab

Fetches and displays building names:

```js
pb.collection("building").getFullList()
```

---

## 9. Extras Tab (Expiring Leases)

Fetches leases:

```js
pb.collection("lease").getFullList()
```

Filters leases expiring within 30 days:

```js
new Date(l.end_date) - new Date() <= 30 * 24 * 60 * 60 * 1000
```

Displays full lease details for anything matching the filter.

---

## 10. Deployment Using pb_public

PocketBase can host the React app directly, so you don't need a separate web server.

### Build the React app

```bash
npm run build
```

This creates a `dist/` folder containing the production build.

### Copy build files into pb_public

```bash
cp -r dist/* backend/pocketbase/pb_public/
```

### Restart PocketBase

```bash
docker compose down
docker compose up -d
```

### Access the deployed app

```
http://localhost:8090
```

PocketBase now serves both:

- The backend API
- The React frontend

---

## 11. Understanding pb_public

PocketBase includes a built-in static file hosting system. The folder responsible for this is `pb_public/`.

This directory is served directly at the root of your PocketBase server. Anything placed inside `pb_public` becomes available at:

```
http://localhost:8090/<filename>
```

### What pb_public Is For

`pb_public` is used to host **static frontend files**, such as:

- HTML
- CSS
- JavaScript bundles
- Images
- Fonts
- Your React build output

PocketBase does **not** run React. Instead, it serves the compiled React app the same way an Nginx or Apache server would.

### Why pb_public Matters for Deployment

When you run `npm run build`, Vite generates a production-ready version of your React app inside `dist/`.

To deploy your frontend, you copy the contents of `dist/` into `pb_public/`:

```bash
cp -r dist/* backend/pocketbase/pb_public/
```

After restarting PocketBase, your entire CRM dashboard becomes available at `http://localhost:8090`.

### How the Frontend Connects to the Backend After Deployment

Even though the React app is now hosted inside PocketBase, it still connects to the API using the same URL:

```js
const pb = new PocketBase("http://localhost:8090");
```

This works because:

- The frontend is served from PocketBase
- The backend API is also PocketBase
- Both share the same domain and port
- No CORS configuration is required
- No reverse proxy is needed

---

## 12. Useful Development Commands

List all collections:

```js
pb.collections.getFullList().then(cs => cs.map(c => c.name))
```

Fetch records from a collection:

```js
await pb.collection("unit").getFullList()
```

Inspect the PocketBase client in the browser console:

```js
window.pb
```

---

## 13. Summary

- PocketBase provides the backend, authentication, and static hosting.
- React provides the CRM dashboard UI.
- The frontend logs in as a superuser for full access.
- `pb_public` is PocketBase's static hosting folder — the React build gets copied there for deployment.
- Deployment is a single step: build the React app, copy it into `pb_public`, restart PocketBase.
- The frontend and backend share the same URL after deployment, so no CORS or proxy setup is needed.
- The system is lightweight, fast, and easy to maintain.