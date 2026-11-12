# Design and plan changes

Baseline: approved design at commit `5145aba` and plan at commit `447a001`.

- Target the public composer API in Paseo 0.16 on both client and daemon. Do not change Paseo itself or implement the 0.15 composer workaround.
- Use a background Paseo helper with the selected provider's normal configuration and permissions. Do not claim all tools are disabled and do not automatically approve permission requests. Remove the previous universal tool-restriction gate; verify and disclose actual behavior instead.
- Keep the agreed prompt scenarios, context limit, replacement, Undo, host settings, error behavior and separate-daemon end-to-end requirement.
- Split the host request into start and status calls so provider work can exceed the SDK's 60-second ordinary RPC timeout. The helper is archived after its result, error, permission request or timeout; restart and disconnect recovery still require functional verification.
- No change to publication or deployment boundaries. Desktop, mobile, remote and isolated-daemon acceptance remain distinct from local unit checks.
