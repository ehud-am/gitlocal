import { describe, expect, it } from 'vitest'
import {
  createApp,
  getPickerPath,
  getRepoPath,
  setPickerPath,
  setRepoPath,
} from '../../src/index.js'

describe('package entry', () => {
  it('exports the non-executing server API', () => {
    expect(createApp).toEqual(expect.any(Function))

    setRepoPath('/tmp/repo')
    setPickerPath('/tmp')

    expect(getRepoPath()).toBe('/tmp/repo')
    expect(getPickerPath()).toBe('/tmp')
  })
})
