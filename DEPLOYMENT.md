# ARMS deployment checklist

## PostgreSQL bootstrap
- [ ] Create a PostgreSQL database (Supabase transaction pooler or any Postgres).
- [ ] Run `scripts/schema.sql` once. It creates empty normalized tables, foreign keys, indexes, the atomic `arms_save_state` function and login throttling table. No demo data is inserted.
- [ ] Generate `ARMS_SESSION_SECRET` (at least 32 characters). `ARMS_SETUP_SECRET` is only needed when you omit the environment-admin variables. Set `ARMS_ADMIN_USERNAME` and `ARMS_ADMIN_PASSWORD` to bootstrap the first administrator automatically.

## Vercel environment
Set these variables for Production and Preview as appropriate:
- `DATABASE_URL`
- `ARMS_SESSION_SECRET`
- `ARMS_SETUP_SECRET` (only needed if you are not using the environment-admin bootstrap)
- `ARMS_ADMIN_USERNAME` (set to `admin`)
- `ARMS_ADMIN_PASSWORD` (set to `admin123` as requested; change it immediately after the first login)
- `ARMS_ADMIN_NAME` (optional; defaults to `System Administrator`)

Do not use `VITE_` prefixes for secrets. Never commit real credentials.

## Vercel build
- [ ] Import the repository root.
- [ ] Framework preset: Vite.
- [ ] Build command: `npm run build`.
- [ ] Output directory: `dist`.
- [ ] Deploy and open the application.
- [ ] On an empty database, confirm the environment-configured admin is created automatically. Sign in with the configured username/password. If environment-admin variables are omitted, use the one-time setup flow instead.
- [ ] Create individual user accounts from User Management and issue their initial passwords securely.

## Operational acceptance tests
- [ ] Confirm the database starts with zero boxes, dossiers, projects and normal user accounts.
- [ ] Import a small approved Excel batch; confirm D42 maps only to 35500–35799.
- [ ] Confirm D43 maps only to 35800–36099 and cannot be created before D42.
- [ ] Confirm archive flags map to Archived / Pending and missing archive columns default safely to Pending.
- [ ] Re-upload the same file and confirm existing project status and placement are not overwritten.
- [ ] Test duplicate usernames, inactive users, wrong passwords, password change and logout.
- [ ] Open two sessions and verify a stale revision receives a conflict rather than silently overwriting newer work.
- [ ] Print and physically verify box/dossier labels with the actual Zebra printer before bulk operations.

## Known scope boundary
The browser currently sends the full archive state when saving. PostgreSQL stores records in separate relational tables and synchronizes them atomically, but the client still loads the whole archive into memory. Loading is split into small parallel requests (`/api/state?part=core|projects|audit`) so no single request can hit the Vercel timeout or the 4.5 MB response limit. For very large archives, implement paginated queries and dedicated import/status/delivery endpoints before company-wide high-volume operation. Data Entry and Viewer are read-only at this stage; assign Archive Manager only to users who may change archive data.


## Environment administrator bootstrap
`ARMS_ADMIN_USERNAME` and `ARMS_ADMIN_PASSWORD` are read only by the server. When the configured username does not already exist, the first authentication request creates one active `System Admin` account (even if other user accounts already exist). Its password is scrypt-hashed before it is stored in PostgreSQL. If that username already exists, environment variables do not reset its password or change its role. To change the password later, sign in and use the account password-change screen. The requested initial password `admin123` is temporary and weak; replace it immediately after first login with a unique password of at least 12 characters.
