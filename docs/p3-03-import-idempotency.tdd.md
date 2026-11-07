# P3-03: Stable import identity and resumable writes

Source: local `plan.md`, P3-03.

| Guarantee | Evidence | Result |
|---|---|---|
| Retried partial statements retain original row IDs. | `dedupe.test.ts` | PASS |
| Equal same-day charges retain occurrence identity. | `dedupe.test.ts` | PASS |
| Stable account ID, not filename/label, scopes imports. | `dedupe.test.ts` | PASS |
| Import state requires account identity and progress cannot regress. | `firestore.rules.test.ts` | PASS |

RED: the partial-retry test failed because `createImportOperation` was absent. GREEN: IDs are now assigned before deduplication.

Validation: `npm run test:rules` (8 passing), focused dedupe coverage (97.14% lines, 80% branches, 100% functions), core/services/web typechecks, and `npm run web:build` all pass. Mobile typecheck has the pre-existing missing `MenuRowProps.description` error in `app/(app)/profile.tsx`.

The rules test harness resolves Firebase 12 while services resolves Firebase 11, so direct adapter/emulator concurrency coverage cannot share Firestore reference instances. The adapters use transaction-created operation records, deterministic document IDs, 400-row batches, and monotonic progress; browser/device interruption coverage remains a release qualification item.
