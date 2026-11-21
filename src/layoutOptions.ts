import { PROJECT_KEY, readProjectFile, type ProjectFile } from './project'

const KEY = 'atrium-layout-options-v1'

export interface LayoutOption {
  id: string
  savedAt: string
  project: ProjectFile
}

export function readLayoutOptions(): LayoutOption[] {
  const raw = localStorage.getItem(KEY)
  if (!raw) return []
  const data: unknown = JSON.parse(raw)
  if (!Array.isArray(data)) throw new Error('Saved options could not be read.')
  return data.map((entry: LayoutOption) => {
    const project = readProjectFile(JSON.stringify(entry.project))
    if (!project || typeof entry.id !== 'string' || typeof entry.savedAt !== 'string') {
      throw new Error('A saved option could not be read.')
    }
    return { ...entry, project }
  })
}

export function saveLayoutOption(project: ProjectFile): LayoutOption {
  const entry = { id: crypto.randomUUID(), savedAt: new Date().toISOString(), project }
  const options = readLayoutOptions()
  localStorage.setItem(KEY, JSON.stringify([entry, ...options]))
  return entry
}

export function deleteLayoutOption(id: string) {
  localStorage.setItem(KEY, JSON.stringify(readLayoutOptions().filter((option) => option.id !== id)))
}

/** Keep the previous working room recoverable before replacing it. */
export function preserveCurrentProject(current?: ProjectFile) {
  const raw = current ? JSON.stringify(current) : localStorage.getItem(PROJECT_KEY)
  if (!raw) return
  const project = readProjectFile(raw)
  if (!project) throw new Error('The current saved room needs recovery before it can be replaced.')
  const serialized = JSON.stringify(project)
  if (readLayoutOptions().some((option) => JSON.stringify(option.project) === serialized)) return
  saveLayoutOption(project)
}

export interface RecoveryFiles {
  project?: string
  options?: string
}

/** Move invalid data into a recoverable archive before allowing a fresh start. */
export function archiveInvalidStorage() {
  const files: RecoveryFiles = {}
  const project = localStorage.getItem(PROJECT_KEY)
  if (project && !readProjectFile(project)) files.project = project
  try {
    readLayoutOptions()
  } catch {
    files.options = localStorage.getItem(KEY) ?? ''
  }
  if (!Object.keys(files).length) return
  const archiveKey = 'atrium-recovery-v1'
  const archive = JSON.parse(localStorage.getItem(archiveKey) ?? '[]') as unknown
  if (!Array.isArray(archive)) throw new Error('The recovery archive could not be read.')
  localStorage.setItem(archiveKey, JSON.stringify([...archive, { savedAt: new Date().toISOString(), files }]))
  if (files.project) localStorage.removeItem(PROJECT_KEY)
  if (files.options != null) localStorage.removeItem(KEY)
}
