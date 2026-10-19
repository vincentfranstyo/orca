import { getRepoExecutionHostId } from '../../../shared/execution-host'
import type { Repo } from '../../../shared/repo-types'
import type { ProjectGroup } from '../../../shared/project-group-types'
import {
  buildProjectGroupChildIndex,
  collectProjectGroupSubtreeIds,
  getDistinctProjectGroups
} from '../../../shared/project-groups'
import type { TaskProjectPickerGroup } from './task-page-default-repo-selection'

export function selectedTaskProjectGroups(
  groups: readonly TaskProjectPickerGroup[],
  selected: ReadonlySet<string>
): TaskProjectPickerGroup[] {
  return groups.filter((group) => group.sources.some((source) => selected.has(source.id)))
}

export function isTaskProjectGroupSelected(
  group: TaskProjectPickerGroup,
  selected: ReadonlySet<string>
): boolean {
  return group.sources.some((source) => selected.has(source.id))
}

export function getSelectedTaskProjectSource(
  group: TaskProjectPickerGroup,
  selected: ReadonlySet<string>
): Repo {
  return group.sources.find((source) => selected.has(source.id)) ?? group.repo
}

export function hasMultipleTaskProjectHosts(groups: readonly TaskProjectPickerGroup[]): boolean {
  const hostIds = new Set<string>()
  for (const group of groups) {
    for (const source of group.sources) {
      hostIds.add(getRepoExecutionHostId(source))
      if (hostIds.size > 1) {
        return true
      }
    }
  }
  return false
}

export function hasMultipleTaskProjectHostsInGroup(group: TaskProjectPickerGroup): boolean {
  return hasMultipleTaskProjectHosts([group])
}

/** A top-level project group (imported folder) whose projects, nested groups included, toggle together. */
export type TaskProjectFolder = {
  id: string
  name: string
  members: { group: TaskProjectPickerGroup; source: Repo }[]
}

export function getTaskProjectFolders(
  groups: readonly TaskProjectPickerGroup[],
  projectGroups: readonly Pick<ProjectGroup, 'id' | 'name' | 'parentGroupId' | 'tabOrder'>[]
): TaskProjectFolder[] {
  // Why distinct: hosts can publish one group under the same id (#30045).
  const distinct = getDistinctProjectGroups(projectGroups)
  const ids = new Set(distinct.map((group) => group.id))
  const childIndex = buildProjectGroupChildIndex(distinct)
  return distinct
    .filter((group) => !group.parentGroupId || !ids.has(group.parentGroupId))
    .sort((left, right) => left.tabOrder - right.tabOrder)
    .flatMap((root) => {
      const subtree = collectProjectGroupSubtreeIds(childIndex, root.id)
      const members = groups.flatMap((group) => {
        // Why: pick the source that lives in this folder, not the picker's preferred host copy.
        const source = group.sources.find(
          (candidate) => candidate.projectGroupId && subtree.has(candidate.projectGroupId)
        )
        return source ? [{ group, source }] : []
      })
      return members.length > 0 ? [{ id: root.id, name: root.name, members }] : []
    })
}

export function isTaskProjectFolderSelected(
  folder: TaskProjectFolder,
  selected: ReadonlySet<string>
): boolean {
  return folder.members.every(({ group }) => isTaskProjectGroupSelected(group, selected))
}

/** Selects every folder member, or deselects them all when already selected.
 *  Returns null when deselecting would leave no project selected. */
export function toggleTaskProjectFolder(
  folder: TaskProjectFolder,
  selected: ReadonlySet<string>
): Set<string> | null {
  const next = new Set(selected)
  if (isTaskProjectFolderSelected(folder, selected)) {
    for (const { group } of folder.members) {
      for (const source of group.sources) {
        next.delete(source.id)
      }
    }
    // Why: task fetches assume at least one selected project.
    return next.size > 0 ? next : null
  }
  for (const { group, source } of folder.members) {
    if (!isTaskProjectGroupSelected(group, next)) {
      next.add(source.id)
    }
  }
  return next
}
