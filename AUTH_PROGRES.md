# Auth: Progress

> Last updated 2026-10-20 · Legend: ✅ done · 🔨 in progress · ⬜ pending

## At a glance

| Area | Status | Note |
|---|---|---|
| CSRF protection | ✅ | Synchronizer token + `verifyCsrf` middleware |
| Register | ✅ | Transactional, 409 on duplicate email |
| Login | 🔨 | Code complete, **needs a manual test** |
| Logout | ⬜ | Next up |
| Refresh | ⬜ | Next up |
| Access-token middleware | ⬜ | Needed before any protected route |
| Tests | ⬜ | Nothing has been run end to end yet |

---

## Up next

- [ ] **Test register + login by hand** (curl steps below)
- [ ] **Logout**: delete session row, clear cookies, `204`
- [ ] **Refresh**: atomic token rotation, new access token
- [ ] **Auth middleware**: verify `a.token`, attach user to the request

<details>
<summary>Manual test steps</summary>

```bash
curl -i -c jar.txt http://localhost:4000/auth/csrf
curl -i -b jar.txt -H "X-CSRF-Token: <token>" -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  http://localhost:4000/auth/login
```

Expect: `200` and three cookies. Wrong password and unknown email must return the same `401`. The 11th failed attempt in 15 min must return `429`.

</details>

---

## Open questions

1. **Session lifetime on refresh:** fixed 7 days (simpler, safer) or sliding (each refresh extends it)? *Leaning fixed.*
2. **Multiple devices?** Today a new login signs out the old one. Supporting several needs a `user_id` column on `session`.
3. **Frontend:** which framework / fetch layer? Needed for the CSRF auto-retry wrapper.

---

## Trade-offs we accepted

| Decision | Cost | Why |
|---|---|---|
| No email verification | Register reveals which emails exist (`409`) | Out of scope for now |
| One session per user | New login signs out other devices | Matches current schema |
| Opaque refresh token, not a JWT | DB lookup on every refresh | Simpler, revocable, no signing secret |
| Access token only in an httpOnly cookie | Needs CSRF protection (we have it) | Not readable by JS |
| Fixed-window rate limit, in-memory | Burst at window edges; resets on restart | Fine for one instance |
| Password max 72 chars | Longer passwords rejected | bcrypt ignores everything past 72 bytes |

---

## Good to know

<details>
<summary>Tokens and cookies</summary>

| Cookie | Holds | Lifetime | In the DB |
|---|---|---|---|
| `sid` | Signed JWT with the session id | 30 min anonymous, 7 days after login | The `session` row |
| `a.token` | Access JWT (`id`, `role`) | 15 min | Nothing |
| `r.token` | Opaque random string, path `/auth/refresh` | 7 days | SHA-256 hash only |

CSRF failures return `403` with a code: `CSRF_MISSING`, `CSRF_EXPIRED` (client may refetch and retry once) or `CSRF_INVALID`.

</details>

<details>
<summary>Gotchas</summary>

- `SESSION_TTL_MS` in `.env` must be a plain number (`604800000`). dotenv does not evaluate `7 * 24 * ...`.
- Required env vars: `DB_USER`, `DB_HOST`, `DB_NAME`, `CSRF_SECRET`, `ACCESS_SECRET`. The server won't start without them.
- `register` and `login` accept any valid session, not only an anonymous one.
- `session.access_token` column is unused.
- A `jar.txt` with a test cookie sits in the project root. Delete it.

</details>

<details>
<summary>Architecture</summary>

`route → controller → service → repository → DB`

- Controller: HTTP only (validation, cookies, status codes)
- Service: business logic and transactions (`withTransaction`)
- Repository: SQL only; turns `23505` into `EmailTakenError`

</details>

---

## Before production

**Blockers**
- [ ] Redact cookies and `X-CSRF-Token` from `pino-http` logs
- [ ] `trust proxy`, HTTPS, real `CORS_ORIGIN`, frontend on the same site as the API
- [ ] Automated tests (register, login, CSRF, rate limits, rollback)
- [ ] DB: SSL, pool size and timeouts, `pool.on("error")`

**Should do**
- [ ] Shared rate-limit store (Redis) if running more than one instance
- [ ] `unhandledRejection` / `uncaughtException` handlers
- [ ] `/health` checks the DB
- [ ] Explicit `express.json` size limit
- [ ] Indexes on `session.expiry` and `users.session_id`
- [ ] `pnpm audit`

---

<details>
<summary>Done</summary>

- ✅ DB pool config (`host`, `db_port`) and startup env validation
- ✅ CSRF: session table, `verifyCsrf`, error codes, rate-limited `/auth/csrf`
- ✅ Hourly expired-session cleanup; graceful shutdown closes the DB pool
- ✅ Register: session → user → delete temp session, all in one transaction
- ✅ Login: password checked before any token is created, dummy-hash compare, generic `401`
- ✅ Refactor into route / controller / service / repository, shared cookie helper
- ✅ Fixed `withTransaction` missing `await` (would have broken rollback)
- ✅ Per-route rate limiters for register and login

</details>
