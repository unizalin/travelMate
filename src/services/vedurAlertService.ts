export type VedurLevel = 'yellow' | 'orange' | 'red'
export type VedurAlert = {
  level: VedurLevel
  area: string
  headline: string
  startsAt: string
  endsAt: string
}
export type VedurAlertResult =
  | { kind: 'available'; alerts: VedurAlert[]; fetchedAt: string }
  | { kind: 'unavailable'; alerts: []; fetchedAt: string }

type LoadOptions = { signal?: AbortSignal; fetchImpl?: (url: string, init?: RequestInit) => Promise<Response> }
type RecordValue = Record<string, unknown>
const severity: Record<VedurLevel, number> = { yellow: 1, orange: 2, red: 3 }
const relevantRegions = new Set([
  'Iceland', 'Reykjavik - Capital Region', 'South Iceland',
  'Faxafloi - Southwest Iceland', 'Breidafjordur - Westnorthwest Iceland',
  'East Iceland', 'Eastfjords', 'Southeast Iceland',
  'Allt landið', 'Höfuðborgarsvæðið', 'Suðurland', 'Faxaflói',
  'Breiðafjörður', 'Austurland að Glettingi', 'Austfirðir', 'Suðausturland',
])
const otherRegions = new Set([
  'Westfjords', 'Northwest Iceland', 'Northeast Iceland',
  'Central highlands - Uninhabited part of Iceland',
  'Vestfirðir', 'Norðvesturland', 'Norðausturland', 'Miðhálendi',
])

function record(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function arrayOrSingle(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value == null ? [] : [value]
}
function validTime(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
}
function color(info: RecordValue): VedurLevel | null {
  const parameter = arrayOrSingle(info.parameter).find(value => record(value) && typeof value.valueName === 'string' && value.valueName.toLowerCase() === 'color')
  const value = record(parameter) && typeof parameter.value === 'string' ? parameter.value.toLowerCase() : ''
  return value === 'yellow' || value === 'orange' || value === 'red' ? value : null
}
function areaDetails(info: RecordValue): { label: string; relevant: boolean } | null {
  const areas = arrayOrSingle(info.area)
  if (!areas.length || !areas.every(record)) return null
  const labels: string[] = []
  const regions: string[] = []
  for (const area of areas) {
    const geo = arrayOrSingle(area.geocode).find(value => record(value) && value.valueName === 'Forecast Region')
    const region = record(geo) && typeof geo.value === 'string' ? geo.value.trim() : ''
    const label = typeof area.areaDesc === 'string' && area.areaDesc.trim() ? area.areaDesc.trim() : region
    if (!label) return null
    labels.push(label)
    regions.push(region || label)
  }
  // An unrecognised region is shown rather than silently hiding a safety warning.
  return { label: [...new Set(labels)].join('、'), relevant: regions.some(region => relevantRegions.has(region) || !otherRegions.has(region)) }
}

/** Veður's /xhrreq alert feed contains CAP alert.info blocks. */
export function parseVedurAlerts(payload: unknown, now = new Date()): VedurAlert[] | null {
  if (!record(payload) || validTime(payload.now) === null || !record(payload.alert) || !record(payload.alert.data) || !Array.isArray(payload.alert.data.alerts)) return null
  const current = now.getTime()
  if (!Number.isFinite(current)) return null
  const parsed: VedurAlert[] = []
  for (const source of payload.alert.data.alerts) {
    if (!record(source)) return null
    const infos = arrayOrSingle(source.info)
    if (!infos.length || !infos.every(record)) return null
    const english = infos.filter(info => typeof info.language === 'string' && info.language.toLowerCase().startsWith('en'))
    for (const info of english.length ? english : infos) {
      const level = color(info)
      if (!level) continue
      const start = validTime(info.onset ?? source.sent)
      const end = validTime(info.expires)
      const area = areaDetails(info)
      if (start === null || end === null || !area || typeof info.headline !== 'string' || !info.headline.trim()) return null
      if (start > current || current >= end || !area.relevant) continue
      parsed.push({ level, area: area.label, headline: info.headline.trim(), startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() })
    }
  }
  return parsed.sort((a, b) => severity[b.level] - severity[a.level] || Date.parse(a.endsAt) - Date.parse(b.endsAt))
}

export async function loadVedurAlerts(options: LoadOptions = {}): Promise<VedurAlertResult> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (options.signal?.aborted) controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, 8000)
  try {
    const response = await (options.fetchImpl ?? fetch)('/api/vedur-alerts', { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new Error(`Veður 警報來源暫時無法讀取（${response.status}）。`)
    const payload: unknown = await response.json()
    if (controller.signal.aborted) throw new Error('Veður 警報讀取逾時。')
    const alerts = parseVedurAlerts(payload)
    if (!alerts) throw new Error('Veður 警報格式不完整。')
    return { kind: 'available', alerts, fetchedAt: new Date().toISOString() }
  } catch {
    return { kind: 'unavailable', alerts: [], fetchedAt: new Date().toISOString() }
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abort)
  }
}
