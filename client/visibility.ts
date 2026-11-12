export function createVisibilityState<T>(onChange: (value: T) => void) {
  let version = 0;
  let active = true;
  function update(value: T): void {
    if (!active) return;
    version += 1;
    onChange(value);
  }
  async function loadInitial(read: () => Promise<T>): Promise<void> {
    const startedAt = version;
    const value = await read();
    if (active && version === startedAt) update(value);
  }
  return { update, loadInitial, close() { active = false; } };
}
