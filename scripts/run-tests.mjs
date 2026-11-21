import { access, readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('../', import.meta.url))
const scopePath = resolve(rootDir, 'scope.json')

async function main() {
  const scope = JSON.parse(await readFile(scopePath, 'utf8'))

  if (!Array.isArray(scope.tests) || scope.tests.length === 0) {
    throw new Error('scope.json must contain a non-empty "tests" array')
  }

  for (const testFile of scope.tests) {
    if (
      typeof testFile !== 'string' ||
      !testFile.startsWith('tests/') ||
      testFile.split('/').includes('..')
    ) {
      throw new Error(`Invalid test path in scope.json: ${testFile}`)
    }

    await access(resolve(rootDir, testFile))
  }

  console.log(`Running ${scope.tests.length} test file(s):`)
  scope.tests.forEach((testFile) => console.log(`  - ${testFile}`))

  const child = spawn(
    'npx',
    ['playwright', 'test', ...scope.tests],
    {
      cwd: rootDir,
      stdio: 'inherit',
    },
  )

  child.on('error', (error) => {
    console.error('Could not start Playwright:', error.message)
    process.exitCode = 1
  })

  child.on('close', (code) => {
    process.exitCode = code ?? 1
  })
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})