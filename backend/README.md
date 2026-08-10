# NUSWORD Encore.dev Backend

Backend untuk NUSWORD yang dibangun dengan [Encore.dev](https://encore.dev) — framework backend TypeScript untuk cloud-native applications.

## Struktur

```
backend/
├── encore.app              # Konfigurasi Encore app
├── package.json            # Dependencies
├── tsconfig.json
├── encore.d.ts             # Type shims untuk Encore virtual modules
├── shared/
│   ├── types.ts            # Shared DTO types (match frontend)
│   └── permissions.ts      # RBAC permissions
└── services/
    ├── auth/               # Auth service (JWT + bcrypt)
    │   ├── auth.ts         # Service definition + JWT helpers
    │   ├── signup.ts       # POST /auth/signup
    │   ├── login.ts        # POST /auth/login
    │   ├── logout.ts       # POST /auth/logout
    │   ├── me.ts           # GET /auth/me
    │   ├── validate.ts     # GET /auth/validate
    │   └── migrations/
    │       ├── 1_create_users.sql
    │       └── 2_create_revoked_tokens.sql
    ├── documents/          # Document service
    │   ├── documents.ts
    │   ├── crud.ts         # GET/POST/PATCH/DELETE /documents
    │   ├── versions.ts     # Version history
    │   ├── shares.ts       # Document sharing
    │   ├── export.ts       # PDF/DOCX/HTML export
    │   └── migrations/
    ├── books/              # Book service
    │   ├── books.ts
    │   ├── crud.ts
    │   ├── chapters.ts
    │   ├── toc.ts
    │   └── migrations/
    ├── organizations/      # Organization + RBAC
    │   ├── organizations.ts
    │   ├── crud.ts
    │   ├── members.ts
    │   └── migrations/
    ├── templates/          # Template marketplace
    │   ├── templates.ts
    │   ├── crud.ts
    │   ├── use.ts
    │   └── migrations/
    └── usage/              # Usage stats
        ├── usage.ts
        ├── stats.ts
        └── migrations/
```

## Setup

### Prerequisites
- [Node.js](https://nodejs.org/) 20+
- [Encore CLI](https://encore.dev/docs/ts/install): `curl -L https://encore.dev/install.sh | bash`

### Running locally

1. **Install Encore CLI** (if not already):
   ```bash
   curl -L https://encore.dev/install.sh | bash
   ```

2. **Set the JWT secret** (Encore secrets):
   ```bash
   cd backend
   encore secret set --local JWT_SECRET
   # Paste a random string (e.g. from: openssl rand -hex 32)
   ```

3. **Start the Encore backend**:
   ```bash
   cd backend
   encore run
   ```
   Encore akan:
   - Auto-provision PostgreSQL databases untuk setiap service
   - Run SQL migrations
   - Start the API server di `http://localhost:4000`
   - Show API docs di `http://localhost:9400` (Encore dashboard)

4. **Connect the frontend**:
   Di `.env` file root project:
   ```bash
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
   ```
   Restart Next.js dev server: `bun run dev`

5. **Test the auth flow**:
   - Buka http://localhost:3000/signup
   - Daftar dengan email + password
   - Anda akan diarahkan ke /app dengan JWT token tersimpan di localStorage

### Production deployment

1. **Deploy to Encore Cloud**:
   ```bash
   cd backend
   encore deploy
   ```
   Encore akan deploy ke `https://nusword-[env].encr.app`

2. **Set production secrets**:
   ```bash
   encore secret set JWT_SECRET  # production secret
   ```

3. **Update frontend env**:
   ```bash
   NEXT_PUBLIC_API_BASE_URL=https://nusword-prd.encr.app
   ```

## Architecture

### Services
Setiap service punya database PostgreSQL sendiri (Encore auto-provisions). Cross-service communication via Encore RPC (type-safe, tidak perlu HTTP calls).

| Service | Database | Responsibility |
|---|---|---|
| `auth` | `auth` | User registration, login, JWT, session validation |
| `documents` | `documents` | Document CRUD, versions, shares, export |
| `books` | `books` | Book CRUD, chapters, TOC |
| `organizations` | `organizations` | Org management, members, RBAC |
| `templates` | `templates` | Template marketplace |
| `usage` | `usage` | Usage stats, event logging |

### Auth
- **JWT tokens** (HS256, 7-day expiry) — tidak butuh session storage
- **bcrypt** password hashing (10 rounds)
- **Token revocation** — revoked tokens stored in `revoked_tokens` table
- **Encore auth handler** — semua authenticated endpoints validated via `~encore/auth`

### Database
- PostgreSQL (auto-provisioned by Encore)
- Each service has its own database with SQL migrations
- Cross-service references (e.g. `document.organization_id`) are NOT FK-constrained (each service owns its DB)
- Data integrity enforced at application layer

### API Endpoints
Semua endpoints mirror the Next.js API routes untuk compatibility:

```
POST   /auth/signup              — register
POST   /auth/login               — login
POST   /auth/logout              — logout
GET    /auth/me                  — current user

GET    /documents                — list documents
POST   /documents                — create document
GET    /documents/:id            — get document
PATCH  /documents/:id            — update (autosave)
DELETE /documents/:id            — soft delete
GET    /documents/:id/versions   — list versions
POST   /documents/:id/versions   — create version
PUT    /documents/:id/versions   — restore version
GET    /documents/:id/shares     — list shares
POST   /documents/:id/shares     — share document
PATCH  /documents/:id/shares/:shareId  — update role
DELETE /documents/:id/shares/:shareId  — revoke
POST   /documents/:id/export     — create export job
GET    /documents/:id/export     — list export jobs
GET    /export-jobs/:id/download — download artifact

GET    /books                    — list books
POST   /books                    — create book
GET    /books/:id                — get book
PATCH  /books/:id                — update
DELETE /books/:id                — delete
GET    /books/:id/chapters       — list chapters
POST   /books/:id/chapters       — create chapter
PUT    /books/:id/chapters       — reorder chapters
PATCH  /books/:id/chapters/:chapterId  — update chapter
DELETE /books/:id/chapters/:chapterId  — delete chapter
GET    /books/:id/toc            — generate TOC

GET    /organizations            — list orgs
POST   /organizations            — create org
GET    /organizations/:id        — get org
PATCH  /organizations/:id        — update
DELETE /organizations/:id        — delete
GET    /organizations/:id/members     — list members
POST   /organizations/:id/members     — invite
PATCH  /organizations/:id/members/:memberId  — change role
DELETE /organizations/:id/members/:memberId  — remove

GET    /templates                — list published templates
POST   /templates                — create template
GET    /templates/:id            — get template
PATCH  /templates/:id            — update
DELETE /templates/:id            — delete
POST   /templates/:id/use        — create document from template

GET    /usage                    — usage stats
```

## Migration from Next.js API Routes

Frontend mendukung tiga mode (auto-detected):

1. **Dev mode** (default): Next.js API routes + SQLite + placeholder auth
2. **Encore mode**: `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000` → frontend calls Encore
3. **Supabase mode**: `NEXT_PUBLIC_SUPABASE_URL` set → Supabase auth (legacy)

Untuk migrasi ke Encore:
1. Set `NEXT_PUBLIC_API_BASE_URL` di `.env`
2. Start Encore backend (`cd backend && encore run`)
3. Restart Next.js — frontend otomatis pakai Encore API + JWT auth

Frontend `authFetch()` helper (`src/lib/api-client.ts`) otomatis menambahkan `Authorization: Bearer <token>` header ke semua API calls.
