/**
 * One outfit sentence per Iceland day, matched to the day type in the
 * supplied photo book (waterfall days, ice cave day, boat day, lagoon day).
 * DayConditions uses these before its weather-based fallback so the line
 * is day-specific instead of the same generic sentence on every day.
 */
export const dayOutfitByDate: Record<string, string> = {
  '2026-10-30': '抵達日以取車、採買、休息為主：保暖底層＋防風防水外層，好走的鞋。',
  '2026-10-31': '海岬與瀑布日：防風防水外層＋保暖帽與手套，海邊風大、體感更冷。',
  '2026-11-01': '瀑布水霧日：防水外層＋防水褲，冰爪放隨身，鞋底要抓地。',
  '2026-11-02': '防水外層＋防水褲（瀑布水霧）、冰爪放隨身、帽子選能固定的。',
  '2026-11-03': '峽谷與冰河湖日：防風保暖外層＋防水鞋，湖邊風強、帽子選能固定的。',
  '2026-11-04': '冰洞日：防水保暖外層＋保暖手套，長時間在冰川上，底層要夠暖。',
  '2026-11-05': '船上活動日：防水保暖外層＋能固定的帽子，海風大、體感更冷。',
  '2026-11-06': '火山與市區日：防風保暖外層＋好走的鞋，火山區風大、步道要抓地。',
  '2026-11-07': '離開日：Blue Lagoon 泳衣隨身，保暖外層＋好走的鞋，先確認泡湯與航班銜接。',
}
