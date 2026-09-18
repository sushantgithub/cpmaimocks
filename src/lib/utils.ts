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
