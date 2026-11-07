# Supply-chain triage — 2026-09-19

## Scope and method

This is a local audit snapshot of the committed root workspace lockfile and the independently locked Firebase Functions package. Nested historical lockfiles are not release-install inputs and were not used as audit sources. Remediation used compatible `npm audit fix` updates only; no forced update or automatic major upgrade was used.

Audits were run with production dependencies only. The root workspace reports 20 findings: 11 moderate, 9 high, and 0 critical. The Functions package reports 9 moderate findings and 0 high or critical findings. The remaining root high findings are aliases in the Expo 54/Metro mobile build chain, not the browser application bundle.

## Remediated findings

- The shipped web router was updated from `react-router` 7.13.0 to 7.18.4, resolving its reachable high-severity advisory path.
- Compatible root-lock and Functions-lock updates resolved all critical findings and all Functions high findings. The static web build, web and shared typechecks, Functions TypeScript build, unit tests, and lockfile consistency checks pass after the update.
- `brace-expansion` was updated to 5.0.12. Vite is resolved at 6.4.3.

No production critical finding remains in either audited lockfile. The web beta release build does not include an unexplained high-severity dependency finding.

## Temporarily accepted mobile build-chain findings

The following record is a release blocker for native distribution, not an approval to ship a native build.

| Field | Record |
| --- | --- |
| Advisory IDs | `GHSA-w3rx-r6r6-pgpr`, `GHSA-5p2g-fcmc-qvqq` (`image-size`); `GHSA-qx2v-qp2m-jg93`, `GHSA-6g55-p6wh-862q`, `GHSA-fxqj-rqcc-2cmp`, `GHSA-r28c-9q8g-f849` (`postcss`) |
| Affected packages | `expo` 54.0.37, `@expo/metro-config` 54.0.17, Metro 0.82/0.83 chain, `image-size` 1.2.1, and `postcss` 8.4.49 |
| Audit aliases | `@expo/cli`, `@expo/metro`, `@expo/metro-config`, `expo`, `metro`, `metro-config`, `metro-transform-worker`, `image-size`, and `postcss` |
| Reachability | These packages are used by Expo/Metro local or managed native build tooling. They are not loaded by the deployed static web browser bundle. They remain reachable by a native build process and therefore cannot be ignored for native release approval. |
| Compensating controls | Native release remains excluded; do not expose Metro or Expo development servers; use only controlled build inputs; do not process untrusted project files in the build environment. |
| Owner | Mobile/platform owner |
| Expiration and review | 2026-10-03. Re-audit before this date and before any Android or iOS distribution. |
| Required resolution | Qualify a deliberate Expo SDK upgrade (audit remediation points to the Expo 57/Metro 0.87 line), including the already-blocked Firebase persistence and device test matrix. Do not use `npm audit fix --force` as a substitute. |

The current SDK 54 dependency range holds `postcss` below the fixed 8.5.28 release. The audit's automatic remediation requires a breaking Expo/Metro upgrade; it was intentionally not applied. This exception is documented, time-bound, and blocks future native deployment.

## Remaining moderate findings and dormant backends

The Functions package has nine moderate findings after remediation. It has no high or critical finding in the current runtime lockfile. The preserved Rust/RAG/Qdrant/Ollama feature path is not deployed or approved for activation; its deployment state remains unknown per the exposure inventory. `cargo audit` is unavailable in this environment, so Rust dependency status is unverified. Backend/platform ownership must install or run an approved Rust advisory scanner, record its result, and clear all release-reachable high or critical issues before that feature is deployed. The review date is 2026-10-03 or earlier if deployment authorization is requested.

The full workspace's test-only Vitest chain has moderate-only advisories. It is not packaged into the production browser bundle; platform ownership should re-audit it at the same review date rather than treating it as runtime approval.

## Secret scan

A redacting pattern scan examined 308 current tracked or non-ignored files and all 42 reachable Git revisions. It reported zero high-confidence matches for PEM private keys, service-account private keys, Firebase API-key patterns, GitHub tokens, OpenAI keys, Slack tokens, or AWS access-key identifiers. Candidate values were never printed.

This was a pattern scan, not an entropy scanner: `gitleaks`, `detect-secrets`, and `trufflehog` were unavailable locally. Add an approved secret scanner to CI before public deployment. Firebase public client configuration identifiers are not service-account credentials; private service-account material is prohibited from the repository.
