/* 设备识别：OS / 设备类型 / 微信环境 / PWA，用于自适应 UI */
export type DeviceOS = 'ios' | 'android' | 'harmony' | 'desktop'
export type DeviceClass = 'phone' | 'tablet' | 'desktop'

export function detectOS(ua: string): DeviceOS {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document) return 'ios'
  if (/HarmonyOS|OpenHarmony|ArkWeb/i.test(ua)) return 'harmony'
  if (/Android|Adr\b|HUAWEI|Xiaomi|OPPO|vivo/i.test(ua)) return 'android'
  return 'desktop'
}

export function detectClass(width: number): DeviceClass {
  if (width < 640) return 'phone'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

export function applyDeviceAttributes(): void {
  if (typeof document === 'undefined') return
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const el = document.documentElement
  el.dataset.os = detectOS(ua)
  el.dataset.device = detectClass(typeof window !== 'undefined' ? window.innerWidth : 1024)
  el.dataset.wechat = /MicroMessenger/i.test(ua) ? '1' : '0'
  const standalone = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)
  el.dataset.standalone = standalone ? '1' : '0'
}

export function installDeviceWatch(): void {
  applyDeviceAttributes()
  if (typeof window === 'undefined') return
  window.addEventListener('resize', applyDeviceAttributes)
  window.addEventListener('orientationchange', applyDeviceAttributes)
}
