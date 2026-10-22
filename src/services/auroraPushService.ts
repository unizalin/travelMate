import { notificationSupport } from '@/domain/notificationSupport'
export type PushState = { enabled: boolean; scope?: 'trip' | 'tonight'; cityId?: string; expiresAt?: string }
export function deviceStandalone() {
 return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true))
}
export function deviceNotificationSupport() {
 const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
 const standalone = deviceStandalone()
 return notificationSupport({ secure: globalThis.isSecureContext, worker: 'serviceWorker' in navigator, notifications: 'Notification' in window, push: 'PushManager' in window, ios, standalone: Boolean(standalone) })
}
export async function getPushConfig(): Promise<{ publicKey: string; local: boolean }> {
 const response = await fetch('/api/aurora-notifications/config', { signal: AbortSignal.timeout(8000) }).catch(() => { throw new Error('提醒服務尚未連線，請稍後重新檢查。') })
 const value: unknown = await response.json().catch(() => null)
 if (!response.ok || !value || typeof value !== 'object' || !('ready' in value) || value.ready !== true || !('publicKey' in value) || typeof value.publicKey !== 'string') throw new Error('提醒服務尚未連線，請稍後重新檢查。')
 return { publicKey: value.publicKey, local: 'local' in value && value.local === true }
}
async function request(action: string, body: object): Promise<PushState> {
 const { supabase } = await import('@/services/supabase')
 const { data, error } = await supabase.auth.getSession()
 if (error || !data.session) throw new Error('請先登入，再設定這部裝置的提醒。')
 const response = await fetch(`/api/aurora-notifications/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) })
 const value: unknown = await response.json()
 if (!response.ok) throw new Error(value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error : '提醒設定未儲存，請重試。')
 if (!value || typeof value !== 'object' || !('enabled' in value) || typeof value.enabled !== 'boolean') throw new Error('提醒服務回應無效，設定尚未確認。')
 const state: PushState = { enabled: value.enabled, scope: 'scope' in value && value.scope === 'trip' ? 'trip' : 'tonight', cityId: 'cityId' in value && typeof value.cityId === 'string' ? value.cityId : undefined, expiresAt: 'expiresAt' in value && typeof value.expiresAt === 'string' ? value.expiresAt : undefined }
 if(action!=='status')window.dispatchEvent(new CustomEvent('tripbook-push-state', { detail: {accountId:data.session.user.id,state} }))
 return state
}
export async function preparePushRegistration(): Promise<ServiceWorkerRegistration> {
 await navigator.serviceWorker.register('/sw.js', { scope: '/' })
 let timer: ReturnType<typeof setTimeout> | undefined
 try {
  return await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('通知服務初始化逾時，請重新檢查。')), 10000) })])
 } finally { clearTimeout(timer) }
}
export async function currentPushState(registration: ServiceWorkerRegistration): Promise<PushState> {
 const subscription = await registration.pushManager.getSubscription()
 return subscription ? request('status', { endpoint: subscription.endpoint }) : { enabled: false }
}
export async function enableAuroraPush(registration: ServiceWorkerRegistration, publicKey: string): Promise<PushState> {
 if (Notification.permission === 'denied') throw new Error('通知已被封鎖，請先到瀏覽器設定允許。')
 const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
 if (permission !== 'granted') throw new Error('尚未允許通知，整趟提醒未啟用。')
 const binary = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(publicKey.length / 4) * 4, '='))
 const key = new Uint8Array(binary.length)
 for (let index = 0; index < binary.length; index++) key[index] = binary.charCodeAt(index)
 let subscription = await registration.pushManager.getSubscription()
 if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
 const state = await request('subscribe', { endpoint: subscription.endpoint, subscription: subscription.toJSON() })
 if (!state.enabled || state.scope!=='trip') throw new Error('服務尚未確認整趟提醒訂閱，請重試。')
 return state
}
export async function disableAuroraPush(registration: ServiceWorkerRegistration): Promise<PushState> {
 const subscription = await registration.pushManager.getSubscription()
 if (!subscription) return { enabled: false }
 const state = await request('unsubscribe', { endpoint: subscription.endpoint })
 return state
}
