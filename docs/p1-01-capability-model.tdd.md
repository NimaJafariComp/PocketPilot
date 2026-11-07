# P1-01 capability model — TDD evidence

## Source and user journey

The source was the local-only P1-01 plan. As a beta user, I can use the core financial application without an omitted or malformed client setting activating AI, RAG, remote categorization, merchant learning, demo tooling, or emulator behavior.

## RED and GREEN evidence

The initial test was added in `packages/services/src/capabilities.test.ts`. Running `npx vitest run packages/services/src/capabilities.test.ts` failed because `./capabilities` did not exist. The minimal implementation then added the typed profile resolver, on-device categorization adapter, unavailable RAG adapter, and factory selection gates. The same target passed after implementation.

No checkpoint commits were created: the existing working tree contains earlier uncommitted authorized work and no commit was requested.

| Guarantee | Test | Result |
| --- | --- | --- |
| Missing or invalid profile defaults to fully disabled beta capabilities. | `capabilities.test.ts` | Pass |
| Beta flags cannot enable remote or emulator behavior. | `capabilities.test.ts` | Pass |
| A future profile requires the exact string `true` for every enabled capability. | `capabilities.test.ts` | Pass |
| Development can enable only explicit local emulator/demo controls. | `capabilities.test.ts` | Pass |
| Beta categorization stays on-device and learned merchant preferences remain local to the adapter. | `capabilities.test.ts` | Pass |
| Disabled RAG and independently disabled remote operations reject instead of returning fabricated success. | `capabilities.test.ts` | Pass |
| Explicit future capabilities select the remote adapter. | `capabilities.test.ts` | Pass |

## Validation and coverage

`npx vitest run packages/services/src/capabilities.test.ts --coverage --coverage.include=packages/services/src/capabilities.ts` passed with 96.36% statements and lines, 85.29% branches, and 93.75% functions for `capabilities.ts`.

The root unit suite, web/shared typechecks, and production web build were also run successfully. Mobile typechecking still has the pre-existing `MenuRowProps.description` error in `apps/mobile/app/(app)/profile.tsx`; it is outside P1-01.

Client capabilities are behavior switches, never server authorization. Future deployment must separately complete the security and backend release gates.
