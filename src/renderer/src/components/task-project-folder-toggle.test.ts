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
const single = (r: Repo) => ({ projectKey: r.id, repo: r, sources: [r] })
const group = (id: string, parentGroupId: string | null = null, tabOrder = 0) => ({
  id,
  name: id,
  parentGroupId,
  tabOrder
})

const groups = [repo('be', 'g1'), repo('page', 'g1'), repo('other')].map(single)
const [folder] = getTaskProjectFolders(groups, [group('g1'), group('empty')])

describe('task project folder toggle', () => {
  it('builds folders only for groups with members', () => {
    expect(folder.members.map((m) => m.group.repo.id)).toEqual(['be', 'page'])
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

  it('folds nested groups into their top-level folder', () => {
    const folders = getTaskProjectFolders([repo('api', 'svc'), repo('web', 'root')].map(single), [
      group('root'),
      group('svc', 'root')
    ])
    expect(folders.map((f) => f.id)).toEqual(['root'])
    expect(folders[0].members.map((m) => m.group.repo.id)).toEqual(['api', 'web'])
  })

  it('lists a group published twice under one id once, in tab order', () => {
    const folders = getTaskProjectFolders([repo('a', 'g2'), repo('b', 'g1')].map(single), [
      group('g2', null, 2),
      group('g1', null, 1),
      group('g2', null, 2)
    ])
    expect(folders.map((f) => f.id)).toEqual(['g1', 'g2'])
  })

  it('selects the source inside the folder, not the preferred host copy', () => {
    const local = repo('local-copy')
    const remote = repo('remote-copy', 'g1')
    const [f] = getTaskProjectFolders(
      [{ projectKey: 'p', repo: local, sources: [local, remote] }, single(repo('x'))],
      [group('g1')]
    )
    expect([...toggleTaskProjectFolder(f, new Set(['x']))!].sort()).toEqual(['remote-copy', 'x'])
  })
})
