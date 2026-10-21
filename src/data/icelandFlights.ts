export interface IcelandFlight {
  id: string
  name: string
  from: string
  to: string
  date: string | null
  arrivalDate: string | null
  departure: string
  arrival: string
  group: string
  reminder?: string
}
export const icelandFlights: IcelandFlight[] = [
  { id: 'ba802', name: 'BA802', from: 'LHR', to: 'KEF', date: '2026-10-30', arrivalDate: '2026-10-30', departure: '13:50', arrival: '17:15', group: 'to-iceland', reminder: '線上報到開放時間依航空公司通知；抵達後依序入境、領行李、取車驗車。' },
  { id: 'fi0501', name: 'FI0501', from: 'AMS', to: 'KEF', date: '2026-10-30', arrivalDate: '2026-10-30', departure: '12:55', arrival: '15:20', group: 'to-iceland' },
  { id: 'ba801', name: 'BA801', from: 'KEF', to: 'LHR', date: '2026-11-07', arrivalDate: '2026-11-07', departure: '11:55', arrival: '15:05', group: 'from-iceland', reminder: 'Blue Lagoon 與航班銜接、退房、加油、還車及報到時間須依實際預約核對，保留機場緩衝。' },
  { id: 'fi0454', name: 'FI0454', from: 'KEF', to: 'LHR', date: '2026-11-07', arrivalDate: '2026-11-07', departure: '16:20', arrival: '19:30', group: 'from-iceland' },
  { id: 'ci0073', name: 'CI0073', from: 'TPE', to: 'AMS', date: '2026-10-29', arrivalDate: '2026-10-30', departure: '22:40', arrival: '07:15', group: 'outbound-taipei' },
  { id: 'br068-lhr', name: 'BR068', from: 'LHR', to: 'BKK', date: '2026-11-07', arrivalDate: null, departure: '21:20', arrival: '16:00', group: 'return-europe' },
  { id: 'ci0082', name: 'CI0082', from: 'LHR', to: 'TPE', date: '2026-11-07', arrivalDate: '2026-11-08', departure: '21:15', arrival: '18:25', group: 'return-europe' },
  { id: 'br068-bkk', name: 'BR068', from: 'BKK', to: 'TPE', date: null, arrivalDate: null, departure: '17:15', arrival: '21:50', group: 'return-asia' },
]
