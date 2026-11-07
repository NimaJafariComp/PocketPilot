# P1-04 release configuration — TDD evidence

The release-config test initially failed because no validator existed. The shared validator now rejects missing/demo Firebase identifiers in beta/future profiles, rejects emulators outside development, and requires explicit HTTPS endpoints when future remote features are enabled.

Web release builds no longer silently substitute demo Firebase configuration. The validated production build used supplied non-demo test identifiers; blank tracked local values correctly do not constitute release configuration. Development examples consistently use `pocketpilot-local` and an explicit development profile/emulator capability.

Root Compose now puts Qdrant, Ollama, model pulls, and Rust AI services behind the `ai` profile. Published local ports bind to loopback. Docker is unavailable in this workspace, so Compose syntax was reviewed but not runtime-validated here.

| Guarantee | Test | Result |
| --- | --- | --- |
| Release Firebase configuration is required. | `release-config.test.ts` | Pass |
| Release profiles reject emulator use. | `release-config.test.ts` | Pass |
| Enabled future remote features require HTTPS endpoints. | `release-config.test.ts` | Pass |
