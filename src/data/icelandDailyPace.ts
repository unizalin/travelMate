/** Daily Plan B from the supplied photo book, adapted to the latest itinerary. */
export interface IcelandDailyPace { keep: string; skip: string }

export const icelandDailyPace: Record<string, IcelandDailyPace> = {
  '2026-10-30': { keep: '取車檢查、Costco 採買、提早休息', skip: '額外停靠點；採買須在營業時間內完成' },
  '2026-10-31': { keep: 'Ytri Tunga、Arnarstapi、Ingjaldshólskirkja、Kirkjufellsfoss、Sky Lagoon', skip: '額外停靠點與延長午餐；路況差時依安全狀況調整' },
  '2026-11-01': { keep: 'Þingvellir、Brúarfoss、Strokkur、Gullfoss、Kerið', skip: '額外停靠點；延誤時先縮短步道與停留' },
  '2026-11-02': { keep: 'Seljalandsfoss、Skógafoss、Dyrhólaey、Reynisfjara 與晚餐', skip: 'Gljúfrabúi 延伸步道；強風或封閉時取消非必要停留' },
  '2026-11-03': { keep: 'Fjaðrárgljúfur、Diamond Beach、Vestrahorn 與當晚住宿', skip: '額外停靠點；路況不佳時依安全狀況調整' },
  '2026-11-04': { keep: 'Blue Ice Cave Adventure', skip: '所有額外景點；依票面集合時間優先' },
  '2026-11-05': { keep: 'Zodiac、當日安全返回 Reykjavík', skip: 'City Walk、回程順訪景點、湖畔久留' },
  '2026-11-06': { keep: '已排火山 TOUR（集合時間依票券）；住宿與隔日機場準備', skip: '市區次要點；若會壓縮機場緩衝，先確認 11/7 泡湯安排' },
  '2026-11-07': { keep: 'Blue Lagoon；先核對所選航班與機場緩衝', skip: '額外停靠點；泡湯與航班若衝突，先核對預約再調整' },
}
