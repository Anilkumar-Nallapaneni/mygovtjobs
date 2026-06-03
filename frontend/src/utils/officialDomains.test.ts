import { describe, expect, it } from 'vitest'
import {
  hostnameOf,
  isAllowedOfficialJob,
  isBlockedAggregatorHost,
  isOfficialRecruitmentUrl,
} from './officialDomains'

describe('hostnameOf', () => {
  it('extracts hostname from valid URLs', () => {
    expect(hostnameOf('https://ssc.nic.in/Portal/Apply')).toBe('ssc.nic.in')
  })

  it('returns empty string for invalid URLs', () => {
    expect(hostnameOf('not-a-url')).toBe('')
  })
})

describe('isBlockedAggregatorHost', () => {
  it('blocks known aggregator domains', () => {
    expect(isBlockedAggregatorHost('https://www.sarkariresult.com/jobs')).toBe(true)
  })

  it('allows official government domains', () => {
    expect(isBlockedAggregatorHost('https://employmentnews.gov.in/rss.xml')).toBe(false)
    expect(isBlockedAggregatorHost('https://ssc.nic.in/')).toBe(false)
  })
})

describe('isOfficialRecruitmentUrl', () => {
  it('accepts .gov.in and .nic.in hosts', () => {
    expect(isOfficialRecruitmentUrl('https://upsc.gov.in/exams')).toBe(true)
    expect(isOfficialRecruitmentUrl('https://ssc.nic.in/')).toBe(true)
  })

  it('rejects aggregators', () => {
    expect(isOfficialRecruitmentUrl('https://www.naukri.com/job')).toBe(false)
  })
})

describe('isAllowedOfficialJob', () => {
  it('allows jobs with official apply URLs only', () => {
    expect(
      isAllowedOfficialJob({
        title: 'SSC CGL 2026',
        applyUrl: 'https://ssc.nic.in/apply',
      })
    ).toBe(true)
  })

  it('rejects jobs linking to aggregators', () => {
    expect(
      isAllowedOfficialJob({
        title: 'Fake job',
        applyUrl: 'https://www.sarkariresult.com/x',
      })
    ).toBe(false)
  })
})
