# P1-03 local categorization — TDD evidence

## User journey

As a beta user, I can save and import transactions with an explicit configured category or an explicit Uncategorized fallback, without a remote categorization or learning service determining whether the financial write succeeds.

## RED and GREEN evidence

`packages/services/src/local-categorization.test.ts` initially failed because the local categorizer did not exist. The shared implementation adds a small deterministic merchant rule set. It only assigns a rule's category when that category exists in the user's configured category list; otherwise it returns `Uncategorized` with `auto-rule` provenance and review required.

Manual and imported configured categories remain manual/imported provenance after category-list validation. Existing remote adapters are preserved for a qualified future profile, while beta continues to use the local adapter. Categorization errors now fall back to `Uncategorized`; optional merchant learning is fire-and-forget after the financial write, so its failure cannot report a successful write as failed.

| Guarantee | Test | Result |
| --- | --- | --- |
| A known merchant maps through a deterministic local rule. | `local-categorization.test.ts` | Pass |
| Unknown merchants use explicit Uncategorized with local-rule provenance. | `local-categorization.test.ts` | Pass |
| A rule cannot introduce an unavailable category. | `local-categorization.test.ts` | Pass |

`npx vitest run packages/services/src/local-categorization.test.ts --coverage --coverage.include=packages/services/src/local-categorization.ts` passed with 100% statements, branches, functions, and lines for the module. Web/shared typechecks and the production web build pass.
