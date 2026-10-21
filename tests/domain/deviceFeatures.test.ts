import { describe, expect, it } from 'vitest'
import { nearestIcelandRegion } from '@/domain/tripWeather'
import { notificationSupport } from '@/domain/notificationSupport'
import { icelandMemberName } from '@/data/icelandMemberNames'

describe('Opt-in device features', () => {
  it('maps an Iceland position to a public reference region without exposing the coordinates', () => {
    expect(nearestIcelandRegion(63.42, -19.01)?.id).toBe('vik')
    expect(nearestIcelandRegion(25.03, 121.56)).toBeNull()
    expect(nearestIcelandRegion(NaN, -19)).toBeNull()
  })
  it('requires HTTPS, browser support and home screen installation where applicable', () => {
    const supported = { secure: true, push: true, worker: true, notifications: true, ios: false, standalone: false }
    expect(notificationSupport(supported)).toBe('ready')
    expect(notificationSupport({ ...supported, secure: false })).toBe('https-required')
    expect(notificationSupport({ ...supported, ios: true })).toBe('home-screen-required')
    expect(notificationSupport({ ...supported, ios: true, standalone: true })).toBe('ready')
    expect(notificationSupport({ ...supported, push: false })).toBe('unsupported')
  })
  it('uses the supplied six labels without binding anyone to an account', () => {
    expect([1,2,3,4,5,6].map(n => icelandMemberName(`member-${n}`))).toEqual(['U', 'jinyo', 'Kevin Ho か', 'Rosanne 🌹', 'YU', '思辰'])
    expect(icelandMemberName('other', '自訂姓名')).toBe('自訂姓名')
  })
})
