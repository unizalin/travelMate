export type WeatherRegion = { id: string; label: string; latitude: number; longitude: number }
export type ClothingConditions = { apparentMin: number | null; apparentMax: number | null; precipitation: number | null; snowfall: number | null; wind: number | null; gusts: number | null }
export type WeatherDay = ClothingConditions & { date: string; temperatureMin: number | null; temperatureMax: number | null; precipitationProbability: number | null; sunrise: string | null; sunset: string | null }

const regions: Record<string, WeatherRegion> = {
  reykjavik: { id: 'reykjavik', label: 'Reykjavík 市區', latitude: 64.1466, longitude: -21.9426 },
  snaefellsnes: { id: 'snaefellsnes', label: 'Snæfellsnes／教堂山一帶', latitude: 64.924, longitude: -23.263 },
  golden: { id: 'golden', label: '黃金圈／Gullfoss 一帶', latitude: 64.327, longitude: -20.119 },
  vik: { id: 'vik', label: '南岸／Vík 一帶', latitude: 63.4186, longitude: -19.006 },
  lagoon: { id: 'lagoon', label: 'Jökulsárlón 冰河湖一帶', latitude: 64.0485, longitude: -16.1794 },
  hofn: { id: 'hofn', label: 'Höfn／東南岸一帶', latitude: 64.2539, longitude: -15.2082 },
  keflavik: { id: 'keflavik', label: 'Reykjanes／Keflavík 一帶', latitude: 64.0049, longitude: -22.5624 },
}
const tripRegions: Record<string, string[]> = {
  '2026-10-30': ['reykjavik'], '2026-10-31': ['snaefellsnes', 'reykjavik'],
  '2026-11-01': ['golden'], '2026-11-02': ['vik'], '2026-11-03': ['lagoon', 'hofn'],
  '2026-11-04': ['lagoon'], '2026-11-05': ['lagoon', 'reykjavik'],
  '2026-11-06': ['reykjavik', 'keflavik'], '2026-11-07': ['keflavik'],
}
export function weatherRegionsForDate(date: string): WeatherRegion[] {
  return (tripRegions[date] ?? []).map(id => regions[id])
}

export function clothingAdvice(day: ClothingConditions): string | null {
  const { apparentMin, apparentMax, precipitation, snowfall, wind, gusts } = day
  if (apparentMin == null || apparentMax == null || precipitation == null || snowfall == null || wind == null || gusts == null) return null
  if (![apparentMin, apparentMax, precipitation, snowfall, wind, gusts].every(Number.isFinite)) return null
  if (apparentMin > apparentMax || precipitation < 0 || snowfall < 0 || wind < 0 || gusts < 0) return null
  const layers = apparentMin <= 0
    ? '保暖底層＋中層與手套'
    : apparentMin <= 8 ? '長袖底層＋保暖中層' : '可增減的長袖分層'
  const weatherProtection = snowfall > 0
    ? '防水鞋與抓地鞋底'
    : precipitation > 0
      ? `防水外層與${wind >= 8 || gusts >= 12 ? '防水鞋，帽子固定' : '防水鞋'}`
      : wind >= 8 || gusts >= 12 ? '防風外層並固定帽子' : '隨身帶輕便外套'
  return `${layers}；${weatherProtection}。`
}

export function equipmentForActivities(names: string[]): string[] {
  const text = names.join(' ').toLowerCase()
  const reminders: string[] = []
  if (/blue lagoon|sky lagoon/.test(text)) reminders.push('泡湯：泳衣、換洗衣物與防水收納袋；毛巾是否提供以預訂內容為準。')
  if (/ice cave|冰洞/.test(text)) reminders.push('冰洞：保暖分層、防水外層與抓地良好的鞋；冰爪、頭盔等需求以業者行前通知為準。')
  if (/zodiac|boat tour/.test(text)) reminders.push('船班：防風防水外層、包覆鞋與手機固定繩；保暖及救生裝備依業者要求。')
  if (/volcano/.test(text)) reminders.push('火山活動：抓地良好的鞋、防風保暖層與飲水；路線和裝備依業者當日通知。')
  return reminders
}

export function nearestIcelandRegion(latitude: number, longitude: number): WeatherRegion | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 63 || latitude > 67.5 || longitude < -25 || longitude > -12) return null
  const scale = Math.cos(latitude * Math.PI / 180)
  return Object.values(regions).reduce((nearest, candidate) => {
    const distance = (region: WeatherRegion) => (latitude - region.latitude) ** 2 + ((longitude - region.longitude) * scale) ** 2
    return distance(candidate) < distance(nearest) ? candidate : nearest
  })
}
