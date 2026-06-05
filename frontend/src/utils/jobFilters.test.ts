import { describe, expect, it, vi, afterEach } from 'vitest'
import { filterDisplayJobs, isJobExpired, parseLastDate } from './jobFilters'

describe('parseLastDate', () => {
  it('parses ISO dates', () => {
    expect(parseLastDate('2026-12-31')).toBeInstanceOf(Date)
  })

  it('returns null for empty or invalid values', () => {
    expect(parseLastDate('')).toBeNull()
    expect(parseLastDate('—')).toBeNull()
    expect(parseLastDate('not-a-date')).toBeNull()
  })
})

describe('isJobExpired', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when status is expired', () => {
    expect(isJobExpired({ status: 'expired', lastDate: '2099-01-01' })).toBe(true)
  })

  it('returns true when last date is in the past', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-03T12:00:00Z'))
    expect(isJobExpired({ status: 'live', lastDate: '2026-01-01' })).toBe(true)
  })

  it('returns false for live jobs with future last date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-03T12:00:00Z'))
    expect(isJobExpired({ status: 'live', lastDate: '2026-12-31' })).toBe(false)
  })
})

describe('filterDisplayJobs', () => {
  const officialJob = {
    title: 'SSC CGL 2026',
    dept: 'Staff Selection Commission',
    status: 'live',
    applyUrl: 'https://ssc.nic.in/apply',
    published_at: '2026-06-03T00:00:00Z',
    pdfUrl: 'https://ssc.nic.in/notice.pdf',
  }

  it('keeps official live jobs', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-05T12:00:00Z'))
    expect(filterDisplayJobs([officialJob])).toHaveLength(1)
  })

  it('drops draft and pending rows', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-05T12:00:00Z'))
    expect(filterDisplayJobs([{ ...officialJob, status: 'draft' }])).toHaveLength(0)
    expect(filterDisplayJobs([{ ...officialJob, status: 'pending' }])).toHaveLength(0)
  })

  it('drops aggregator links', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-05T12:00:00Z'))
    const blocked = {
      title: 'Some recruitment',
      status: 'live',
      applyUrl: 'https://www.sarkariresult.com/foo',
      published_at: '2026-06-03T00:00:00Z',
      pdfUrl: 'https://www.sarkariresult.com/foo/notice.pdf',
    }
    expect(filterDisplayJobs([blocked])).toHaveLength(0)
  })

  it('returns empty array for non-array input', () => {
    expect(filterDisplayJobs(null as unknown as never[])).toEqual([])
  })
})
