import { describe, expect, it } from 'vitest'
import type { FolderWorkspace } from '../folder-workspace-types'
import type { ProjectGroup } from '../project-group-types'
import type { SectionAppendContext } from './group-sections'
import { getProjectGroupHeaderKey, getProjectGroupReposKey } from './group-keys'
import {
  appendProjectGroupSections,
  getProjectGroupOccurrencePaths
} from './project-group-sections'

const group: ProjectGroup = {
  id: 'g1',
  name: 'hamra',
  parentPath: '/w/hamra',
  parentGroupId: null,
  createdFrom: 'folder-scan',
  tabOrder: 0,
  isCollapsed: false,
  color: null,
  createdAt: 1,
  updatedAt: 1
}
const childGroup: ProjectGroup = { ...group, id: 'g2', name: 'nested', parentGroupId: 'g1' }

const folderWorkspace = {
  id: 'f1',
  projectGroupId: 'g1',
  name: 'hamra',
  folderPath: '/w/hamra',
  linkedTask: null,
  comment: '',
  isArchived: false,
  isUnread: false,
  isPinned: false,
  sortOrder: 0,
  lastActivityAt: 0,
  createdAt: 1,
  updatedAt: 1
} satisfies FolderWorkspace

function emit(collapsed: string[], withFolder = true): string[] {
  const result: SectionAppendContext['result'] = []
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: empty orderedGroups never reads the repo/occurrence fields.
  const ctx = { result, collapsedGroups: new Set(collapsed) } as unknown as SectionAppendContext
  appendProjectGroupSections(ctx, {
    orderedGroups: [],
    projectGroups: [group, childGroup],
    folderWorkspaces: withFolder ? [{ folderWorkspace, projectGroup: group }] : [],
    projectOrderBy: 'manual',
    repoOrder: undefined
  })
  return result.map((row) => ('key' in row ? row.key : row.type))
}

const g1 = getProjectGroupHeaderKey('g1')
const g2 = getProjectGroupHeaderKey('g2')
const repos = getProjectGroupReposKey('g1')

describe('appendProjectGroupSections', () => {
  it('puts children in a repos bucket under the parent workspace', () => {
    expect(emit([])).toEqual([g1, 'folder-workspace:f1', repos, g2])
  })

  it('collapsing the repos bucket keeps the parent workspace visible', () => {
    expect(emit([repos])).toEqual([g1, 'folder-workspace:f1', repos])
  })

  it('collapsing the group hides everything', () => {
    expect(emit([g1])).toEqual([g1])
  })

  it('adds no bucket without a parent workspace', () => {
    expect(emit([])).not.toContain(getProjectGroupReposKey('g2'))
    expect(emit([], false)).toEqual([g1, g2])
  })
})

describe('getProjectGroupOccurrencePaths', () => {
  it('routes bucketed group contents through the repos key', () => {
    const paths = getProjectGroupOccurrencePaths([group, childGroup], new Set(['g1']))
    expect(paths.get('g1')).toEqual({ key: repos, parent: { key: g1, parent: undefined } })
    expect(paths.get('g2')?.parent?.key).toBe(repos)
  })
})
