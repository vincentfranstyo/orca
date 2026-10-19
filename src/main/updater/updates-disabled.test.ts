import { afterEach, describe, expect, it, vi } from 'vitest'

const env = vi.hoisted(() => ({ isPackaged: true, dev: false }))
vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return env.isPackaged
    }
  }
}))
vi.mock('@electron-toolkit/utils', () => ({
  is: {
    get dev() {
      return env.dev
    }
  }
}))

import { areUpdatesDisabled } from './updates-disabled'

describe('areUpdatesDisabled', () => {
  afterEach(() => {
    env.isPackaged = true
    env.dev = false
    delete process.env.ORCA_FORK_NO_UPDATES
  })

  it('keeps updates on for a packaged release build', () => {
    expect(areUpdatesDisabled()).toBe(false)
  })

  it('turns updates off for unpackaged and dev builds', () => {
    env.isPackaged = false
    expect(areUpdatesDisabled()).toBe(true)
    env.isPackaged = true
    env.dev = true
    expect(areUpdatesDisabled()).toBe(true)
  })

  it('turns updates off for a packaged fork launched with ORCA_FORK_NO_UPDATES=1', () => {
    process.env.ORCA_FORK_NO_UPDATES = '1'
    expect(areUpdatesDisabled()).toBe(true)
  })
})
