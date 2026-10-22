import type { WeatherDay } from './tripWeather'

export type PhotoScene = 'landscape' | 'water' | 'low-light' | 'moving' | 'night'
export type PhotoLens = 'f4' | 'f28' | 'travel-wide' | 'travel-tele'
export type PhotographyWeather = {
  day: WeatherDay
  fetchedAt: string
  regionLabel: string
  sunrise: string | null
  sunset: string | null
}
export const photoScenes: { value: PhotoScene; label: string }[] = [
  { value: 'landscape', label: '日間風景' }, { value: 'water', label: '流水慢門（有腳架）' },
  { value: 'low-light', label: '晨昏／冰洞' }, { value: 'moving', label: '人物移動／船上' }, { value: 'night', label: '夜景／極光' },
]
export const photoLenses: { value: PhotoLens; label: string; aperture: number }[] = [
  { value: 'f4', label: 'F4 變焦鏡', aperture: 4 }, { value: 'f28', label: 'F2.8 變焦鏡', aperture: 2.8 },
  { value: 'travel-wide', label: 'F3.5–6.7 旅遊鏡：廣角端', aperture: 3.5 },
  { value: 'travel-tele', label: 'F3.5–6.7 旅遊鏡：長焦端', aperture: 6.7 },
]
export function photoSceneForItem(name: string): PhotoScene {
  if (/zodiac|boat|船/i.test(name)) return 'moving'
  if (/ice cave|冰洞/i.test(name)) return 'low-light'
  if (/aurora|極光/i.test(name)) return 'night'
  return 'landscape'
}
type CameraAdvice = { mode: string; aperture: number | null; shutter: string; iso: string; notes: string[] }
const known = (value: number | null) => value !== null && Number.isFinite(value) && value >= 0
const atLeast = (value: number | null, limit: number) => value !== null && Number.isFinite(value) && value >= limit
const positive = (value: number | null) => value !== null && Number.isFinite(value) && value > 0

export function photographyAdvice(options: { date: string; scene: PhotoScene; lens: PhotoLens; weather: PhotographyWeather | null; now?: number }) {
  const { date, scene, lens } = options
  const candidate = options.weather
  const age = candidate ? (options.now ?? Date.now()) - Date.parse(candidate.fetchedAt) : NaN
  const weather = candidate?.day.date === date && age >= 0 && age < 30 * 60_000 ? candidate : null
  const day = weather?.day
  const windy = Boolean(day && (atLeast(day.wind, 10) || atLeast(day.gusts, 15)))
  const aperture = photoLenses.find(option => option.value === lens)?.aperture ?? 4
  const conditions: string[] = []
  if (!weather) conditions.push('尚無當日有效區域預報；以下依所選場景提供起始設定。')
  if (day) {
    if (windy) conditions.push('區域日預報風勢偏強：先找穩定站位，避免依賴慢門；這不是景點當下風速或官方警報。')
    if (positive(day.precipitation) || atLeast(day.precipitationProbability, 60)) conditions.push('日預報有降水或降水機率偏高：遮擋鏡頭、擦乾水滴，在遮蔽處更換鏡頭。')
    if (positive(day.snowfall)) conditions.push('日預報有雪：先檢查試拍高光；雪景若偏灰再略調亮，避免一次拉太亮。')
    if ([day.wind, day.gusts, day.precipitation, day.precipitationProbability, day.snowfall].some(value => !known(value))) conditions.push('部分風雨雪資料缺漏，不代表無風或不會下雨。')
    if (weather.sunrise || weather.sunset) conditions.push(`參考區域日出 ${weather.sunrise ?? '待確認'}／日落 ${weather.sunset ?? '待確認'}；請依實際拍攝時間選情境。`)
  }
  const phone = ['原生「照片」模式、1× 主鏡頭；點選主體對焦，再拖曳太陽圖示微調明暗。']
  let camera: CameraAdvice = { mode: 'A（光圈優先）', aperture: 8, shutter: '自動；手持盡量不慢於 1/125 秒，長焦或主體移動再加快', iso: 'Auto ISO，先以 100–3200 為參考範圍', notes: [] }
  if (scene === 'water') {
    phone.push(windy ? '先用照片模式把水流拍清楚；暫不使用 Live Photo 的慢門效果。' : '想拍水流先拍一張清楚的照片；支援 Live Photo 時，可拍後嘗試「長時間曝光」效果。效果不是手動快門，拍攝時保持手機穩定。')
    camera = { mode: 'M（手動）', aperture: 8, shutter: '1/4–1 秒起，需腳架與穩定站位', iso: 'ISO 100 起', notes: ['白天若過曝，可視需要用 ND；濾鏡濃度依試拍決定。浪區不為慢門靠近水線。'] }
  } else if (scene === 'low-light') {
    phone.push('先用照片模式；若出現夜間模式，可在支援機型上使用。有人移動時縮短可用的拍攝時間，或尋找較亮位置。')
    camera = { mode: 'A（光圈優先）', aperture, shutter: '自動；手持先檢查能否維持約 1/125 秒，必要時提高 ISO', iso: 'Auto ISO，先以 100–6400 為參考範圍', notes: ['先拍一張檢查晃動與高光；有移動主體可改 S 模式優先維持快門。'] }
  } else if (scene === 'moving') {
    phone.push('使用照片模式；支援時可連拍。船上用雙手穩住，避免夜間長時間拍攝。')
    camera = { mode: 'S（快門優先）', aperture: null, shutter: '1/500 秒起，依主體速度加快', iso: 'Auto ISO，先以 100–6400 為參考範圍', notes: ['光圈由相機決定；若畫面太暗，提高 ISO 或尋找更亮角度。'] }
  } else if (scene === 'night') {
    phone.push('支援時使用夜間模式，關閉閃光燈並固定手機；先用自動拍攝時間試拍。極光變動快時，選較短的可用時間，避免一律拉到最長。')
    camera = { mode: 'M（手動）', aperture, shutter: '1–5 秒起，需腳架；極光移動快時縮短', iso: 'ISO 1600 起，依試拍調整', notes: ['遠方亮點對焦後檢查是否清楚；現場太暗或鏡頭最大光圈較小時，需權衡 ISO、快門與雜訊。'] }
  }
  if (windy) {
    phone.push('日預報風勢偏強時，先穩住手機並避免長曝；以現場狀況決定是否繼續。')
    if (scene === 'water') camera = { mode: 'S（快門優先）', aperture: null, shutter: '1/500 秒起，優先手持拍清楚', iso: 'Auto ISO，先以 100–6400 為參考範圍', notes: ['先不套用慢門與 ND 組合；現場穩定且站位合適時，再考慮腳架慢門。'] }
    else camera.notes.push('先確認腳架與站位穩定；若會晃動就暫停長曝，不能靠延長快門補救。')
  }
  if (lens === 'travel-tele') camera.notes.push('旅遊變焦鏡的長焦端最大光圈以 f/6.7 為起點；中間焦段以鏡頭實際顯示為準，手持快門需隨焦段加快。')
  return {
    phone, camera, conditions, slowShutterAllowed: !windy,
    forecastLabel: weather ? `${date} · ${weather.regionLabel} 日預報 · 更新於 ${new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', timeZone: 'Atlantic/Reykjavik', hourCycle: 'h23' }).format(new Date(weather.fetchedAt))}（冰島時間）` : null,
  }
}
