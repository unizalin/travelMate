import { publicDayServices, publicStopService } from '../src/data/publicDayExtras'
import { icelandPhotoSpots, cameraSettingsByPhotoSpotId } from '../src/data/icelandPhotography'
import { writeFileSync } from 'node:fs'
import { publicIcelandJourney } from '../src/data/icelandPublic'
import { publicLondonJourney } from '../src/data/londonPublic'
import { londonItinerary } from '../src/data/londonItinerary'
import { icelandFlights } from '../src/data/icelandFlights'
import { PACKING_TEMPLATE } from '../src/domain/packingChecklist'
import { preciseMapTerms } from '../src/data/icelandHandbook'
import { icelandDailyPace } from '../src/data/icelandDailyPace'
const items=[...publicLondonJourney.items,...publicIcelandJourney.items].filter(item=>item.status!=='fallback')
const titles: Record<string,string> = {
 '2026-10-30':'抵達冰島，開始環島旅程','2026-10-31':'斯奈山半島與教堂山','2026-11-01':'沿著黃金圈出發','2026-11-02':'瀑布、黑沙灘與南岸','2026-11-03':'峽谷、鑽石沙灘與蝙蝠山','2026-11-04':'走進瓦特納冰原的藍冰洞','2026-11-05':'冰河湖遊船，返回雷克雅維克','2026-11-06':'火山與雷克雅維克散步','2026-11-07':'藍湖與返程',
}
for(const day of londonItinerary.days)titles[day.date]=day.title
const data={
 days:[...new Set(items.map(item=>item.date))].sort().map(date=>({date,title:titles[date]||date,region:date<'2026-10-30'?'倫敦':'冰島',pace:icelandDailyPace[date]??null,services:publicDayServices[date]??[],items:items.filter(item=>item.date===date).sort((a,b)=>a.order-b.order).map(item=>({id:item.id,name:item.name,service:publicStopService(item.name)??null,photoSpots:icelandPhotoSpots[item.name]??[],location:item.location,navigationTerm:Object.entries(preciseMapTerms).find(([name])=>item.name.includes(name))?.[1] || `${item.name}, ${date<'2026-10-30' ? (date==='2026-10-26'?'Cambridge / London':'London') : 'Iceland'}`,notes:item.notes??'',plannedStart:item.plannedStart??null,plannedEnd:item.plannedEnd??null}))})),
 flights:icelandFlights,packing:PACKING_TEMPLATE,cameraSettings:cameraSettingsByPhotoSpotId,
}
writeFileSync('artifacts/uiux-airbnb-20261022/data.js','window.PROTOTYPE_DATA = '+JSON.stringify(data).replace(/</g,'\\u003c')+';\n')
console.log(`Prototype public data: ${data.days.length} days, ${data.flights.length} flights, ${data.packing.reduce((n,g)=>n+g.items.length,0)} packing items.`)
