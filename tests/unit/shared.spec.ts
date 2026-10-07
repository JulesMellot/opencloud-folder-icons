import { decodeSharedPreference, encodeSharedPreference } from '../../src/shared'

const PNG = 'data:image/png;base64,iVBORw0KGgo='

describe('shared icon value', () => {
  it('round-trips icons, colors and images', () => {
    for (const pref of [
      { icon: 'music' },
      { icon: 'briefcase', color: 'blue' },
      { image: PNG }
    ] as const) {
      expect(decodeSharedPreference(encodeSharedPreference(pref))).toEqual(pref)
    }
  })

  it('never contains XML special characters', () => {
    for (const value of [
      encodeSharedPreference({ icon: 'folder-2', color: 'red' }),
      encodeSharedPreference({ image: PNG })
    ]) {
      expect(value).toMatch(/^[A-Za-z0-9+/=;-]+$/)
    }
  })

  it('encodes a reset as an empty value', () => {
    expect(encodeSharedPreference(undefined)).toBe('')
    expect(decodeSharedPreference('')).toBeUndefined()
  })

  it('rejects untrusted or unknown values', () => {
    for (const value of [
      '1;icon;../../evil;',
      '1;icon;music;#ff0000',
      '1;image;AA"><script>alert(1)</script>',
      `1;image;${'A'.repeat(40_000)}`,
      '2;icon;music;',
      'music',
      '{"icon":"music"}',
      42,
      null
    ]) {
      expect(decodeSharedPreference(value)).toBeUndefined()
    }
  })
})
