export function createVisibilityState(onChange: (visible: boolean) => void) {
  let version = 0;
  let active = true;
  function update(visible: boolean): void {
    if (!active) return;
    version += 1;
    onChange(visible);
  }
  async function loadInitial(read: () => Promise<boolean>): Promise<void> {
    const startedAt = version;
    const visible = await read();
    if (active && version === startedAt) update(visible);
  }
  return { update, loadInitial, close() { active = false; } };
}
