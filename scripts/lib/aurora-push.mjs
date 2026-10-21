export const CITIES = {
 reykjavik:{label:'Reykjavík',lat:64.1466,lon:-21.9426}, vik:{label:'Vík',lat:63.4186,lon:-19.006}, jokulsarlon:{label:'Jökulsárlón',lat:64.0485,lon:-16.1794},
 snaefellsnes:{label:'Snæfellsnes／教堂山',lat:64.924,lon:-23.263}, golden:{label:'黃金圈',lat:64.327,lon:-20.119}, hofn:{label:'Höfn',lat:64.2539,lon:-15.2082}, keflavik:{label:'Reykjanes／Keflavík',lat:64.0049,lon:-22.5624},
}
export function notificationNight(now=new Date()) {
 const date=new Date(now)
 if (date.getUTCHours()<6) date.setUTCDate(date.getUTCDate()-1)
 return date.toISOString().slice(0,10)
}
export function nightExpiry(nightDate) { return new Date(Date.parse(`${nightDate}T12:00:00Z`)+86400000).toISOString() }
export function validSubscription(value) {
 try {
  if (!value || typeof value.endpoint!=='string' || value.endpoint.length>4096) return false
  const url=new URL(value.endpoint)
  const hosts=['fcm.googleapis.com','web.push.apple.com','updates.push.services.mozilla.com']
  if (url.protocol!=='https:' || url.username || url.password || url.hash || (url.port && url.port!=='443') || !hosts.includes(url.hostname)) return false
  if (!value.keys || !/^[A-Za-z0-9_-]+$/.test(value.keys.p256dh) || !/^[A-Za-z0-9_-]+$/.test(value.keys.auth)) return false
  const key=Buffer.from(value.keys.p256dh,'base64url'), auth=Buffer.from(value.keys.auth,'base64url')
  return key.length===65 && key[0]===4 && auth.length===16
 } catch { return false }
}
const instant=value=>typeof value==='string'?Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(value)?value:`${value}Z`):NaN
export function eligibleAuroraWindow({cloud,kp,now,nightDate}) {
 const sunriseDate=new Date(Date.parse(`${nightDate}T12:00:00Z`)+86400000).toISOString().slice(0,10)
 const sunset=instant(cloud?.daily?.sunset?.find(value=>typeof value==='string'&&value.startsWith(nightDate)))
 const sunrise=instant(cloud?.daily?.sunrise?.find(value=>typeof value==='string'&&value.startsWith(sunriseDate)))
 if (!Number.isFinite(sunset)||!Number.isFinite(sunrise)||sunrise<=sunset||!Array.isArray(cloud?.hourly?.time)||!Array.isArray(cloud?.hourly?.cloud_cover)||!Array.isArray(kp)) return null
 for (let index=0;index<cloud.hourly.time.length;index++) {
  const time=instant(cloud.hourly.time[index]), clouds=cloud.hourly.cloud_cover[index]
  if (!Number.isFinite(time)||time<=now.getTime()||time>now.getTime()+3*3600000||time<sunset||time>=sunrise||typeof clouds!=='number'||!Number.isFinite(clouds)||clouds<0||clouds>30) continue
  const activity=kp.find(row=>row&&['forecast','predicted','estimated'].includes(String(row.observed).toLowerCase())&&instant(row.time_tag)<=time&&time<instant(row.time_tag)+3*3600000)
  if (typeof activity?.kp==='number'&&Number.isFinite(activity.kp)&&activity.kp>=3&&activity.kp<=9) return new Date(time).toISOString().replace(':00.000Z','Z')
 }
 return null
}
export async function loadSources(cityId,nightDate) {
 const city=CITIES[cityId]
 if (!city) throw new Error('invalid_city')
 const params=new URLSearchParams({latitude:String(city.lat),longitude:String(city.lon),hourly:'cloud_cover',daily:'sunrise,sunset',forecast_days:'2',past_days:'1',timezone:'Atlantic/Reykjavik'})
 const get=async url=>{const response=await fetch(url,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('source_unavailable');return response.json()}
 const [cloud,kp]=await Promise.all([get(`https://api.open-meteo.com/v1/forecast?${params}`),get('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json')])
 return {cloud,kp,nightDate}
}
export async function checkSubscribers({records,now=new Date(),load=loadSources,send,save}) {
 const sources=new Map()
 for (const entry of records) {
  if (!entry.enabled) continue
  if (Date.parse(entry.expiresAt)<=now.getTime()) {entry.enabled=false;entry.subscription=null;await save();continue}
  if (!entry.subscription||entry.lastSentNight===entry.nightDate||(entry.attempts??0)>=3) continue
  const key=`${entry.cityId}/${entry.nightDate}`
  try {
   if (!sources.has(key)) sources.set(key,await load(entry.cityId,entry.nightDate))
   const window=eligibleAuroraWindow({...sources.get(key),now,nightDate:entry.nightDate})
   if (!window) continue
   entry.lastSentNight=entry.nightDate
   await save()
   try {
    await send(entry,{title:'今晚極光值得留意',body:`${CITIES[entry.cityId].label} 接下來有雲量較少、活動值得留意的時段；不保證可見，請查看最新條件。`,url:'/iceland?section=itinerary',tag:`aurora-${entry.nightDate}`,expiresAt:new Date(now.getTime()+10*60000).toISOString()})
   } catch(error) {
    entry.attempts=(entry.attempts??0)+1
    if (error?.statusCode===404||error?.statusCode===410) {entry.enabled=false;entry.subscription=null}
    else { entry.lastSentNight=null; if(entry.attempts>=3){entry.enabled=false;entry.subscription=null} }
    await save()
   }
  } catch { /* A source/storage failure never becomes an aurora alert. */ }
 }
}
