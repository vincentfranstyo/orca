import React, { useMemo } from 'react'
import { Check, FolderTree } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import type { TaskProjectPickerGroup } from './task-page-default-repo-selection'
import {
  getTaskProjectFolders,
  isTaskProjectFolderSelected,
  toggleTaskProjectFolder
} from './task-project-source-combobox-model'

/** One row per imported folder group: toggles all of its child projects at once. */
export default function TaskProjectFolderRows({
  groups,
  selected,
  onChange
}: {
  groups: readonly TaskProjectPickerGroup[]
  selected: ReadonlySet<string>
  onChange: (next: ReadonlySet<string>) => void
}): React.JSX.Element | null {
  const projectGroups = useAppStore((s) => s.projectGroups)
  const folders = useMemo(
    () => getTaskProjectFolders(groups, projectGroups),
    [groups, projectGroups]
  )
  if (folders.length === 0) {
    return null
  }
  return (
    <div className="border-b border-border">
      {folders.map((folder) => {
        const folderSelected = isTaskProjectFolderSelected(folder, selected)
        return (
          <button
            key={folder.id}
            type="button"
            onClick={() => {
              const next = toggleTaskProjectFolder(folder, selected)
              if (next) {
                onChange(next)
              }
            }}
            onMouseDown={(event) => event.preventDefault()}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Check
              className={cn(
                'size-3 text-muted-foreground',
                folderSelected ? 'opacity-70' : 'opacity-0'
              )}
            />
            <FolderTree className="size-3 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{folder.name}</span>
            <span className="text-[10px] text-muted-foreground">{folder.members.length}</span>
          </button>
        )
      })}
    </div>
  )
}
