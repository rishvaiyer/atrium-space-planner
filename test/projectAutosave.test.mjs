import assert from 'node:assert/strict'
import test from 'node:test'
import { createProjectAutosave } from '../src/projectAutosave.ts'

test('closing before the debounce saves only the newest edit', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const writes = []
  const save = createProjectAutosave((project) => writes.push(project), () => {})
  save.schedule({ name: 'Previous' })
  save.schedule({ name: 'Last edit' })
  save.flush()
  t.mock.timers.tick(400)
  assert.deepEqual(writes, [{ name: 'Last edit' }])
})

test('a storage failure stays pending and clears after retry succeeds', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const failures = []
  let blocked = true
  const writes = []
  const save = createProjectAutosave((project) => {
    if (blocked) throw new Error('Storage unavailable')
    writes.push(project)
  }, (failed) => failures.push(failed))
  save.schedule({ name: 'My plan' })
  t.mock.timers.tick(400)
  assert.deepEqual(failures, [true])
  blocked = false
  save.flush()
  assert.deepEqual(writes, [{ name: 'My plan' }])
  assert.deepEqual(failures, [true, false])
})

test('reset clears the pending write before the reload event', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const save = createProjectAutosave(() => assert.fail('Reset project was restored'), () => {})
  save.schedule({ name: 'Old plan' })
  save.cancel()
  save.flush()
  t.mock.timers.tick(400)
})
