# P1-02 beta remote-work guard — TDD evidence

## User journey

As a beta user, I can add, edit, import, and view financial data while remote categorization, merchant learning, RAG indexing, and assistant chat remain disabled and cannot be activated by missing configuration.

## RED and GREEN evidence

The test for beta background-work gates was added to `packages/services/src/capabilities.test.ts`. Its first run failed because the gate functions did not exist. The implementation then added explicit capability predicates and wired them into the shared data provider and platform interaction paths.

The beta profile now prevents uncategorized backfill, post-save/import merchant learning, manual-edit remote categorization, RAG document construction, RAG scheduling, and RAG sync requests. Existing HTTP adapters and assistant UI code remain behind future capabilities. The web and mobile assistant tabs render a Coming soon state when the assistant capability is disabled.

RAG HTTP calls accept an abort signal. Data-provider effect cleanup aborts a current RAG request and clears a queued timer on unmount, user/dependency change, or capability disable; a session generation check prevents stale user work from updating the visible sync state. Sample-data controls and handlers are guarded by the demo-data capability and are hidden in beta while their source remains available for explicit development use.

| Guarantee | Test | Result |
| --- | --- | --- |
| Beta blocks background categorization, merchant learning, and RAG sync. | `capabilities.test.ts` | Pass |
| A supplied remote categorization or RAG adapter is not invoked in beta. | `capabilities.test.ts` | Pass |
| Disabled RAG rejects instead of simulating a successful result. | `capabilities.test.ts` | Pass |

`npx vitest run packages/services/src/capabilities.test.ts --coverage --coverage.include=packages/services/src/capabilities.ts` passed with 100% statements and lines, 95% branches, and 94.73% functions for the capability module. Web/shared typechecks and the production web build pass. Mobile typechecking retains the unrelated pre-existing missing `MenuRowProps.description` error in `apps/mobile/app/(app)/profile.tsx`.

No browser/device network trace was captured in this workspace. The unit proof establishes adapter selection and the build proof establishes beta bundling; device-level release qualification remains a separate mobile release gate.
