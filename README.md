# ARMS — Archive Reports Management System

Production-oriented Vercel + PostgreSQL deployment of the supplied ARMS interface. The archive starts empty; no demo projects, boxes, dossiers, notifications, users, or audit records are seeded.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Vercel Serverless Functions (`/api/auth`, `/api/state`, `/api/users`)
- Database: PostgreSQL (Supabase or any Postgres)
- Authentication: individual accounts, salted scrypt password hashes, signed HttpOnly session cookies
- Persistence: normalized PostgreSQL tables for boxes, dossiers, projects, uploads, notifications, audit logs and users; atomic SQL synchronization with optimistic revision checks

## 1. Create PostgreSQL database
Create a Supabase (or any PostgreSQL) database and run `scripts/schema.sql` once in its SQL Editor. It creates normalized empty archive tables, the user table, a revision row and the atomic save function. It does not create demo data. If reusing an earlier test database and you explicitly want to erase all existing ARMS rows and user accounts, run `scripts/reset-demo-data.sql` once (destructive).

## 2. Configure Vercel environment variables
Set all three variables for the required environments:
- `DATABASE_URL`: PostgreSQL connection string. On Supabase use Project Settings → Database → Connection string → **Transaction pooler** (port 6543), with your database password filled in.
- `ARMS_SESSION_SECRET`: random secret of at least 32 characters. Generate with `openssl rand -base64 48`.
- `ARMS_SETUP_SECRET`: a separate one-time bootstrap key. Generate with `openssl rand -base64 36`. Do not share it with normal users.

Never commit real secrets or `.env.local`.

## 3. Deploy
1. Push the project root to GitHub.
2. Import the repository in Vercel.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy after configuring the environment variables.

## 4. First administrator setup
On first visit, the application displays the initial setup screen. Enter the `ARMS_SETUP_SECRET`, administrator name, username, and a password of at least 12 characters. This creates the first System Admin. Initial setup is one-time; after the first account exists, the setup endpoint rejects further bootstrap attempts. Normal users sign in with their individual credentials.

## Important operational limitations
- User management is connected to PostgreSQL. New accounts receive an initial password of at least 12 characters; users can change their own password from Profile.
- The archive import engine uses fixed ranges: D42 = 35500–35799, D43 = 35800–36099, then +300 per box. D41 is not generated. Re-uploads preserve existing imported status and placement. If the Excel sheet has no Archive column, new rows safely default to Pending rather than being marked archived.
- The browser still sends the current full archive state on writes; the database function synchronizes records into normalized tables and rejects stale revisions. Very large data volumes require paginated reads and domain-specific write endpoints.
- Data Entry and Viewer are currently read-only at the API boundary; assign Archive Manager only to users authorized to change archive records.
- Verify import rules, archive flags, label output, box closing and delivery workflows against a copy of real data before operational use.

## Data policy
The database is initialized empty. Upload the real project Excel file after the administrator has signed in. Existing browser-local demo snapshots are not migrated.
