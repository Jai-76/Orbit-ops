# OrbitOps

A polished multi-tenant HR operations dashboard starter with role-aware workspace navigation, responsive UI, and an invitation flow.

## Included
- Tenant switcher for Northstar Labs
- Admin navigation and role/profile context
- Headcount, payroll, time-off and satisfaction KPIs
- Responsive dashboard with SVG chart and activity feed
- Interactive quick actions, modal invitation flow, toast feedback
- Docker + Compose for production-style container delivery
- GitHub Actions CI/CD: syntax checks, image build and GHCR publish

## Feature ideas to include
These are the ideas that make OrbitOps feel more like a real operations platform:

- Employee management with profiles, departments, roles, locations, and status badges
- Request workflow for leave, reimbursements, equipment, and shift changes
- Payroll dashboard with monthly payouts, deductions, bonuses, and export support
- Office and location tracking using map search and team distribution by city or country
- Notifications and reminders for approvals, deadlines, and important updates
- Audit trail and governance records for employee and system actions
- Reporting center for headcount, payroll, performance, and workspace summaries
- Integrations with Google Workspace, Slack, Notion, calendar tools, and CRM systems
- Role-based access control for owner, admin, manager, and employee views
- Multi-tenant workspace settings with secure, isolated data boundaries

### Recommended roadmap
1. Add employee directory and profile editing
2. Add leave and approval request screens
3. Add payroll and spending summaries
4. Add map-based office and location tracking
5. Add admin auth, RBAC, and audit logs

## Run locally
```bash
npm start
# open http://localhost:4173
```

## Run with Docker
```bash
docker compose up --build
# open http://localhost:4173
```

## API
The app now includes a working tenant-scoped REST API backed by `db.json`. It is free to run locally or self-host; there are no paid external API dependencies for the core app. An optional Google Maps Places integration is included; Google requires its own API key and billing account for live place data.

- `GET /api/health`
- `GET /api/tenants`
- `GET /api/dashboard`
- `GET /api/employees`
- `POST /api/employees` with `{ "name", "email", "department", "role" }`
- `PATCH /api/employees/:id`
- `DELETE /api/employees/:id`
- `GET /api/requests`
- `POST /api/requests`
- `PATCH /api/requests/:id` with `{ "status": "approved" | "rejected" | "pending" }`
- `GET /api/payroll`
- `GET /api/activity`
- `POST /api/reports`
- `POST /api/auth/login` (demo password: `demo`)
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/members`
- `GET /api/billing`
- `GET /api/audit`
- `POST /api/webhooks`
- `GET /api/maps/search?query=Tokyo offices`

### Google Maps setup
1. Create a Google Maps Platform project.
2. Enable Places API (New).
3. Create a server-side API key and restrict it to Places API.
4. Put it in `.env` as `GOOGLE_MAPS_API_KEY=...`.
5. Restart the server.

The key stays on the backend. The frontend only calls `/api/maps/search`, and results include place name, address, coordinates, and a Google Maps URL.

An OpenAPI 3 definition is included in `openapi.json`, and environment variables are documented in `.env.example`. Use the `X-Tenant-Id` header to switch tenants. The dashboard and all primary actions call these endpoints rather than using only mock UI state. The JSON store is intentionally simple for the prototype; swap it for Postgres with the same route contract for production.

## Cloud deployment
The workflow publishes an image to GitHub Container Registry on every push to `main`. Deploy that image to any container service (Cloud Run, ECS/Fargate, Azure Container Apps, Fly.io, or Kubernetes), set `PORT=4173`, and expose the container port 4173.

For a production API, replace the mocked interactions with an authenticated service using tenant-scoped claims. Recommended authorization model:
- `owner`: billing, workspace settings, member management
- `admin`: member management and reports
- `manager`: team data and approvals
- `member`: self-service profile and requests

Every data query should scope by `tenant_id` from a verified session, never from client input.
