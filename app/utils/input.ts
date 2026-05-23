export const noCorrect = {
  autocapitalize: "off",
  autocorrect: "off",
  autocomplete: "off",
  spellcheck: "false",
} as const;

export const noPasswordManager = {
  "data-lpignore": "true",
  "data-1p-ignore": "true",
  "data-form-type": "other",
} as const;

export function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
