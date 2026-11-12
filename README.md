# Prompt Enhancer

Prompt Enhancer rewrites a draft in an existing Paseo agent's composer using a provider and model configured on the selected host. Quick uses saved settings; Advanced lets you select a scenario, edit its instruction and override the history character limit. Undo restores the text present immediately before replacement. The rewritten draft is not sent automatically.

In the plugin settings, select a provider and model, a default scenario and optionally custom scenarios. The history limit defaults to zero; a positive limit includes recent conversation text and can optionally include tool calls and results. Advanced visibility is configurable.

The provider receives the draft, instruction and selected history. Enhancement creates a background agent with the provider's normal permissions. The plugin does not automatically approve permission requests. Archiving the helper does not delete its history, and the provider may retain the request.

## Compatibility and status

The manifest declares a minimum of Paseo `>=0.16.0`; compatibility with that stable version has not been verified. Functional checks used a separate 0.16.0-beta.2 daemon with desktop web and Android clients, including Quick, Undo, Advanced and history. A separate remote host has not been verified. The controls did not appear in an unsent new-agent draft during testing. Recovery after a daemon interruption or failed cleanup has not been verified; inspect background agents if a request is interrupted.

The project is being prepared for release; it has not been submitted to the Paseo registry.

## Development

Use Node.js and npm, then install the locked development dependencies and run:

```sh
npm ci
npm test
npm run typecheck
npm pack --dry-run --ignore-scripts
```

Tests use fakes and do not contact a provider. End-to-end tests require a separate isolated daemon and a compatible client. Do not use an existing daemon for testing. See the [design](docs/specs/2026-11-11-prompt-enhancer-design.md), [plan](docs/plans/2026-11-11-prompt-enhancer.md), and [feasibility notes](docs/feasibility/paseo-api.md).
