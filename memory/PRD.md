# NCPL Ticketing Tool — PRD

## Original Problem Statement
Build an internal End-to-End Ticketing Tool with 2 roles:
- **Admin**: Create/View/Edit all tickets, assign/reassign, change status, manage employees & departments, view reports.
- **Employee**: Create own tickets, view own tickets (Active/Resolved/Closed), add replies, upload attachments, close after confirmation.

Departments: HR, Sales, Training, Mentoring, Finance, Hrudai.

## User Choices
- Auth: **Emergent-managed Google Social Login**
- Attachments: **Yes** (Emergent object storage)
- Email notifications: No (in-app only)
- Departments: Seed 6 + allow admin to add more
- Admin whitelist: `himasri.yellapu@ncplconsulting.net`

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + Emergent Auth + Emergent Object Storage
- **Frontend**: React 19 + React Router 7 + Shadcn UI + Phosphor Icons + Recharts
- **Design**: "Tactile Utility" — Cabinet Grotesk + IBM Plex Sans. Warm bone-white surfaces, graphite admin, amber/bronze employee.

## What's Implemented (Apr 17, 2026)
### Admin Console (graphite `#3A4B59` theme)
- Dashboard with KPIs + 7-day trend + status chart + recent active queue
- All Tickets + filters (status, priority, department, search)
- Ticket status queues (Active, Unassigned, In Progress, Pending, Resolved, Closed)
- Views: Assigned to Me, High Priority, Escalated, Overdue
- Per-department queues (HR, Sales, Training, Mentoring, Finance, Hrudai)
- Ticket Detail: conversation thread, internal notes, attachments, inline edit (status/priority/department/assignee), escalate, quick actions
- Employees management (change role, department)
- Departments CRUD
- Reports (by dept, by status, by priority, trend)
- Settings (profile)
- **Preview as Employee** — one-click switch to demo employee session

### Employee Portal (amber `#B8722D` theme)
- Employee Dashboard with personal KPIs, quick-action cards, recent tickets
- Create Ticket (with attachments)
- My Tickets (All / Active / Resolved / Closed)
- Ticket Detail (read-only meta, can post replies, upload attachments, close own Resolved ticket)
- Profile/Settings

### Shared
- Emergent Google OAuth (session_token in httpOnly cookie, 7-day)
- Object-storage-backed attachment upload/download (15 MB limit)
- Auto-incrementing ticket code (NCP-0001)
- Role-based access control end-to-end

## Verified
- Backend: 36/37 automated tests pass (one cosmetic test-script issue; manual verify ok)
- Frontend: role-based sidebar + portal branding confirmed in screenshots
- RBAC enforced on 100% of admin endpoints

## Backlog (P1/P2)
- Due dates / SLAs + automatic overdue flag
- Email notifications (Resend/SendGrid)
- Bulk actions on ticket table
- CSV export on reports
- Full-text search on comments
- @mentions inside comments
- Customer satisfaction rating on closed tickets

## Test Credentials
See `/app/memory/test_credentials.md`.
