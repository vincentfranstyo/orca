import { describe, expect, it } from 'vitest'
import type { FolderWorkspace } from '../folder-workspace-types'
import type { ProjectGroup } from '../project-group-types'
import type { SectionAppendContext } from './group-sections'
import { getProjectGroupHeaderKey } from './group-keys'
import { appendProjectGroupSections } from './project-group-sections'

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

function emit(collapsed: string[]): string[] {
  const result: SectionAppendContext['result'] = []
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: empty orderedGroups never reads the repo/occurrence fields.
  const ctx = { result, collapsedGroups: new Set(collapsed) } as unknown as SectionAppendContext
  appendProjectGroupSections(ctx, {
    orderedGroups: [],
    projectGroups: [group, childGroup],
    folderWorkspaces: [{ folderWorkspace, projectGroup: group }],
    projectOrderBy: 'manual',
    repoOrder: undefined
  })
  return result.map((row) => ('key' in row ? row.key : row.type))
}

describe('appendProjectGroupSections', () => {
  it('keeps folder workspaces visible when their group is collapsed', () => {
    expect(emit([getProjectGroupHeaderKey('g1')])).toEqual([
      getProjectGroupHeaderKey('g1'),
      'folder-workspace:f1'
    ])
  })

  it('renders folder workspaces before child groups when expanded', () => {
    expect(emit([])).toEqual([
      getProjectGroupHeaderKey('g1'),
      'folder-workspace:f1',
      getProjectGroupHeaderKey('g2')
    ])
  })
})
