# P2-04 App Check token request — TDD evidence

Source: the P2-04 staging App Check acceptance criteria in local `plan.md`.

## User journey

As a staging web user, I need the app to request an App Check token before its
first Firebase operation so that monitoring records a real attestation result
instead of only unverified Firebase traffic.

## RED / GREEN

- **RED:** `npx.cmd vitest run packages/services/src/factory/app-check.web.test.ts`
  failed because `app-check.web.ts` did not exist; therefore no unit of code
  explicitly requested the initial token.
- **GREEN:** the same test target passed with three tests after adding
  `initializeWebAppCheck()` and calling `getToken()` immediately after
  `initializeAppCheck()`.

## Guarantees

| Guarantee | Test | Result |
| --- | --- | --- |
| A hosted web app with a site key initializes the Enterprise provider and immediately requests a token. | `app-check.web.test.ts` | Pass |
| Emulators and keyless builds neither initialize nor request App Check tokens. | `app-check.web.test.ts` | Pass |
| A token-request failure is surfaced in the browser console without blocking monitoring-mode startup. | `app-check.web.test.ts` | Pass |

## Validation

- `npx.cmd vitest run packages/services/src/factory/app-check.web.test.ts --coverage --coverage.include='packages/services/src/factory/app-check.web.ts'` — 3 tests passed; 100% statements, branches, functions, and lines for the helper.
- `npm run typecheck:services` — passed.
- `npm run typecheck:web` — passed.
- Staging beta build deployed with App Check enforcement explicitly false as Hosting version `a9df6184551ce7f4`.

The remaining live-browser evidence is still required before P2-04 can be
completed or enforcement can be enabled.
