import { app } from 'electron'
import { is } from '@electron-toolkit/utils'

/** Unpackaged and dev builds never check for or install updates. */
export function areUpdatesDisabled(): boolean {
  // ponytail: ORCA_FORK_NO_UPDATES is a fork-only switch set by its launcher, so upstream releases never replace a locally built fork.
  return !app.isPackaged || is.dev || process.env.ORCA_FORK_NO_UPDATES === '1'
}
