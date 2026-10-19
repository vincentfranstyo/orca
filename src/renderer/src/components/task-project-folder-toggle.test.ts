import { describe, expect, it } from 'vitest'
import type { Repo } from '../../../shared/repo-types'
import {
  getTaskProjectFolders,
  isTaskProjectFolderSelected,
  toggleTaskProjectFolder
} from './task-project-source-combobox-model'

const repo = (id: string, projectGroupId?: string): Repo => ({
  id,
  path: `/w/${id}`,
  displayName: id,
  badgeColor: 'blue',
  addedAt: 1,
  ...(projectGroupId ? { projectGroupId } : {})
})
const groups = [repo('be', 'g1'), repo('page', 'g1'), repo('other')].map((r) => ({
  projectKey: r.id,
  repo: r,
  sources: [r]
}))
const [folder] = getTaskProjectFolders(groups, [
  { id: 'g1', name: 'hamra' },
  { id: 'empty', name: 'none' }
])

describe('task project folder toggle', () => {
  it('builds folders only for groups with members', () => {
    expect(folder.members.map((g) => g.repo.id)).toEqual(['be', 'page'])
  })

  it('selects all members, keeping other selections', () => {
    const next = toggleTaskProjectFolder(folder, new Set(['other', 'be']))
    expect(next && [...next].sort()).toEqual(['be', 'other', 'page'])
    expect(isTaskProjectFolderSelected(folder, next!)).toBe(true)
  })

  it('deselects all members when fully selected', () => {
    expect([...toggleTaskProjectFolder(folder, new Set(['be', 'page', 'other']))!]).toEqual([
      'other'
    ])
  })

  it('refuses to empty the selection', () => {
    expect(toggleTaskProjectFolder(folder, new Set(['be', 'page']))).toBeNull()
  })
})
