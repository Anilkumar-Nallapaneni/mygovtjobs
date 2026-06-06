/** Shared job shapes used across cards, detail, and adapters. */

export type JobDetailBlob = {
  pdfUrls?: string[]
  pdf_urls?: string[]
  pdfUrl?: string
  pdf_url?: string
  summary?: string
  source?: string
}

export type JobRecord = {
  id?: string
  slug?: string
  title?: string
  dept?: string
  category?: string
  state?: string
  stateIds?: string[]
  vacancies?: number
  rawVacancies?: number
  qual?: string
  salary?: string
  lastDate?: string
  last_date?: string
  publishedDate?: string
  published_at?: string
  apply_url?: string
  pdfUrl?: string
  pdfUrls?: string[]
  status?: string
  detail?: JobDetailBlob
  _enriched?: boolean
  _fromLive?: boolean
  [key: string]: unknown
}
