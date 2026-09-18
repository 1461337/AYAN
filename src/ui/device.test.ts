import { describe, expect, it } from 'vitest'
import { detectClass, detectOS } from './device'

describe('设备识别', () => {
  it('识别 iOS / 安卓 / 鸿蒙 / 桌面', () => {
    expect(detectOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')).toBe('ios')
    expect(detectOS('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile')).toBe('android')
    expect(detectOS('Mozilla/5.0 (Linux; HarmonyOS 4.0; HUAWEI Mate 60)')).toBe('harmony')
    expect(detectOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120')).toBe('desktop')
  })

  it('按宽度划分手机 / 平板 / 桌面', () => {
    expect(detectClass(390)).toBe('phone')
    expect(detectClass(820)).toBe('tablet')
    expect(detectClass(1440)).toBe('desktop')
    expect(detectClass(639)).toBe('phone')
    expect(detectClass(1024)).toBe('desktop')
  })
})
