/** Jobs imported from structured recruitment catalog (rich sections + official links). */
export const STRUCTURED_IMPORT_SOURCE = 'structured-import'

const STRUCTURED_IMPORT_SOURCES = new Set([STRUCTURED_IMPORT_SOURCE, 'fja-import'])

export function isStructuredImportSource(source: unknown): boolean {
  return STRUCTURED_IMPORT_SOURCES.has(String(source || ''))
}
