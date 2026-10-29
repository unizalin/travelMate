import { sharedStops } from '../../shared/iceland-stops.mjs'
import { londonItinerary } from '../../shared/london-itinerary.mjs'
import { loadLineWeather } from './line-weather.mjs'

const londonStops = londonItinerary.days.flatMap(day => day.stops.map(stop => ({ ...stop, date: day.date, location: stop.note })))
const itineraryStops = [...londonStops, ...sharedStops]
const itineraryDates = [...new Set(itineraryStops.map(stop => stop.date))]
const itineraryToday = now => {
  const londonDate = new Intl.DateTimeFormat('en-CA', { timeZone: londonItinerary.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  return londonDate < '2026-10-30' ? londonDate : now.toISOString().slice(0, 10)
}

const green = '#246757', ink = '#253C35', muted = '#64766E'
const text = (value, options = {}) => ({ type: 'text', text: value, size: 'sm', color: ink, wrap: true, ...options })
const button = (label, action, primary = false) => ({ type: 'button', style: primary ? 'primary' : 'link', height: 'sm', color: green, action: { label, ...action } })
const messageButton = (label, command) => button(label, { type: 'message', text: command })
const uriButton = (label, uri, primary = false) => button(label, { type: 'uri', uri }, primary)
export const queryQuickReply = { items: ['今日行程', '完整旅程', '天氣／極光', '行前準備', '通知設定'].map(label => ({ type: 'action', action: { type: 'message', label, text: label } })) }

export function lineCard({ title, subtitle, lines, buttons = [], note, color = green }) {
  return { type: 'flex', altText: `${title}｜${subtitle}`.slice(0, 400), quickReply: queryQuickReply,
    contents: { type: 'bubble', size: 'mega',
      header: { type: 'box', layout: 'vertical', spacing: 'sm', backgroundColor: color, contents: [text('TRAVELMATE', { size: 'xs', color: '#FFFFFF' }), text(title, { size: 'xl', weight: 'bold', color: '#FFFFFF' }), text(subtitle, { size: 'xs', color: '#FFFFFF' })] },
      body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [...lines.map(line => text(line)), ...(note ? [text(note, { size: 'xs', color: muted })] : [])] },
      ...(buttons.length ? { footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: buttons } } : {}),
    } }
}

export function lineNotificationCard(origin) {
  return lineCard({ title: '隨問隨答，不主動推播', subtitle: 'LINE 查詢模式',
    lines: ['直接點選選單，查看行程、天氣與極光資訊。', 'LINE 主動極光提醒已關閉。查詢不需要綁定會員，也不會自動訂閱。', '想收到裝置通知，可到網站登入後另外設定。'],
    note: '已綁定的會員仍可輸入「解除綁定」。', buttons: [messageButton('查看天氣／極光', '天氣／極光'), uriButton('網站通知設定', `${origin}/iceland?section=me`)] })
}

function itineraryCard(date, origin, now, requested) {
  const today = itineraryToday(now)
  const stops = itineraryStops.filter(stop => stop.date === date)
  const before = today < itineraryDates[0], after = today > '2026-11-07'
  const lines = stops.map((stop, i) => `${String(i + 1).padStart(2, '0')}  ${stop.name}\n${stop.location}`)
  if (date === '2026-10-30') lines.unshift('BA802｜LHR 13:50 → KEF 17:15（當地時間）')
  if (date === '2026-11-07') lines.push('BA801｜KEF 11:55 → LHR 15:05（當地時間）', 'Blue Lagoon 與機場報到時間需再確認，勿視為已可銜接。')
  const london = date < '2026-10-30'
  const day = (london ? londonItinerary.days.map(day => day.date) : [...new Set(sharedStops.map(stop => stop.date))]).indexOf(date) + 1
  return lineCard({ title: `${london ? '倫敦 ' : ''}DAY ${day} · ${date.slice(5).replace('-', '/')}`, subtitle: requested ? '指定日期行程' : before ? '旅程尚未開始 · 先看第一天' : after ? '冰島旅程已結束 · 回看最後一天' : `今日行程 · ${london ? '倫敦' : '冰島'}時間`,
    lines, note: '公開行程快照。最新修改與已確認時間請以會員網站為準；此卡不含私人 Memo、住宿或旅伴資料。',
    buttons: [messageButton('其他日期', '完整旅程'), uriButton('查看網站行程', `${origin}/iceland?section=itinerary`, true)] })
}

export async function lineQueryCard(command, { origin, now = new Date(), loadWeather = loadLineWeather }) {
  const website = `${origin}/iceland`
  if (['通知設定', '綁定', '開啟極光提醒'].includes(command)) return lineNotificationCard(origin)
  const requested = /^行程 (\d{4}-\d\d-\d\d)$/.exec(command)?.[1]
  if (command === '今日行程' || requested) {
    const today = itineraryToday(now)
    const date = requested ?? (today < itineraryDates[0] ? itineraryDates[0] : today > '2026-11-07' ? '2026-11-07' : today)
    if (itineraryStops.some(stop => stop.date === date)) return itineraryCard(date, origin, now, !!requested)
  }
  if (command === '完整旅程') return lineCard({ title: '倫敦與冰島旅程', subtitle: '2026/10/24 — 11/07',
    lines: ['選一天，直接在聊天室查看景點。', '行程與時間為公開快照；會員共同編輯內容請到網站查看。'],
    buttons: itineraryDates.map(date => messageButton(`${date < '2026-10-30' ? '倫敦' : '冰島'} · ${date.slice(5).replace('-', '/')}`, `行程 ${date}`)) })
  if (['天氣／極光', '天氣', '極光'].includes(command)) {
    let result
    try { result = await loadWeather(now) } catch { result = null }
    const f = result?.forecast
    const valid = result?.date === now.toISOString().slice(0, 10) && result?.fetchedAt === now.toISOString()
    const lines = valid && f ? [
      `今日溫度  ${f.min}～${f.max} °C`,
      `最大風速  ${f.wind === null ? '資料不足' : `${f.wind} m/s`}`,
      `降雨機率  ${f.rain === null ? '資料不足' : `${f.rain} %`}`,
      `未來三小時雲量  ${f.cloudMin === null ? '資料不足' : `${f.cloudMin}～${f.cloudMax} %`}`,
      '極光觀測還需夜色、地磁活動與現場條件。雲少不代表一定看得到。',
    ] : ['目前無法取得有效天氣資料，請稍後點選「重新查詢」。', '沒有有效資料時，不會推定適合觀測極光。']
    if (now.toISOString().slice(0, 10) < '2026-10-30') lines.unshift('旅程尚未開始，以下是今日 Reykjavík 天氣，並非出發日預報。')
    return lineCard({ title: '天氣與極光觀測', subtitle: `${valid ? result.city : '冰島'} · ${now.toISOString().slice(0, 16).replace('T', ' ')}（冰島）`, lines,
      note: '來源：Open-Meteo。查詢時間如上；僅涵蓋所標城市，非全島路況或官方警報。', color: '#356480',
      buttons: [messageButton('重新查詢', '天氣／極光'), uriButton('Veður 官方天氣', 'https://en.vedur.is/'), uriButton('網站詳細資訊', website, true)] })
  }
  if (command === '行前準備') return lineCard({ title: '冰島行前準備', subtitle: '出發前，先確認這幾件事',
    lines: ['證件／交通：護照、駕照與租車所需文件、航班與行李規則。', '衣物／裝備：防風防水外層、保暖層、防滑鞋；泡湯備泳衣。', '每日出發：查看天氣、道路與安全公告，勿跨封閉線。'],
    note: '個人勾選清單與預約確認留在會員網站。實際文件需求以航空公司及租車業者要求為準。',
    buttons: [uriButton('開啟準備清單', `${website}?section=more`, true), uriButton('SafeTravel 安全資訊', 'https://safetravel.is/')] })
  return lineCard({ title: command === '開啟網站' ? '旅程放在手邊' : '想查看哪一項？', subtitle: 'TravelMate · 冰島旅伴助手',
    lines: ['點選下方按鈕，在聊天室查看內容。', '共同編輯、Memo、住宿與記帳，請到網站登入後使用。'],
    buttons: [messageButton('今日行程', '今日行程'), messageButton('天氣／極光', '天氣／極光'), messageButton('行前準備', '行前準備'), uriButton('開啟 TravelMate', website, true)] })
}
