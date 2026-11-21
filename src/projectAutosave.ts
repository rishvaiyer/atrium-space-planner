import type { ProjectFile } from './project'

export function createProjectAutosave(
  write: (project: ProjectFile) => void,
  reportFailure: (failed: boolean) => void,
) {
  let pending: ProjectFile | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  function flush() {
    clearTimeout(timer)
    if (!pending) return
    try {
      write(pending)
      pending = undefined
      reportFailure(false)
    } catch {
      // Let a later edit or tab exit retry the pending project.
      reportFailure(true)
    }
  }

  return {
    schedule(project: ProjectFile) {
      pending = project
      clearTimeout(timer)
      timer = setTimeout(flush, 400)
    },
    flush,
    cancel() {
      clearTimeout(timer)
      pending = undefined
    },
  }
}
