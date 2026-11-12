import type { PluginClientContext, PluginSurfaceProps } from "@getpaseo/plugin/client";
import { registerActions } from "./client/actions";
import { Settings } from "./client/settings";

export default function contribute(client: PluginClientContext) {
  const actions = registerActions(client);
  const SettingsScreen = (props: PluginSurfaceProps) => <Settings {...props} onSaved={actions.setAdvancedVisibility} />;
  const removeSettings = client.addSettingsScreen({ id: "settings", title: "Prompt Enhancer", icon: "Sparkles", Component: SettingsScreen });
  return () => { actions.cleanup(); removeSettings(); };
}
