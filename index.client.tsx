import type { PluginClientContext } from "@getpaseo/plugin/client";
import { registerActions } from "./client/actions";
import { Settings } from "./client/settings";

export default function contribute(client: PluginClientContext) {
  const removeSettings = client.addSettingsScreen({ id: "settings", title: "Prompt Enhancer", icon: "Sparkles", Component: Settings });
  const removeActions = registerActions(client);
  return () => { removeActions(); removeSettings(); };
}
