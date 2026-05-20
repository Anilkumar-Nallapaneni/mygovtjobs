/** Best official PDF link for a live/API job row. */
export function resolvePdfUrl(row) {
  const detail = row?.detail || {}
  const fromDetail = detail.pdf_url || detail.pdfUrl
  if (fromDetail && String(fromDetail).includes('.pdf')) return fromDetail

  const list = detail.pdf_urls || detail.pdfUrls || []
  if (Array.isArray(list)) {
    const hit = list.find((u) => u && String(u).toLowerCase().includes('.pdf'))
    if (hit) return hit
  }

  const apply = row?.apply_url || row?.applyUrl
  if (apply && String(apply).toLowerCase().includes('.pdf')) return apply

  return fromDetail || (Array.isArray(list) ? list[0] : '') || ''
}
