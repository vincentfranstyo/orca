import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
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
  try {
    await useAppStore
      .getState()
      .createFolderWorkspace(
        { projectGroupId: result.group.id, connectionId },
        { runtimeEnvironmentId }
      )
  } catch (err) {
    // Why: the parent workspace is a convenience; its failure must not fail the import.
    toast.warning(
      translate(
        'auto.components.sidebar.createParentFolderWorkspace.failed',
        'Imported, but could not open a workspace for the folder'
      ),
      { description: err instanceof Error ? err.message : String(err) }
    )
  }
}
