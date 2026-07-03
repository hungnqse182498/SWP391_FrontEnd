export function toUtcIsoString(value: Date | string) {
  return new Date(value).toISOString()
}

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

export function parseBackendUtcDate(value: string | Date) {
  if (value instanceof Date) return value

  const trimmed = value.trim()
  const hasTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(trimmed)
  const normalized = hasTimeZone ? trimmed : `${trimmed.replace(' ', 'T')}Z`

  return new Date(normalized)
}

export function formatUtcToVietnamDateTime(value?: string | null) {
  if (!value) return ''

  const date = parseBackendUtcDate(value)
  if (Number.isNaN(date.getTime())) return value

  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${get('hour')}:${get('minute')} ${get('day')}/${get('month')}/${get('year')}`
}

export function formatUtcToVietnamDate(value?: string | null) {
  if (!value) return ''

  const date = parseBackendUtcDate(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatNowInVietnamTime() {
  return formatUtcToVietnamDateTime(new Date().toISOString())
}
