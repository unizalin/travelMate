export function notificationSupport(device: { secure: boolean; push: boolean; worker: boolean; notifications: boolean; ios: boolean; standalone: boolean }): 'ready' | 'https-required' | 'home-screen-required' | 'unsupported' {
  if (!device.secure) return 'https-required'
  if (device.ios && !device.standalone) return 'home-screen-required'
  if (!device.push || !device.worker || !device.notifications) return 'unsupported'
  return 'ready'
}
