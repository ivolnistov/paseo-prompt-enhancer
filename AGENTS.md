# Prompt Enhancer agent instructions

Before acting, read and follow `/Users/ivolnistov/.skills/policies/TEAM.md` (common sections; named profiles only within their stated scope). User instructions and applicable project instructions retain their precedence.

This repository develops a Paseo plugin to improve composer drafts. Read the [design](docs/specs/2026-11-11-prompt-enhancer-design.md) and [implementation plan](docs/plans/2026-11-11-prompt-enhancer.md) before changing behavior. Target Paseo 0.16's existing plugin API; do not change Paseo itself. Surface unsupported assumptions to the owner.

Keep app code in `client/`, daemon code in `server/`, and shared schemas and plain values in `shared/`. Do not import server or Node runtime code into the client. Use Paseo's selected host connection and plugin interfaces. Keep drafts, history and credentials out of logs and committed artifacts.

Run `npm run typecheck` for source changes. Run `npm test` once a test script exists. End-to-end tests use a separate isolated daemon; do not modify an existing daemon for testing. Report local checks, review, and functional verification separately.
