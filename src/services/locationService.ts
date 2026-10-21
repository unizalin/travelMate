import { nearestIcelandRegion, type WeatherRegion } from '@/domain/tripWeather'
export function locateIcelandRegion(): Promise<WeatherRegion> {
  if (!globalThis.isSecureContext) return Promise.reject(new Error('定位需要 HTTPS 網址；請用正式網站或本機瀏覽器測試。'))
  if (!navigator.geolocation) return Promise.reject(new Error('這個瀏覽器不支援定位，仍可手動選地區。'))
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(position => {
    const region = nearestIcelandRegion(position.coords.latitude, position.coords.longitude)
    if (!region) { reject(new Error('目前位置不在冰島，已保留原本的行程地區。')); return }
    resolve(region)
  }, error => reject(new Error(error.code === 1 ? '定位未允許，仍可手動選擇地區。' : error.code === 3 ? '定位逾時，請重試或手動選地區。' : '目前無法取得位置，仍可手動選地區。')), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }))
}
