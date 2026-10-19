import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as ReactModule from 'react'
import type {
  NestedRepoScanResult,
  ProjectGroupImportResult
} from '../../../../shared/project-group-types'
import type { Repo } from '../../../../shared/repo-types'

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactModule>()
  return {
    ...actual,
    useCallback: <T extends (...args: never[]) => unknown>(fn: T) => fn,
    useRef: <T>(value: T) => ({ current: value })
  }
})

const folderRepo: Repo = {
  id: 'platform',
  path: '/workspace/platform',
  displayName: 'platform',
  badgeColor: '#999999',
  addedAt: 1,
  kind: 'folder'
}

const mocks = vi.hoisted(() => ({
  state: {
    repos: [] as Repo[],
    addNonGitFolder: vi.fn(),
    createFolderWorkspace: vi.fn(),
    closeModal: vi.fn(),
    openModal: vi.fn()
  }
}))

vi.mock('@/store', () => {
  const useAppStore = Object.assign(
    (selector: (state: typeof mocks.state) => unknown) => selector(mocks.state),
    {
      getState: () => mocks.state
    }
  )
  return { useAppStore }
})

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('@/lib/telemetry', () => ({
  track: vi.fn()
}))

import { track } from '@/lib/telemetry'
import { toast } from 'sonner'
import { useAddRepoNestedImportFlow } from './useAddRepoNestedImportFlow'

const scan: NestedRepoScanResult = {
  selectedPath: '/workspace/platform',
  selectedPathKind: 'non_git_folder',
  repos: [{ path: '/workspace/platform/app', displayName: 'app', depth: 1 }],
  truncated: false,
  timedOut: false,
  stopped: false,
  durationMs: 3,
  maxDepth: 3,
  maxRepos: 100,
  timeoutMs: null
}

function useTestAddRepoNestedImportFlow(
  overrides: Partial<Parameters<typeof useAddRepoNestedImportFlow>[0]> = {}
): ReturnType<typeof useAddRepoNestedImportFlow> {
  return useAddRepoNestedImportFlow({
    nestedAttemptId: 'attempt-1',
    nestedScan: scan,
    nestedSelectedPaths: new Set(),
    nestedRuntimeKind: 'local',
    nestedConnectionId: null,
    nestedGroupName: 'platform',
    nestedImportScanId: 'scan-1',
    nestedRuntimeEnvironmentId: null,
    activeRuntimeEnvironmentId: null,
    closeModal: mocks.state.closeModal,
    fetchWorktrees: vi.fn(),
    importNestedRepos: vi.fn<() => Promise<ProjectGroupImportResult | null>>(),
    getNestedRepoRuntimeKind: vi.fn(() => 'local' as const),
    onGitRepoReady: vi.fn(),
    setIsAdding: vi.fn(),
    ...overrides
  })
}

describe('useAddRepoNestedImportFlow open folder fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.state.repos = []
    mocks.state.addNonGitFolder.mockResolvedValue(folderRepo)
  })

  it('opens the scanned local root through the existing non-git folder flow', async () => {
    const setIsAdding = vi.fn()
    const { handleOpenNestedRootFolder } = useTestAddRepoNestedImportFlow({ setIsAdding })

    await handleOpenNestedRootFolder()

    expect(mocks.state.addNonGitFolder).toHaveBeenCalledWith('/workspace/platform', {
      runtimeEnvironmentId: null
    })
    expect(mocks.state.closeModal).toHaveBeenCalledTimes(1)
    expect(setIsAdding).toHaveBeenNthCalledWith(1, true)
    expect(setIsAdding).toHaveBeenNthCalledWith(2, false)
  })

  it('keeps runtime folder opens on the runtime that produced the scan', async () => {
    const { handleOpenNestedRootFolder } = useTestAddRepoNestedImportFlow({
      activeRuntimeEnvironmentId: 'env-1',
      nestedRuntimeEnvironmentId: 'env-1'
    })

    await handleOpenNestedRootFolder()

    expect(mocks.state.addNonGitFolder).toHaveBeenCalledWith('/workspace/platform', {
      runtimeEnvironmentId: 'env-1'
    })
  })

  it('names the folder project after the edited group name', async () => {
    const { handleOpenNestedRootFolder } = useTestAddRepoNestedImportFlow({
      nestedGroupName: '  inf-오케스트레이터  '
    })

    await handleOpenNestedRootFolder()

    expect(mocks.state.addNonGitFolder).toHaveBeenCalledWith('/workspace/platform', {
      runtimeEnvironmentId: null,
      displayName: 'inf-오케스트레이터'
    })
  })

  it('leaves host basename naming alone when the group name is untouched', async () => {
    const { handleOpenNestedRootFolder } = useTestAddRepoNestedImportFlow({
      nestedGroupName: '  platform  '
    })

    await handleOpenNestedRootFolder()

    expect(mocks.state.addNonGitFolder).toHaveBeenCalledWith('/workspace/platform', {
      runtimeEnvironmentId: null
    })
  })

  it('carries the edited group name into the SSH folder confirmation', async () => {
    const { handleOpenNestedRootFolder } = useTestAddRepoNestedImportFlow({
      nestedConnectionId: 'ssh-builder',
      nestedRuntimeKind: 'ssh',
      nestedGroupName: 'inf-오케스트레이터'
    })

    await handleOpenNestedRootFolder()

    expect(mocks.state.openModal).toHaveBeenCalledWith(
      'confirm-non-git-folder',
      expect.objectContaining({ displayName: 'inf-오케스트레이터' })
    )
  })

  it('tracks the open-as-folder recovery action with zero selection', async () => {
    const { handleOpenNestedRootFolder } = useTestAddRepoNestedImportFlow()

    await handleOpenNestedRootFolder()

    expect(track).toHaveBeenCalledWith(
      'add_repo_nested_import_action',
      expect.objectContaining({
        action: 'open_as_folder',
        surface: 'sidebar',
        runtime_kind: 'local',
        found_count: 1,
        selected_count: 0
      })
    )
  })

  it('uses the existing SSH non-git folder confirmation for SSH scans', async () => {
    const { handleOpenNestedRootFolder } = useTestAddRepoNestedImportFlow({
      nestedConnectionId: 'ssh-builder',
      nestedRuntimeKind: 'ssh'
    })

    await handleOpenNestedRootFolder()

    expect(mocks.state.addNonGitFolder).not.toHaveBeenCalled()
    expect(mocks.state.closeModal).toHaveBeenCalledTimes(1)
    expect(mocks.state.openModal).toHaveBeenCalledWith('confirm-non-git-folder', {
      folderPath: '/workspace/platform',
      connectionId: 'ssh-builder',
      runtimeEnvironmentId: null
    })
  })

  it('keeps SSH import and completion pinned when repo hydration is missing', async () => {
    const importedRepo: Repo = {
      ...folderRepo,
      id: 'ssh-app',
      path: scan.repos[0].path,
      kind: 'git',
      connectionId: 'ssh-builder'
    }
    const importNestedRepos = vi.fn().mockResolvedValue({
      projects: [
        { path: importedRepo.path, projectId: importedRepo.id, status: 'imported' as const }
      ],
      importedCount: 1,
      alreadyKnownCount: 0,
      failedCount: 0
    })
    const fetchWorktrees = vi.fn()
    const onGitRepoReady = vi.fn()
    mocks.state.repos = []
    const { handleImportNestedRepos } = useTestAddRepoNestedImportFlow({
      activeRuntimeEnvironmentId: null,
      nestedConnectionId: 'ssh-builder',
      nestedRuntimeEnvironmentId: null,
      nestedRuntimeKind: 'ssh',
      nestedSelectedPaths: new Set([importedRepo.path]),
      importNestedRepos,
      fetchWorktrees,
      onGitRepoReady
    })

    await handleImportNestedRepos('group')

    expect(importNestedRepos).toHaveBeenCalledWith({
      parentPath: scan.selectedPath,
      groupName: 'platform',
      projectPaths: [importedRepo.path],
      connectionId: 'ssh-builder',
      scanId: 'scan-1',
      runtimeEnvironmentId: null,
      mode: 'group'
    })
    expect(fetchWorktrees).toHaveBeenCalledWith(importedRepo.id, {
      requireAuthoritative: true,
      executionHostId: 'ssh:ssh-builder'
    })
    expect(onGitRepoReady).not.toHaveBeenCalled()
  })
})

describe('useAddRepoNestedImportFlow parent folder workspace', () => {
  const group = {
    id: 'g1',
    name: 'platform',
    parentPath: scan.selectedPath,
    parentGroupId: null,
    createdFrom: 'folder-scan' as const,
    tabOrder: 0,
    isCollapsed: false,
    color: null,
    createdAt: 1,
    updatedAt: 1
  }
  const imported = (withGroup: boolean): ProjectGroupImportResult => ({
    ...(withGroup ? { group } : {}),
    projects: [{ path: scan.repos[0].path, projectId: 'app', status: 'imported' }],
    importedCount: 1,
    alreadyKnownCount: 0,
    failedCount: 0
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.state.repos = []
    mocks.state.createFolderWorkspace.mockResolvedValue({ id: 'fw' })
  })

  it('creates a workspace at the group root after a group import', async () => {
    const { handleImportNestedRepos } = useTestAddRepoNestedImportFlow({
      nestedSelectedPaths: new Set([scan.repos[0].path]),
      importNestedRepos: vi.fn().mockResolvedValue(imported(true))
    })

    await handleImportNestedRepos('group')

    expect(mocks.state.createFolderWorkspace).toHaveBeenCalledWith(
      { projectGroupId: 'g1', connectionId: null },
      { runtimeEnvironmentId: null }
    )
  })

  it('creates nothing for a separate import or a result without a group', async () => {
    for (const [mode, withGroup] of [
      ['separate', true],
      ['group', false]
    ] as const) {
      const { handleImportNestedRepos } = useTestAddRepoNestedImportFlow({
        nestedSelectedPaths: new Set([scan.repos[0].path]),
        importNestedRepos: vi.fn().mockResolvedValue(imported(withGroup))
      })
      await handleImportNestedRepos(mode)
    }

    expect(mocks.state.createFolderWorkspace).not.toHaveBeenCalled()
  })

  it('keeps the import successful and warns when the workspace cannot be created', async () => {
    mocks.state.createFolderWorkspace.mockRejectedValue(new Error('path missing'))
    const fetchWorktrees = vi.fn()
    const { handleImportNestedRepos } = useTestAddRepoNestedImportFlow({
      nestedSelectedPaths: new Set([scan.repos[0].path]),
      importNestedRepos: vi.fn().mockResolvedValue(imported(true)),
      fetchWorktrees
    })

    await handleImportNestedRepos('group')

    expect(fetchWorktrees).toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.warning).toHaveBeenCalledWith(expect.any(String), {
      description: 'path missing'
    })
  })
})
