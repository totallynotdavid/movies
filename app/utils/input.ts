export const noCorrect = {
  autocapitalize: 'off',
  autocorrect: 'off',
  autocomplete: 'off',
  spellcheck: 'false',
} as const

export const noPasswordManager = {
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-form-type': 'other',
} as const

export function isEditableElement(target: EventTarget | null): boolean {
  const node = target as HTMLElement | null
  if (!node) return false
  if (node.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)
}
