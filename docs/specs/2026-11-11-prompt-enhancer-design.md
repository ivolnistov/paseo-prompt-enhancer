# Prompt Enhancer design

## Goal and scope

Prompt Enhancer improves the draft in a Paseo composer on explicit request. It uses a provider and model already configured on the selected Paseo host. It must work from desktop and mobile clients and with a remote host, subject to the supported Paseo APIs and their version requirements.

The plugin never submits the resulting prompt to the conversation. It does not automatically improve prompts or maintain its own provider credentials.

## Interaction

- A Quick action starts improvement immediately using the host's saved defaults.
- An Advanced action opens a form for choosing a scenario, editing its instruction for this run, and overriding the context limit. Its visibility is configurable.
- Selecting a scenario copies its instruction into the editable form. Edits there apply only to the current run. A user can replace the instruction entirely with custom text.
- The plugin offers built-in scenarios including concise rewriting, improved readability, and clearer explanation. Users can create and edit their own scenarios and select a default.
- While a request is running, show progress and prevent a second request from the same composer.
- On success, replace the composer's current text with the result, even if the user edited it while the request was running. Do not send it.
- Offer Undo to restore the text present immediately before replacement. The exact presentation and lifetime of Undo must be verified against composer APIs during implementation.
- On an error, empty response, unavailable provider, failed context retrieval, permission request, or timeout, keep the current text and show a useful error with a retry path. Do not silently retry.

Paseo controls placement and overflow of contributed composer controls. Verify the two actions on wide and compact layouts, including phone access; do not assume they are always displayed above the chat. Verify behavior for existing agents, new-agent drafts, and the new-workspace composer; do not claim support for a context until its required host and composer capabilities are confirmed.

## Settings and context

Use Paseo plugin settings with host scope, so authorized clients of one host share its settings independently of other hosts. Store the selected provider and model, scenario definitions and default, context limit, inclusion of tool calls and results, and Advanced visibility. Use the native settings screen and validate saved values. Do not store credentials in plugin settings.

The context limit defaults to zero characters. A positive limit selects the most recent eligible history text, preserving chronological order in the request. If necessary, truncate the oldest included text to fit. The draft and instruction are separate from this history limit. Users choose whether eligible history includes only user and assistant messages or also tool calls and results. The Advanced form overrides the limit for one run. If history cannot be read, fail visibly rather than silently sending a different context.

The selected provider receives the draft, instruction, and any selected history. The UI and overview must make this data flow clear. Attachments are outside this design; do not imply they are sent to the enhancer.

## Execution architecture and feasibility gate

The client owns composer integration, settings UI, the Advanced form, progress, and undo. Host-side behavior uses Paseo's supported SDK and plugin interfaces. Reuse the selected host connection for remote and mobile use.

The preferred candidate is a temporary background Paseo agent using the selected configured provider and model. It receives the instruction, draft, and selected history; the plugin accepts only a successful, nonempty result. Track the helper as plugin-owned, close and archive it on completion or failure, and handle timeouts, disconnects, permission requests, and interrupted cleanup explicitly. Archiving is not deletion: background agent history may remain on the host and provider.

Before implementing the product flow, verify against the targeted Paseo version and providers that the helper can be restricted to the required text task, including its built-in tools and inherited configuration, and that its lifecycle can be controlled on all relevant failure paths. An instruction alone is not proof that tools are disabled. Verify available provider/model discovery, context retrieval, composer replacement and settings APIs, and compatibility of both host and app. If the required restriction or lifecycle control cannot be established, stop and discuss a Paseo extension with the owner; do not silently substitute direct provider credentials or weaken the requirement.

## Project documentation

- Add a concise `AGENTS.md` covering the project purpose, shared policy reference, client/server boundaries, validation commands, and respect for the approved design.
- Maintain a developer-facing `README.md` with project status, development and verified setup instructions.
- Update `OVERVIEW.md` for the Paseo listing to reflect actual delivered behavior, setup, data flow, and limitations.
- Once this design is approved, prepare an implementation plan with staged work and validation. Documentation must distinguish planned capabilities from verified behavior.

## Acceptance

1. Quick uses saved host defaults; Advanced supports scenario selection, editable instructions and a per-run context limit, and can be hidden in settings.
2. Host settings are shared across connected clients; custom scenarios persist. Defaults include zero history characters.
3. History selection respects the chosen types and character limit, including a truncated oldest entry. Failures do not silently change the requested context.
4. Successful output replaces the current draft without sending it. Undo restores the text immediately before replacement. Errors and empty output preserve the current draft.
5. Provider calls use Paseo's configured provider and model, with tool restrictions and helper lifecycle verified before release. No unattended helper is left running after normal completion, failure, or a handled timeout; disconnect and restart recovery are verified and any unsupported cases are documented.
6. Automated checks exercise selection, settings, request and result handling, and failure paths. Functional checks cover supported desktop, compact/mobile, and remote-host clients, including the actual control placement and error states.
7. The manifest declares the verified minimum Paseo version for all APIs used. The repository documentation reflects the shipped and tested behavior.

## References

- https://paseo.sh/docs/plugins/reference.md#settings-screens
- https://paseo.sh/docs/plugins/reference.md#composer-items
- https://paseo.sh/docs/sdk/agents.md#run-a-helper-as-a-background-agent
- https://paseo.sh/docs/sdk/reference.md
