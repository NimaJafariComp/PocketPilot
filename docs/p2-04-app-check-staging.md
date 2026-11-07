# P2-04 App Check staging evidence

## Staging boundary

- Project: `pocketpilot-staging`
- Hosting: `https://pocketpilot-staging.web.app`
- Web attestation: reCAPTCHA Enterprise, initialized only when the release build
  supplies its public site key and is not using emulators.
- Debug providers/tokens: not supported by the web factory and rejected by
  release configuration validation.
- Enforcement: **monitoring-only**. On 2026-09-19, the App Check service
  configurations for both `firestore.googleapis.com` and
  `identitytoolkit.googleapis.com` reported `UNENFORCED`; replay protection
  reported `OFF`. Do not change either mode as part of this task.

`UNENFORCED` allows metrics collection without rejecting missing or invalid
App Check tokens. It is deliberately temporary evidence gathering, not an
authorization boundary.

## Least-public live test

1. Use the manually provisioned throwaway Firebase Authentication user whose
   `betaMembers/{uid}` document contains exactly `{ "status": "active" }`.
2. In a normal browser, open the staging site and sign in.
3. Confirm the app reaches its signed-in state and can read the member's empty
   workspace. Reload once, then sign out and sign in again to exercise a fresh
   session.
4. In Firebase Console, open **Security > App Check > APIs**. For both
   Firestore and Authentication, confirm that request metrics update and that
   the verified/outdated/invalid distribution is visible. Record only counts
   and timestamps; do not record a user email, token, or financial data.
5. Repeat with the browser's reCAPTCHA request blocked or unavailable. While
   the services remain `UNENFORCED`, the member check and normal app recovery
   must still work. Record the App Check metric classification and any
   user-visible recovery state.

## Authorization and abuse limitations

- Firestore rules require an authenticated request and a matching active
  `betaMembers/{uid}` document before the user can access financial data.
  Users cannot create, change, enumerate, or delete membership records.
- App Check attests a client; it does not replace authentication, membership
  authorization, document validation, quotas, or rate limits.
- This small staging test intentionally has no public signup or broad member
  issuance. Keep membership provisioning as a trusted operator action.
- Do not enable enforcement until the live test has verified existing and
  fresh sessions, a failure-recovery path, and acceptable request metrics.
- Mobile App Check remains unconfigured and is outside this web-only staging
  evidence.

## Completion evidence

The redacted test record consists of the staging release/version, the
sign-in/reload/re-sign-in/recovery outcomes, and product-specific App Check
metrics. It contains no tokens, passwords, user emails, or financial records.

## Observed recovery (2026-09-19)

After redeploying the staging build with the exact registered reCAPTCHA
Enterprise site key and correcting stale SPA-entry caching, the Firestore App
Check console reported 86 verified requests out of 303 total (28%), with no
outdated-client or unknown-origin requests. The remaining 217 invalid requests
are retained in the seven-day aggregate from the earlier failed-token period.
This confirms token issuance and verified Firestore traffic; it does not
authorize enforcement. At the time of this snapshot, the controlled
unavailable-reCAPTCHA recovery test and corresponding Authentication metrics
remained outstanding.

The controlled unavailable-reCAPTCHA browser test was subsequently completed
with the throwaway staging user: blocking the reCAPTCHA request, clearing site
data, and loading the app did not prevent sign-in or the invited workspace from
loading while App Check remained unenforced. Removing the block, clearing site
data again, and signing in normally recovered successfully. The Authentication
snapshot was collected afterward.

The Authentication App Check service snapshot subsequently reported 49%
verified and 51% invalid requests, in monitoring mode. The historic invalid
share is expected from the intentionally blocked reCAPTCHA session and the
earlier key-configuration failure. No enforcement was enabled.

## Mobile provider evaluation

The mobile client is an Expo 54 application using the Firebase JavaScript SDK;
it has no native Firebase App Check dependency, registered Android/iOS app, or
provider initialization. It is therefore not qualified to access an
enforcement-protected Firebase service. A future native mobile release must
separately register and validate Play Integrity on Android and App Attest or
DeviceCheck on Apple platforms before it participates in enforcement. The
unqualified mobile client does not alter the web-only staging decision or
require weakening web protection.
