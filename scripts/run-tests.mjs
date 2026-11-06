#!/usr/bin/env node
/**
 * Run every `*.test.ts(x)` file under the app source directories.
 *
 * The old `npm test` hard-coded a list of files, so new tests were silently
 * skipped (safe-notes and psychat-context were missing). Discovery keeps the
 * local gate and CI aligned with the files that actually exist.
 *
 * Extra args are forwarded to `node --test`, e.g.:
 *   npm test -- --test-name-pattern="SIWE"
 */
import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const SEARCH_DIRS = ['lib', 'components', 'app', 'scripts']
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage'])
const TEST_FILE = /\.test\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/

function collectTests(dir, found) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return found
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      collectTests(fullPath, found)
    } else if (TEST_FILE.test(entry.name)) {
      found.push(relative(ROOT, fullPath))
    }
  }
  return found
}

const files = SEARCH_DIRS.flatMap((dir) => collectTests(join(ROOT, dir), [])).sort()

if (files.length === 0) {
  console.error('No *.test.ts(x) files found under: ' + SEARCH_DIRS.join(', '))
  process.exit(1)
}

console.log(`Running ${files.length} test files...`)

const result = spawnSync('tsx', ['--test', ...process.argv.slice(2), ...files], {
  cwd: ROOT,
  stdio: 'inherit',
})

if (result.error) {
  console.error('Could not run tsx:', result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
