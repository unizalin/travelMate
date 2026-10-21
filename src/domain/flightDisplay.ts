import { instantForLocalDateTime } from './tripJourney'
import type { IcelandFlight } from '@/data/icelandFlights'
const zones:Record<string,string>={LHR:'Europe/London',KEF:'Atlantic/Reykjavik',AMS:'Europe/Amsterdam',TPE:'Asia/Taipei',BKK:'Asia/Bangkok'}
export function taiwanFlightTime(flight: IcelandFlight) {
 const format=(date:string|null,time:string,airport:string)=>{if(!date||!zones[airport])return '日期待補';const instant=instantForLocalDateTime(date,time,zones[airport]);return instant===null?'時間待確認':new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(instant)}
 return `${format(flight.date,flight.departure,flight.from)} → ${format(flight.arrivalDate,flight.arrival,flight.to)}`
}
