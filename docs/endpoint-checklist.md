# Endpoint checklist

> Questions to answer before writing an endpoint, and to check again before calling it done. Every one of them caught a real bug in this project.

| # | Question | Example from this project |
|---|---|---|
| 1 | **Who may call it?** Logged in, onboarded, admin? | Onboarding needs only `requireAuth`. Inviting will need `requireAuth` → `onboardingRequired` → `requiredAdmin` |
| 2 | **What input is valid?** Trim, length limits, allowed values | A blank address passed `.min(1).trim()` because the length check ran before the trim. A role must be a `z.enum`, or Postgres rejects it with a `500` |
| 3 | **What if it was already done?** Duplicate, double click, two at once | A second onboarding returns `409`. The guard is `WHERE company_id IS NULL` inside the update, not a `SELECT` first |
| 4 | **What if it fails halfway?** | The company insert and the user update share one transaction, so a failure leaves no orphan company |
| 5 | **What does the client see?** Status code, a stable `code`, no secrets | The frontend matches on `code`, so a typo in it is a bug. The access token goes in a cookie, never in the body |
| 6 | **What changes in the session or tokens?** | Onboarding issues a new access token. Login and refresh must keep `companyId` in it |
| 7 | **Which test proves each answer?** | `onboarding.test.ts`, `guardChain.test.ts`, and the `companyId` cases in `login.test.ts` and `refresh.test.ts` |

## Before calling it done

- `pnpm exec tsc --noEmit` is clean and `pnpm test` passes.
- Read every string the client can see (messages and `code`s) once, slowly. Typos hide there.
- The endpoint is documented in its module file under `docs/modules/`.
