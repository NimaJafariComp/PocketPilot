# Deployment exposure and billing inventory

Snapshot: 2026-09-19 UTC. This is a read-only inventory; it neither contacted
application endpoints nor changed cloud resources, credentials, billing, IAM,
network policy, or retained data.

## Evidence boundary

The only repository Firebase binding is
`backend/firebase/.firebaserc`, which selects `pocketpilot-local`. The name
suggests local use but is not proof that a cloud project does not exist. The
configuration and source defaults otherwise use emulator/demo settings:
`pocketpilot-local`, `demo-pocketpilot`, and loopback URLs.

No Firebase CLI, Google Cloud CLI, Docker CLI, GitHub CLI, workspace Firebase
Tools installation, root `.firebaserc`, or Firebase cache was available in this
environment. The checked `.env` paths were absent. The tracked
`apps/web/.env.local` has blank Firebase identifiers and an explicit emulator
selection setting, so the application's non-secret fallback configuration can
still take effect; its contents do not establish a real cloud deployment. No
targeted local listener was present for the emulator, Functions, web, Qdrant,
Ollama, Rust services, or Expo ports at the time of the snapshot. The Git remote
is reachable, but the repository has no `.github` deployment workflow, Firebase
Hosting configuration, Cloud Run manifest, or checked-in deployment record.

Therefore, source configuration is **not** evidence of current deployed state.
The table below intentionally reports unknown rather than inferring safety.

| Asset / control | Repository or local observation | Actual deployed state |
| --- | --- | --- |
| Firebase project | `pocketpilot-local` is the configured default | **Unknown**: project existence, environment role, billing plan, linked billing account, enabled APIs, and resource inventory cannot be queried without authenticated project access. |
| Firestore rules and indexes | Source rules require an authenticated matching UID for `users/{uid}` and subcollections | **Unknown**: source file does not prove deployed rules or indexes. Schema validation and query constraints are also outside the source rules. |
| Firebase Auth | Client source supports Firebase Auth and emulator endpoints | **Unknown**: providers, user population, authorized domains, password policy, email actions, abuse protection, and MFA cannot be inspected. |
| App Check | No App Check configuration found | **Unknown**: it may be absent or configured outside this repository. |
| IAM / service accounts | Rust services support `GOOGLE_APPLICATION_CREDENTIALS` outside emulators; no credential file was inspected | **Unknown**: principals, role bindings, keys, Workload Identity, and audit-log retention require cloud access. |
| Functions / Cloud Run | Firebase Functions source declares HTTPS routes in `us-central1`; Rust services have no cloud deployment manifest | **Unknown**: deployed Functions, revisions, ingress, invokers, environment variables, custom domains, and Cloud Run services cannot be queried. |
| Firebase Hosting / web | No Hosting config or known public site URL in the repository | **Unknown**: absence of config does not prove no deployed Hosting site, preview channel, custom domain, or third-party host. |
| Docker local stack | Compose publishes ports for emulators, Qdrant, Ollama, Rust services, web, and Expo | **Not running locally at snapshot**; external exposure remains **Unknown** because Docker was unavailable and separately hosted copies cannot be inferred. |
| Qdrant / RAG vectors | Compose persists `qdrant_data`; vector payloads include user ID, text, tags, hashes, timestamps; RAG source filters by user ID | **Unknown**: collection existence, point count, access controls, snapshots, backups, and any real-user data require trusted datastore access. |
| Ollama | Local compose defaults to `qwen2.5:1.5b` and `nomic-embed-text:v1.5` | **Not running locally at snapshot**; remote endpoint and prompt/log retention are **Unknown**. |

There is no asset classified **deployed and isolated** from this evidence. There
is no cloud asset classified **not deployed** either: the only supported local
statement is that no relevant listener was running on this workstation at the
time checked.

## Conditional exposure requiring containment

If the checked-in Docker configuration is run on a host reachable by untrusted
networks, the following host-published ports are an immediate containment target:

| Target | Host ports in source | Risk requiring confirmation |
| --- | --- | --- |
| Firebase emulator UI / Functions / Auth / Firestore | 4000, 5001, 8080, 9099 | Emulator data and administrative UI are not a production trust boundary. |
| Qdrant | 6333, 6334 | Persistent vector payloads can contain financial text; no Qdrant authentication is configured in source. |
| Ollama | 11434 | An exposed model endpoint can consume compute and receive prompts. |
| Categorization / RAG services | 8088, 8089 | Rust services bind `0.0.0.0`; the RAG service has permissive CORS and health output includes backend URLs/models. |
| Web / Expo | 5173, 19000–19002 | Development endpoints are not release hosting. |

If an authorized operator confirms any of these resources are internet- or
untrusted-LAN reachable, contain them before feature work by using the exact
running host/project targets:

1. Stop the identified Compose project or service revision; preserve logs and
   volume/snapshot identifiers first if real data may exist.
2. For required local development, remove host `ports` mappings or bind each
   listed mapping to `127.0.0.1`; do not expose emulator, Qdrant, Ollama, Rust,
   or Expo development ports through firewall/NAT/tunnel rules.
3. For a cloud service, restrict ingress to authenticated callers/private
   networking, remove `allUsers` invocation where applicable, rotate exposed
   credentials, and verify logs after the exact project/service is identified.
4. Do not delete Qdrant collections or emulator volumes until ownership,
   retention, backups, and deletion requirements are confirmed. The Rust Qdrant
   client can delete/recreate a collection while resolving vector dimensions;
   that behavior makes a blind containment deletion unsafe.

These are recorded actions, not performed changes. No project ID, host, or
resource identifier beyond the local configuration is known, so executing them
would require separate operational authorization.

## RAG data discovery and deletion scope

The preserved feature code can place user-scoped financial context in multiple
stores. Any future deactivation, migration, or deletion program needs a trusted
inventory—not just client-side UI changes—for:

- Firestore documents under `users/{uid}` and the referenced transaction,
  budget, goal, category, and settings subcollections.
- Qdrant points in the configured collection (default
  `pocketpilot_vectors_v2`), including payload `userId`, document text, tags,
  metadata, content hash, and timestamps. Functions and Rust paths both perform
  user-filtered retrieval/synchronization, but no deployed collection contents
  were read.
- Qdrant volumes/snapshots/backups and any infrastructure-level backups outside
  the collection API.
- Function/Rust/Ollama logs, traces, request bodies, error reports, and platform
  backups subject to the provider's actual retention policy.
- Firebase Authentication user records and any export/deletion queues or dead
  letters enabled outside this repository.

Current source is **not evidence** that no real-user RAG data exists. Before a
future AI activation or migration, an authorized operator must inventory point
counts by user/source, backup/snapshot locations, data-retention settings, and
completion evidence for per-user deletion. Never obtain this evidence by
printing financial payloads into terminal output or documentation.

## Required read-only cloud evidence to close unknowns

An operator with least-privilege read access should capture dated results for
the `pocketpilot-local` project only after confirming that is the intended cloud
project:

1. Firebase project list/current project; then deployed Firestore rules and
   indexes, Functions, Hosting sites/releases, Auth providers/authorized
   domains, and App Check enforcement/registrations.
2. Google Cloud project details, enabled services, Cloud Run revisions/ingress,
   IAM policy, service-account keys or workload identities, audit-log sinks, and
   linked billing account/budget/alerts.
3. Network inventory for load balancers, DNS/custom domains, firewall rules,
   public IPs, NAT/tunnels, Artifact Registry images, and scheduler/queue jobs.
4. Qdrant/Ollama host ownership, authenticated administrative access, collection
   metadata/counts, backup/snapshot inventory, and log retention—without
   exporting vector payload text.

Use read-only project access and do not deploy, redeploy, stop, delete, rotate,
or modify billing as part of the inventory. Firebase's CLI project listing is a
valid first authenticated read-only check; see the
[Firebase CLI documentation](https://firebase.google.com/docs/cli).
