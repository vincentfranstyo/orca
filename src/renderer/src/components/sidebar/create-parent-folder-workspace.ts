import { useAppStore } from '@/store'
import type { ProjectGroupImportResult } from '../../../../shared/project-group-types'

/** Gives a freshly imported folder group a workspace (terminal) at its root folder. */
export async function createParentFolderWorkspace(
  result: ProjectGroupImportResult,
  connectionId: string | null,
  runtimeEnvironmentId: string | null
): Promise<void> {
  if (!result.group?.parentPath) {
    return
  }
  // Why: the parent workspace is a convenience; its failure must not fail the import.
  await useAppStore
    .getState()
    .createFolderWorkspace(
      { projectGroupId: result.group.id, connectionId },
      { runtimeEnvironmentId }
    )
    .catch(() => null)
}
