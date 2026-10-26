import test from 'node:test'
import assert from 'node:assert/strict'
import { lineQueryCard } from '../../scripts/lib/line-cards.mjs'
import { parseLineWeather, loadLineWeather } from '../../scripts/lib/line-weather.mjs'
const origin = 'https://example.test', now = new Date('2026-11-02T16:30:00Z')
const payload = () => ({ utc_offset_seconds: 0, daily_units: { temperature_2m_min: '°C', temperature_2m_max: '°C', wind_speed_10m_max: 'm/s', precipitation_probability_max: '%' },
  daily: { time: ['2026-11-02'], temperature_2m_min: [-1], temperature_2m_max: [4], wind_speed_10m_max: [8], precipitation_probability_max: [60] }, hourly_units: { cloud_cover: '%' }, hourly: { time: ['2026-11-02T15:00','2026-11-02T17:00','2026-11-02T18:00','2026-11-02T19:00','2026-11-02T20:00'], cloud_cover: [0,20,70,40,0] } })

test('today card uses shared public stop order and a truthful before-trip/after-trip date', async () => {
  const card = await lineQueryCard('今日行程', { origin, now })
  const content = JSON.stringify(card)
  assert.equal(card.type, 'flex')
  assert.ok(content.indexOf('Dyrhólaey') < content.indexOf('Reynisfjara'))
  assert.match(content, /公開行程快照/)
  assert.match(card.altText, /11\/02/)
  const before = await lineQueryCard('今日行程', { origin, now: new Date('2026-10-26T23:00:00+08:00') })
  assert.match(before.altText, /10\/30.*尚未開始/)
  const after = await lineQueryCard('今日行程', { origin, now: new Date('2026-11-08T00:00:00Z') })
  assert.match(after.altText, /11\/07.*已結束/)
  assert.match(JSON.stringify(after), /Blue Lagoon.*機場/)
})

test('date buttons send a message to receive another reply rather than opening a URL', async () => {
  const card = await lineQueryCard('完整旅程', { origin, now })
  assert.equal(card.contents.footer.contents.length, 9)
  for (const button of card.contents.footer.contents) {
    assert.equal(button.action.type, 'message')
    const day = await lineQueryCard(button.action.text, { origin, now })
    assert.match(day.altText, /指定日期/)
  }
})

test('weather validates dates, units, nullable numbers and limits clouds to the next three hours', async () => {
  const forecast = parseLineWeather(payload(), now)
  assert.deepEqual(forecast, { min: -1, max: 4, wind: 8, rain: 60, cloudMin: 20, cloudMax: 70 })
  const wrong = payload(); wrong.daily_units.wind_speed_10m_max = 'km/h'
  assert.equal(parseLineWeather(wrong, now), null)
  assert.equal(parseLineWeather(payload(), new Date('2026-11-04')), null)
  const missing = payload(); missing.daily.wind_speed_10m_max = [null]; missing.hourly.cloud_cover = [null,null,null,null,null]
  assert.equal(parseLineWeather(missing, now).wind, null)
  assert.equal(parseLineWeather(missing, now).cloudMin, null)
  const result = await loadLineWeather(now, async (url, options) => {
    assert.match(url, /^https:\/\/api.open-meteo.com\/v1\/forecast\?/)
    assert.match(url, /wind_speed_unit=ms/)
    assert.ok(options.signal)
    return Response.json(payload())
  })
  const card = await lineQueryCard('天氣', { origin, now, loadWeather: async () => result })
  assert.match(JSON.stringify(card), /-1～4 °C/)
  assert.match(JSON.stringify(card), /20～70 %/)
  assert.match(card.altText, /Vík.*2026-11-02 16:30/)
})

test('weather failure or stale result produces an honest unavailable card, no invented readings', async () => {
  const broken = await loadLineWeather(now, async () => { throw Error('offline') })
  assert.equal(broken.forecast, null)
  for (const loadWeather of [async () => broken, async () => { throw Error('offline') }, async () => ({ date: '2020-01-01', fetchedAt: now.toISOString(), forecast: parseLineWeather(payload(), now) })]) {
    const card = await lineQueryCard('極光', { origin, now, loadWeather })
    assert.match(JSON.stringify(card), /無法取得有效天氣資料/)
    assert.doesNotMatch(JSON.stringify(card), /-1～4/)
  }
})
