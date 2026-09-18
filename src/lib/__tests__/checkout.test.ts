import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ prisma: {} }))
vi.mock('@/lib/email', () => ({ sendPaymentConfirmationEmail: vi.fn() }))

import { computeDiscount } from '@/lib/checkout'

describe('computeDiscount', () => {
  it('applies a percentage of the plan price', () => {
    expect(computeDiscount({ discountType: 'PERCENTAGE', discountValue: 20 }, { price: 499 })).toBe(99.8)
  })

  it('applies a fixed amount', () => {
    expect(computeDiscount({ discountType: 'FIXED', discountValue: 100 }, { price: 499 })).toBe(100)
  })

  it('never exceeds the plan price', () => {
    expect(computeDiscount({ discountType: 'FIXED', discountValue: 5000 }, { price: 499 })).toBe(499)
    expect(computeDiscount({ discountType: 'PERCENTAGE', discountValue: 150 }, { price: 499 })).toBe(499)
  })

  it('never goes negative', () => {
    expect(computeDiscount({ discountType: 'FIXED', discountValue: -50 }, { price: 499 })).toBe(0)
  })

  it('rounds to paise', () => {
    expect(computeDiscount({ discountType: 'PERCENTAGE', discountValue: 33 }, { price: 999 })).toBe(329.67)
  })
})
