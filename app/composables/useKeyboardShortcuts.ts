export function useKeyboardShortcuts() {
  const enabled = useState<boolean>("keyboard-shortcuts-enabled", () => true);
  return enabled;
}
