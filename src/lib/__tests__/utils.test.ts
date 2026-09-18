import { describe, it, expect } from 'vitest'
import { slugify, getScoreGrade, formatTime, approxUsd } from '@/lib/utils'

describe('slugify', () => {
  it('turns a domain name into a stable slug', () => {
    expect(slugify('AI Strategy & Planning')).toBe('ai-strategy-planning')
    expect(slugify('  Data   for AI ')).toBe('data-for-ai')
  })
})

describe('getScoreGrade', () => {
  it('maps scores to grade bands', () => {
    expect(getScoreGrade(95).label).toBe('Excellent')
    expect(getScoreGrade(90).label).toBe('Excellent')
    expect(getScoreGrade(75).label).toBe('Good')
    expect(getScoreGrade(60).label).toBe('Average')
    expect(getScoreGrade(59.9).label).toBe('Needs Improvement')
  })
})

describe('formatTime', () => {
  it('formats minutes and hours', () => {
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(65)).toBe('01:05')
    expect(formatTime(3661)).toBe('1:01:01')
  })
})

describe('approxUsd', () => {
  it('gives nothing for free plans', () => {
    expect(approxUsd(0)).toBeNull()
  })
  it('rounds to whole dollars', () => {
    expect(approxUsd(880)).toBe('$10')
  })
})
