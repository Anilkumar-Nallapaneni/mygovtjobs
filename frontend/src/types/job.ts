/** Display shape for job cards and detail (demo + live). */
export type JobPost = {
  post?: string
  vacancies?: number
  pay?: string
  categoryVacancies?: Record<string, number>
}

export type DisplayJob = {
  id?: string | number
  slug?: string
  title?: string
  dept?: string
  state?: string
  stateIds?: string[]
  category?: string
  vacancies?: number
  qual?: string
  eduFilterKey?: string | null
  lastDate?: string
  applyStart?: string
  salary?: string
  age?: string
  type?: string
  status?: string
  officialUrl?: string
  applyUrl?: string
  pdfUrl?: string | null
  pdfUrls?: string[]
  about?: string
  detail?: Record<string, unknown>
  posts?: JobPost[]
  isLive?: boolean
  [key: string]: unknown
}
