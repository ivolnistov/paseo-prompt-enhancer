# Prompt Enhancer

Prompt Enhancer is under development. Its goal is to improve a Paseo composer draft with a selected provider and optional conversation history. The plugin targets the Paseo 0.16 API; host and app compatibility, mobile behavior and end-to-end execution remain to be verified.

## Development

Use Node.js and npm, then install the locked development dependencies and run:

```sh
npm ci
npm test
npm run typecheck
```

Tests use fakes and do not contact a provider. End-to-end tests require a separate isolated daemon and a compatible client. Do not use an existing daemon for testing. See the [design](docs/specs/2026-11-11-prompt-enhancer-design.md), [plan](docs/plans/2026-11-11-prompt-enhancer.md), and [feasibility notes](docs/feasibility/paseo-api.md).

The chosen provider receives the draft and selected history. Enhancement uses a background Paseo agent with its provider's normal permissions. The agent's history can remain after archiving.
