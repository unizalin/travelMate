import { afterEach, describe, expect, it, vi } from 'vitest'
import { locateIcelandRegion } from '@/services/locationService'
afterEach(() => vi.unstubAllGlobals())
describe('One-shot location', () => {
  it('only requests location on an explicit call and returns a public region', async () => {
    const getCurrentPosition = vi.fn(success => success({ coords: { latitude:63.42, longitude:-19.01 } }))
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
    expect(getCurrentPosition).not.toHaveBeenCalled()
    await expect(locateIcelandRegion()).resolves.toMatchObject({ id:'vik' })
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  })
  it('keeps the itinerary location when permission is denied', async () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (_success: unknown, fail: (error: {code:number}) => void) => fail({ code:1 }) } })
    await expect(locateIcelandRegion()).rejects.toThrow('定位未允許')
  })
})
