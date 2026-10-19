import { describe, expect, it } from 'vitest'
import type { ProjectGroup } from '../../../../../../shared/project-group-types'
import type { Repo } from '../../../../../../shared/repo-types'
import { getSidebarRowRevealAncestorKeys } from './reveal-ancestors'

const group = (id: string, parentGroupId: string | null = null): ProjectGroup => ({
  id,
  name: id,
  parentPath: `/w/${id}`,
  parentGroupId,
  createdFrom: 'folder-scan',
  tabOrder: 0,
  isCollapsed: false,
  color: null,
  createdAt: 1,
  updatedAt: 1
})
const repo: Repo = {
  id: 'r1',
  path: '/w/root/svc/r1',
  displayName: 'r1',
  badgeColor: 'blue',
  addedAt: 1,
  projectGroupId: 'svc'
}
const args = {
  rowKey: 'repo:r1',
  repoMap: new Map([[repo.id, repo]]),
  projectGroups: [group('root'), group('svc', 'root')]
}

describe('getSidebarRowRevealAncestorKeys with Repositories headers', () => {
  it('opens the Repositories header of each ancestor group that has one', () => {
    expect(
      getSidebarRowRevealAncestorKeys({ ...args, bucketedGroupIds: new Set(['root']) })
    ).toEqual(['project-group:root', 'project-group-repos:root', 'project-group:svc'])
  })

  it('adds no Repositories key for groups without one', () => {
    expect(getSidebarRowRevealAncestorKeys(args)).toEqual([
      'project-group:root',
      'project-group:svc'
    ])
  })
})
