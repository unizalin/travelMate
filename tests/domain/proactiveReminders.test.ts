import {expect,it} from 'vitest'
import {proactiveReminders} from '@/domain/proactiveReminders'
it.each([
 [{member:true,standalone:false,enabled:false,date:'2026-10-30'},{install:true,aurora:false}],
 [{member:true,standalone:true,enabled:false,date:'2026-10-30'},{install:false,aurora:true}],
 [{member:true,standalone:true,enabled:true,date:'2026-10-30'},{install:false,aurora:false}],
 [{member:false,standalone:false,enabled:false,date:'2026-10-30'},{install:false,aurora:false}],
 [{member:true,standalone:true,enabled:false,date:'2026-11-07'},{install:false,aurora:false}],
])('shows the appropriate install and tonight reminder chain', (input,expected)=>{expect(proactiveReminders(input)).toEqual(expected)})
