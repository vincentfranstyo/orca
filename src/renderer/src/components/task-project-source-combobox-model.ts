import { getRepoExecutionHostId } from '../../../shared/execution-host'
import type { Repo } from '../../../shared/repo-types'
import type { ProjectGroup } from '../../../shared/project-group-types'
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

/** A project group (imported folder) whose child projects can be toggled together. */
export type TaskProjectFolder = {
  id: string
  name: string
  members: TaskProjectPickerGroup[]
}

export function getTaskProjectFolders(
  groups: readonly TaskProjectPickerGroup[],
  projectGroups: readonly Pick<ProjectGroup, 'id' | 'name'>[]
): TaskProjectFolder[] {
  return projectGroups.flatMap((projectGroup) => {
    const members = groups.filter((group) =>
      group.sources.some((source) => source.projectGroupId === projectGroup.id)
    )
    return members.length > 0 ? [{ id: projectGroup.id, name: projectGroup.name, members }] : []
  })
}

export function isTaskProjectFolderSelected(
  folder: TaskProjectFolder,
  selected: ReadonlySet<string>
): boolean {
  return folder.members.every((group) => isTaskProjectGroupSelected(group, selected))
}

/** Selects every folder member, or deselects them all when already selected.
 *  Returns null when deselecting would leave no project selected. */
export function toggleTaskProjectFolder(
  folder: TaskProjectFolder,
  selected: ReadonlySet<string>
): Set<string> | null {
  const next = new Set(selected)
  if (isTaskProjectFolderSelected(folder, selected)) {
    for (const group of folder.members) {
      for (const source of group.sources) {
        next.delete(source.id)
      }
    }
    // Why: task fetches assume at least one selected project.
    return next.size > 0 ? next : null
  }
  for (const group of folder.members) {
    if (!isTaskProjectGroupSelected(group, next)) {
      next.add(group.repo.id)
    }
  }
  return next
}
