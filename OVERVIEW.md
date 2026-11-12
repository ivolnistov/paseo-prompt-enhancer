# Prompt Enhancer

Prompt Enhancer rewrites a draft in an existing Paseo agent's composer. Quick improvement uses your saved defaults. Advanced lets you choose a scenario, edit its instruction and set a history limit for one request. You can undo the last replacement; the plugin does not send the rewritten draft to the conversation.

Choose a provider and model configured on the selected host in the plugin settings. The built-in scenarios make text concise, improve readability or clarify it. You can add custom scenarios, choose a default and hide the Advanced action.

The history limit is measured in characters and defaults to zero. You can include recent user and assistant messages and optionally tool calls and results. The selected provider receives the draft, instruction and selected history. The plugin creates a background agent using that provider's normal permissions; it does not automatically approve permission requests. Agent and provider history may retain this content after the helper is archived.

The manifest declares Paseo 0.16 or later; compatibility with the stable 0.16 release has not been verified. The plugin has been exercised with the 0.16.0-beta.2 host and desktop web and Android clients. Controls were not available in an unsent new-agent draft during testing. Recovery after host interruption and use with a separate remote host have not yet been verified.
