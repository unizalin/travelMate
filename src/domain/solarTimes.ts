import { getTimes, getPosition } from 'suncalc'
export function solarTimes(date: string, latitude: number, longitude: number) {
  const times=getTimes(new Date(`${date}T12:00:00Z`),latitude,longitude)
  function crossing(a: Date,b: Date,rising: boolean) {
    let low=a.getTime(),high=b.getTime()
    if(!Number.isFinite(low)||!Number.isFinite(high)) return null
    for(let i=0;i<32;i++){const middle=(low+high)/2; const above=getPosition(new Date(middle),latitude,longitude).altitude>-4*Math.PI/180;if(above===rising)high=middle;else low=middle}
    return new Date((low+high)/2)
  }
  const format=(value: Date|null)=>value && Number.isFinite(value.getTime()) ? new Intl.DateTimeFormat('en-GB',{timeZone:'Atlantic/Reykjavik',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(value):null
  return {sunrise:format(times.sunrise),sunset:format(times.sunset),morning:[format(times.dawn),format(crossing(times.dawn,times.sunrise,true))],evening:[format(crossing(times.sunset,times.dusk,false)),format(times.dusk)]}
}
