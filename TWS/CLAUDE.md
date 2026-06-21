# TWS — Claude Code Instructions

Multi-tenant SaaS ERP platform (tws.enterprises). Tenants are identified by subdomain
(`acme.tws.enterprises`). Three auth layers: Supra Admin, Software House Admin, Tenant Employee.

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js / Express, MongoDB (Mongoose), JWT, bcrypt, Joi, Helmet, express-rate-limit |
| Frontend | React 18, React Router v6, Axios, Tailwind CSS |
| Storage | AWS S3 / multer-s3 |
| Observability | Sentry (`@sentry/node`), Winston, prom-client |

---

## Security Rules (enforce on every code change)

### 1. Secrets and Environment Variables

- API keys, DB URLs, JWT secrets, and all credentials live in `.env` only — never hardcoded.
- `.env` is already in `.gitignore`; keep it that way. Do not add `.env` exceptions.
- Frontend (`frontend/`) must never contain secret values. Only `REACT_APP_*` public vars belong there.
- Backend reads secrets via `process.env.VAR_NAME` exclusively.
- Never return a secret or token in an API response body.
- Keep `backend/.env.example` up to date with every new variable (empty values only).

### 2. Rate Limiting

The project has `express-rate-limit` installed. Apply it:

- Auth routes (`/login`, `/register`, `/reset-password`): **5 requests / 15 min / IP**.
- General API: **60 requests / min / IP**.
- File upload endpoints: **5 requests / min / IP**.
- Always return `429` with a `Retry-After` header — never silently drop the request.
- Show a clear message on the frontend when a 429 is received.

### 3. Input Validation and Sanitization

- Use **express-validator** (already installed and in use) for all request body validation on the backend. Joi is also installed but express-validator is the active choice.
- Use **express-mongo-sanitize** (already installed) on all routes to block `$` and `.` injection.
- Validate: type, max length, allowed characters, required fields, enum values.
- For file uploads: validate MIME type, file extension, and file size server-side (never trust the client).
- Reject invalid input with `400 Bad Request`. Log the attempt with Winston.

### 4. Authentication and Authorization

- Passwords use **bcrypt** (already installed) with a minimum cost factor of **12**.
- JWTs: signed with a strong secret (≥ 32 chars) from env. Access token expiry: **15–60 minutes**.
- Refresh tokens: stored in **httpOnly cookies** — never in `localStorage`.
- Every protected route must verify **both** identity and permission to access the resource.
- Admin and supra-admin routes get explicit role checks; never rely on obscurity.
- Implement account lockout after repeated failed login attempts.

### 5. Database Security (MongoDB / Mongoose)

- Always use Mongoose models — never raw string-concatenated queries.
- `express-mongo-sanitize` must be active at app middleware level.
- The DB user should have only the permissions it needs (principle of least privilege).
- Never return raw Mongoose error objects to the client — they leak schema info.

### 6. CORS

- Never use `origin: '*'` in production.
- Explicitly whitelist only known frontend origins via `process.env.ALLOWED_ORIGINS`.
- Restrict methods to what each route actually needs.
- Set `credentials: true` only on routes that require cookies.

### 7. HTTP Security Headers

`helmet` is already installed. Ensure it is applied at the app level before all routes:

```js
app.use(helmet());
```

Required headers:
- `Content-Security-Policy` — restrict script/style sources.
- `X-Frame-Options: DENY` — prevent clickjacking.
- `X-Content-Type-Options: nosniff`.
- `Strict-Transport-Security` — force HTTPS in production.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- Remove `X-Powered-By` (`helmet` does this automatically).

### 8. File Upload Security

`multer` and `multer-s3` are already installed. Rules:

- Validate MIME type and file extension server-side on every upload route.
- Enforce size limits: **5 MB** for images, **25 MB** for documents.
- Store files to **S3** (never serve from the local filesystem inside the web root).
- Rename every upload to a UUID — never use the original filename.
- Never execute user-uploaded files.

### 9. Error Handling and Logging

- Return only generic error messages to clients: `"Something went wrong"` is enough.
- Log full error context server-side with **Winston** (timestamp, route, sanitized input, user ID if available).
- Use **Sentry** (`@sentry/node`) for production error tracking — it is already in the dependencies.
- Use correct HTTP status codes: `4xx` for client errors, `5xx` for server errors. Never use `500` for validation failures.
- Never log raw passwords, tokens, or PII.

### 10. Dependency Security

- Run `npm audit` after every `npm install`. Fix `high` and `critical` findings before shipping.
- Do not install packages unmaintained for 2+ years in security-sensitive areas.
- Do not install packages with suspicious `postinstall` scripts without reviewing them.

### 11. XSS Prevention (Frontend)

- Never use `dangerouslySetInnerHTML` unless the content is sanitized with **DOMPurify** first.
  (`isomorphic-dompurify` is already installed on the backend — use it there too for any HTML stored to DB.)
- Never use `eval()`, `new Function()`, or `innerHTML` with dynamic user content.
- Avoid inline `<script>` tags — move JS to external files to enable CSP.

### 12. Pre-Deploy Checklist

Before every deploy, verify:

- [ ] `.env` is not committed to git (`git status` shows no `.env` file)
- [ ] All secrets are set in the hosting platform (Railway / Vercel) env var config
- [ ] `NODE_ENV=production` — debug logging and stack traces are off
- [ ] The MongoDB instance is not publicly exposed
- [ ] HTTPS is enforced (Railway handles this; ensure `HSTS` header is set)
- [ ] Rate limiting is active on all public endpoints
- [ ] CORS is restricted to known origins
- [ ] Unused or debug API routes are removed or protected

### 13. AI / LLM-Specific Rules

If LLM/AI API calls are added to this project:

- Store the AI API key server-side only (`process.env`). Route all calls through the Express backend — never from the React frontend.
- Sanitize user input before it reaches an LLM prompt (prevent prompt injection).
- Always set `max_tokens` to cap costs.
- Log token usage per user/session to detect abuse early.
- Validate and sanitize LLM output before rendering it in the UI — treat it as untrusted HTML.
- Implement per-user token budgets.

---

## Frontend Security Rules (enforce on every React component and page)

> The frontend runs on the attacker's machine. Everything in the browser is visible and editable.
> Frontend security has three jobs only: **don't leak**, **don't trust**, **don't expose**.

### F1. Secrets Never Touch the Frontend

- No API keys, tokens, DB URLs, or private config anywhere under `frontend/src/`.
- Only `REACT_APP_*` vars reach the browser — never prefix a secret key with `REACT_APP_`.
- Publishable/public keys (e.g. Stripe publishable key) are fine but must have a comment: `// public key, intentionally exposed`.
- All secret API calls (OpenAI, SendGrid, etc.) go through the Express backend, never `fetch` directly from the browser.

### F2. Client-Side Validation Is UX, Not Security

- Use `react-hook-form` for instant user feedback — but treat every check as bypassable.
- The identical validation must run on the server (Joi). The server is the authority.
- Never let the frontend be the only thing between user input and the database.
- A disabled button is a suggestion, not a lock.

### F3. Token Storage — httpOnly Cookies Only

- **Never** store JWTs, refresh tokens, or session secrets in `localStorage` or `sessionStorage`. XSS reads them instantly.
- Auth tokens must be stored in `httpOnly`, `Secure`, `SameSite` cookies set by the backend.
- The frontend may decode a JWT to display a username, but must never use JWT contents to *grant* access.
- `<ProtectedRoute>` components are UX — they hide pages, not data. The API must re-check auth on every request.
- On logout and token expiry, clear all auth state from memory and global stores. No stale user objects.

### F4. Authorization Is Never a Frontend Decision

- `{user.isAdmin && <AdminPanel />}` is a display hint — the admin API must independently verify the role.
- Never fetch admin-only or other-user data to the client and then hide it — if it reached the browser, it's exposed.
- Ownership checks (can *this* user edit *this* resource) happen on the server. The frontend reflects the result.

### F5. XSS Prevention

- **No `dangerouslySetInnerHTML`** without `DOMPurify.sanitize()` wrapping the value — every single time.
- **No `eval()`**, `new Function()`, or `innerHTML =` with any value from user input, URL params, API responses, or LLM output.
- React's `{value}` JSX escaping is your default — only bypass it with DOMPurify-sanitized content.
- Validate `href` and `src` values. Never render a `javascript:` URI in an `<a>`. Whitelist `http`/`https`/`mailto`.
- Treat URL query params, `postMessage` data, and anything from an LLM response as untrusted input.

```jsx
import DOMPurify from 'dompurify';

// Only acceptable pattern:
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(richText) }} />

// Never:
<div dangerouslySetInnerHTML={{ __html: userComment }} />
<a href={userProvidedUrl}>click</a>   // could be javascript:...
```

### F6. No Sensitive Data in Client State

- Don't dump full user records, payment details, or other users' data into Redux / Zustand / Context "for convenience."
- Don't persist sensitive state to `localStorage` via Redux-persist or Zustand persist without filtering it out first.
- Only hold what the current view needs. Fetch sensitive data just-in-time; let it fall out of memory after use.
- Anything in state is visible via React DevTools on the live site.

### F7. All Third-Party and AI Calls Go Through the Backend

- Never call OpenAI, Anthropic, Stripe (secret endpoints), SendGrid, or any keyed API directly from browser code.
- The React frontend calls `/api/*` on your Express backend. The backend holds the key and forwards the result.
- This also enables rate-limiting, logging, and per-user budgets — none of which are possible from the browser.

### F8. Handle API Errors Without Leaking

- Show `"Something went wrong, please try again"` to users. Never render a raw stack trace or backend error object.
- Do not `console.log` full error payloads in production — they leak internal structure.
- Handle `429` explicitly: read `Retry-After`, disable the action, show "Too many attempts, try again in Xs."
- Handle `401`/`403` by clearing stale auth and redirecting to login — not by retrying in a loop.
- Never auto-retry write operations on error without user awareness.

### F9. File Uploads — Client Checks Are Hints Only

- Use `accept` attributes and client-side size checks for UX feedback only — they are trivially bypassed.
- Never assume the reported MIME type or extension is real. The server verifies actual file contents.
- Don't construct preview URLs from the original filename — use the UUID URL the server returns.
- Revoke object URLs after use: `URL.revokeObjectURL(url)`.
- Never render an uploaded SVG inline as markup — SVGs can carry scripts. Use `<img src>` instead.

### F10. CORS — Never Bypass It

- A CORS error is a backend config fix, not a frontend workaround.
- Never route requests through a public CORS proxy — you hand your tokens to a third party.
- Only send `credentials: 'include'` when the request genuinely needs the cookie, and only to your own origin.

### F11. Write Code a Strict CSP Can Run

- No inline `<script>` blocks and no inline event handler attributes (`onclick=`, etc.).
- Keep JS in modules. Avoid inline styles where a CSP forbids them — use classes or CSS files.
- Don't load scripts, fonts, or images from arbitrary third-party domains.
- Never hardcode `http://` URLs for your own resources — HTTPS everywhere.

### F12. Frontend Dependency Hygiene

- Run `npm audit` after every install in `frontend/`. Fix `high` and `critical` issues.
- Commit `package-lock.json`. Don't deploy with floating version ranges.
- Be suspicious of small, unmaintained packages — supply-chain attacks target frontend libs.
- A date-formatting lib has no reason to make network requests. Review what a package does before adding it.

### F13. Frontend Pre-Deploy Gate

Before every frontend deploy, verify:

- [ ] No secret keys anywhere in the bundle (grep for key prefixes; check the deployed network tab)
- [ ] Only `REACT_APP_*` public vars are exposed — none are secrets
- [ ] No tokens in `localStorage` / `sessionStorage` — auth uses httpOnly cookies
- [ ] No `dangerouslySetInnerHTML` without DOMPurify; no `eval` / `new Function`
- [ ] All third-party / LLM calls route through the Express backend
- [ ] `console.log` debug output stripped in production build
- [ ] Route guards exist for UX, but APIs enforce auth independently
- [ ] `429` / `401` / `403` handled gracefully in the UI
- [ ] Error UI shows generic messages — no stack traces or raw server errors rendered
- [ ] No CORS-proxy workarounds

### F14. LLM Output on the Frontend

- Never render raw model output with `dangerouslySetInnerHTML` — sanitize with DOMPurify first.
- Never `eval` or inject anything the model returns (code, URLs, scripts).
- Show rate-limit and token-budget feedback in the UI (enforced server-side).
- The frontend must never amplify model output into executable behavior.

---

## Multi-Tenancy Notes

- Tenant is resolved from the subdomain on every request — never trust a tenant ID from the request body without re-verifying against the authenticated session.
- Cross-tenant data access is a critical bug; any query touching tenant-scoped data must scope to the verified tenant ID from the JWT/session.
- Supra Admin routes are completely separate from tenant routes and require their own auth middleware.

---

## What Not to Do

- Do not mock the database in integration tests (production divergence risk).
- Do not hardcode port numbers, base URLs, or credentials — use env vars.
- Do not add `--no-verify` to git commands or `--no-gpg-sign` unless explicitly requested.
- Do not commit large binaries, log files, or generated build artifacts.
