import { describe, expect, it } from 'vitest'
import { deviceKind, isInAppBrowser } from './device.ts'

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0 (iPhone15,2; iOS 18_0; pt_BR)',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  androidFacebook:
    'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
  ipadOS:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
}

describe('isInAppBrowser', () => {
  it('detecta Instagram e Facebook', () => {
    expect(isInAppBrowser(UA.iphoneInstagram)).toBe(true)
    expect(isInAppBrowser(UA.androidFacebook)).toBe(true)
  })

  it('não confunde com navegador comum', () => {
    expect(isInAppBrowser(UA.iphoneSafari)).toBe(false)
    expect(isInAppBrowser(UA.androidChrome)).toBe(false)
  })
})

describe('deviceKind', () => {
  it('classifica os aparelhos', () => {
    expect(deviceKind(UA.iphoneSafari)).toBe('ios')
    expect(deviceKind(UA.androidChrome)).toBe('android')
    expect(deviceKind(UA.iphoneInstagram)).toBe('in_app')
    expect(deviceKind(UA.windowsChrome)).toBe('desktop')
  })

  it('iPad que se apresenta como Mac é ios quando tem toque', () => {
    expect(deviceKind(UA.ipadOS, 5)).toBe('ios')
    expect(deviceKind(UA.ipadOS, 0)).toBe('desktop')
  })
})
