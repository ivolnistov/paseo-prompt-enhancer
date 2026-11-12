# Prompt Enhancer Implementation Plan

> **Execution:** follow owner/project Paseo policy and existing role assignments.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve a Paseo composer draft on demand using a configured host provider and an optional window of conversation history.

**Architecture:** A React Native client contributes composer controls and a settings screen. A host-side plugin service uses Paseo settings and SDK operations to collect history and run a temporary background helper with the selected provider’s normal permissions. Shared schemas define settings and RPC boundaries.

**Tech Stack:** TypeScript, React Native, `@getpaseo/plugin`, Zod, Paseo SDK, Node test runner with `tsx` for TypeScript tests.

**Spec:** [2026-11-11-prompt-enhancer-design.md](../specs/2026-11-11-prompt-enhancer-design.md)

## Global Constraints

- History defaults to 0 characters; the draft and instruction are outside the history limit.
- Use configured Paseo providers and models, host-scoped plugin settings and the selected host connection; no separate provider credentials.
- The result replaces the current draft without sending; Undo restores the text immediately before replacement.
- Support desktop, compact/mobile and remote hosts, subject to verified host and app API versions.
- Run end-to-end tests on a separate, isolated daemon, as requested by the owner.
- Use the official Paseo 0.16 APIs and do not modify Paseo itself. Do not claim background agents are tool-free; do not automatically grant permissions.
- History and drafts may remain in helper or provider history; archiving is not deletion. Do not log their contents.
- User approval of this plan does not authorize publication, deployment, or installing/reloading a plugin on a daemon.

## File map

- `AGENTS.md`: project operating instructions and shared policy reference.
- `docs/feasibility/paseo-api.md`: verified versions, API evidence, limitations and gate result.
- `shared/settings.ts`, `shared/enhance.ts`: validated settings and request/response contracts.
- `server/history.ts`, `server/enhance.ts`, `index.server.ts`: history selection, owned helper lifecycle, host registrations.
- `client/settings.tsx`, `client/enhancer.tsx`, `index.client.tsx`: settings, composer actions, advanced form, progress and undo.
- `tests/`: behavior-focused tests using fake SDK boundaries; `package.json` and lockfile provide the test command.
- `README.md`, `OVERVIEW.md`, `paseo-plugin.json`: verified developer guidance, user-facing overview and supported version.

Names are the intended ownership boundaries, not evidence that Paseo exposes a particular API. If Task 1 disproves an interface, stop for a design decision instead of inventing an adapter.

---

### Task 1: Establish the supported Paseo boundary

**Files:** Create `AGENTS.md`, `docs/feasibility/paseo-api.md`. Read the installed SDK declarations, current Paseo plugin/SDK documentation, and relevant local Paseo source if available.

**Interfaces:** Consumes the approved spec. Produces an evidence-backed host/app minimum version and a gate decision covering provider/model catalog, composer read/write and placement, history pagination and item types, settings, helper creation, permissions and termination.

- [ ] Write `AGENTS.md` with the shared policy reference `/Users/ivolnistov/.skills/policies/TEAM.md`, TypeScript client/server separation, `npm run typecheck`, the future `npm test`, and the approved spec and this plan as project references. Do not duplicate global policy or prescribe agent identities.
- [ ] Document exact source/version and symbols for each interface. Describe the provider's normal modes and permissions and distinguish prompt instructions from enforced restrictions.
- [ ] Trace helper creation, successful completion, permission wait, timeout, cancellation, disconnection, daemon restart and cleanup. Verify what is archived and retained. Identify a safe supported recovery mechanism; do not assume timeout cancels work.
- [ ] Verify history retrieval supplies enough chronological text and tool data, including pagination. Verify composer behavior for existing agents, drafts, new workspaces, mobile overflow and Undo. Record unsupported cases and exact version requirements.
- [ ] Use read-only inspection first. A live provider probe has cost and creates agent history: prepare a concrete probe and obtain any required authorization before running it. Record evidence and outcome, not draft or session content.
- [ ] Record supported APIs, provider permission behavior and lifecycle limitations. Do not require a universal deny-all-tools guarantee or changes to Paseo.
- [ ] Commit the project instructions and evidence once reviewed: `git add AGENTS.md docs/feasibility/paseo-api.md && git commit -m 'Document Paseo feasibility and project guidance'`.

### Task 2: Settings and deterministic history selection

**Files:** Create `shared/settings.ts`, `server/history.ts`, `tests/settings.test.ts`, `tests/history.test.ts`. Modify `package.json`, `package-lock.json`.

**Interfaces:** `selectHistory(entries, limit, includeTools): string` consumes ordered normalized entries `{ kind: 'user' | 'assistant' | 'tool'; text: string }` and returns eligible recent text in chronological order, at most `limit` Unicode characters. `preferences` is a versioned host-scoped Paseo settings definition containing provider, model, default scenario, user scenarios, history limit, tool inclusion and Advanced visibility.

- [ ] Add `tsx` as a dev dependency and `"test": "node --import tsx --test tests/*.test.ts"`; do not add production runtime dependencies for the test runner.
- [ ] Test zero limit, excluded and included tool entries, chronological output, truncation of the oldest selected entry, and Unicode characters. Example: entries `[{kind:'user',text:'ab'},{kind:'assistant',text:'cde'}]`, limit `3`, return `cde`; limit `4`, return `bcde`. Count Unicode code points consistently using `Array.from`, and count any separators toward the limit if serialization adds them.
- [ ] Implement the pure selector and a settings schema whose default history limit is `0`, rejects negative/non-integral limits and validates scenario identifiers and instruction text. Define built-in scenarios for concise rewriting, readability and clarification; do not require credentials.
- [ ] Test schema defaults, invalid limits, custom-scenario persistence shape and default scenario selection. Run `npm test` and `npm run typecheck`; fix all failures.
- [ ] Commit the focused change: `git add package.json package-lock.json shared/settings.ts server/history.ts tests && git commit -m 'Add prompt enhancer settings and context selection'`.

### Task 3: Host request and helper lifecycle

**Files:** Create `shared/enhance.ts`, `server/enhance.ts`, `index.server.ts`, `tests/enhance.test.ts`. Modify `server/history.ts` if the verified history adapter requires it.

**Interfaces:** The validated `enhance.start` RPC accepts the composer/agent context, draft, instruction, history character limit and tool inclusion and returns an operation ID. `enhance.status` returns running, a nonempty result, or an error. The host retains results briefly, and archives the helper on completion or failure. Separate short calls avoid the 60-second RPC deadline while the agent works. Test helper and history boundaries with fakes.

- [ ] Write fake-boundary tests proving zero context causes no history fetch, a positive limit selects eligible history, the configured provider/model and instruction reach the helper, and success returns the model text.
- [ ] Test missing history, provider failure, permission request, empty result and timeout: each yields a useful error, never a replacement result; a timed-out helper is actively stopped or otherwise conclusively closed using the method proven in Task 1, then archived. Test cleanup after success and failure and failed cleanup reporting.
- [ ] Register host settings and the Zod-validated RPCs. Implement history pagination and helper ownership using only the verified interfaces. Reject unknown or unsupported execution states; never automatically grant a permission or log request contents.
- [ ] Run `npm test` and `npm run typecheck`. Confirm the tests use fakes and do not contact providers. Commit: `git add shared server index.server.ts tests && git commit -m 'Run prompt enhancement through Paseo'`.

### Task 4: Composer and settings experience

**Files:** Create `client/settings.tsx`, `client/enhancer.tsx`, `tests/composer.test.ts`. Modify `index.client.tsx`.

**Interfaces:** Client calls the Task 3 RPCs and reads/saves Task 2 host settings. Composer state must expose current text and supported replacement according to Task 1; the saved undo value is the current text read immediately before successful replacement, not the text captured at request start.

- [ ] Test the interaction state at the client boundary: Quick uses defaults; Advanced copies the selected instruction into an editable field and supports a one-run limit; changing that field does not modify the saved scenario. Test that a running request prevents a second request in the same composer.
- [ ] Test that success replaces the latest current draft, Undo restores that immediately preceding draft, and empty or failed results preserve it. Test the case where the user edits the draft while the request is running. Implement a clearly scoped Undo lifetime using only APIs confirmed in Task 1.
- [ ] Implement the host-scoped settings screen for provider/model selection, built-in and editable custom scenarios, context limit, tool inclusion and Advanced visibility. Surface loading, invalid settings and save conflicts; preserve unsaved edits on conflict.
- [ ] Register Quick and optionally Advanced using Paseo's supported composer contributions. Use React Native primitives, theme colors and compact layouts. Indicate loading and present errors with a user-initiated retry. No automatic send.
- [ ] Run `npm test`, `npm run typecheck`, and `rg -n 'document\.|window\.|localStorage|navigator\.|<[a-z]+[ >]|className=|onClick=' client/`. Investigate every hit; web-only code requires an explicitly gated platform boundary. Commit: `git add client index.client.tsx tests && git commit -m 'Add composer actions and settings'`.

### Task 5: Integration, documentation and acceptance

**Files:** Create `README.md`. Modify `OVERVIEW.md`, `paseo-plugin.json`, and any files changed to correct acceptance failures.

**Interfaces:** Uses the exact final plugin revision and the Task 1 verified compatibility floor. All checks exercise the implementation built in Tasks 2–4.

- [ ] Set the manifest minimum to the lowest host and app version actually verified for every used API. Document verified setup, development commands and current limitations in `README.md`; make `OVERVIEW.md` describe user-visible behavior, provider data flow, retained helper history and setup without installation commands.
- [ ] Run `npm test` and `npm run typecheck` on the final tree. Test settings validation, context boundaries, cancellation and cleanup using the suite; fix regressions and rerun affected checks.
- [ ] On a separate isolated test daemon, install or reload the exact revision and verify the plugin is running. Exercise Quick, Advanced, custom instructions, context off/on, tools inclusion, a changed draft during generation, Undo and an error. Verify no unintended send and inspect helper lifecycle. Prepare the isolated daemon and test data without altering an existing daemon; follow any remaining authorization requirements for real provider use.
- [ ] Verify desktop wide and compact layouts, a mobile client and a remote host; record actual host/app versions, control placement and observed results. Explicitly mark any unavailable environment unverified instead of reporting complete acceptance.
- [ ] Obtain the independent review required by the applicable team policy on the actual final diff; resolve findings and rerun affected checks. Commit the verified documentation and any corrections. Run the applicable exact-revision code review gate before requesting delivery approval.
- [ ] Report local checks, review, functional evidence, remaining limitations, revision and next action separately. Do not push, publish, deploy or change daemon settings without authorization.
