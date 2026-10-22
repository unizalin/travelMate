import {expect,it} from 'vitest'
import {proactiveReminders} from '@/domain/proactiveReminders'
it.each([
 [{member:true,standalone:false,enabled:false,date:'2026-10-30'},{install:true,aurora:false}],
 [{member:true,standalone:true,enabled:false,date:'2026-10-30'},{install:false,aurora:true}],
 [{member:true,standalone:true,enabled:true,date:'2026-10-30'},{install:false,aurora:false}],
 [{member:false,standalone:false,enabled:false,date:'2026-10-30'},{install:false,aurora:false}],
 [{member:true,standalone:true,enabled:false,date:'2026-11-07T12:00:00.000Z'},{install:false,aurora:false}],
 [{member:true,standalone:true,enabled:false,date:'2026-10-23'},{install:false,aurora:true}],
 [{member:true,standalone:false,enabled:true,date:'2026-10-30'},{install:false,aurora:false}],
 [{member:true,standalone:true,enabled:false,date:'2026-11-07T02:00:00Z'},{install:false,aurora:true}],
])('shows the appropriate install and trip reminder chain', (input,expected)=>{expect(proactiveReminders(input)).toEqual(expected)})
