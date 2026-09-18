import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

// Indicative only — customers are always charged in INR and their bank sets
// the real rate. Update this by hand when it drifts too far to be useful.
const INR_PER_USD = 88

export function approxUsd(inrAmount: number) {
  if (inrAmount <= 0) return null
  return `$${Math.round(inrAmount / INR_PER_USD)}`
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// A plan this long never meaningfully expires, so it is shown as lifetime
// access and never gets an expiry date or a renewal reminder.
export const LIFETIME_DAYS = 36500

export function isLifetime(durationDays: number) {
  return durationDays >= LIFETIME_DAYS
}

export function planPeriodLabel(durationDays: number) {
  if (isLifetime(durationDays)) return 'lifetime'
  if (durationDays >= 28 && durationDays <= 31) return 'month'
  if (durationDays >= 88 && durationDays <= 93) return '3 months'
  if (durationDays >= 178 && durationDays <= 186) return '6 months'
  if (durationDays >= 360 && durationDays <= 370) return 'year'
  return `${durationDays} days`
}

export function accessUntilLabel(endDate: Date | string, durationDays: number) {
  return isLifetime(durationDays) ? 'Lifetime access' : `Access until ${formatDate(endDate)}`
}

export function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(text: string, length: number) {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

export function getScoreGrade(score: number) {
  if (score >= 90) return { label: 'Excellent', color: 'text-green-600' }
  if (score >= 75) return { label: 'Good', color: 'text-blue-600' }
  if (score >= 60) return { label: 'Average', color: 'text-yellow-600' }
  return { label: 'Needs Improvement', color: 'text-red-600' }
}
