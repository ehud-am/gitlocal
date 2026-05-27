import { copyFileSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const mode = process.argv[2]
const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '../..')
const githubReadme = resolve(root, 'README.md')
const npmReadme = resolve(root, 'packaging/npm/README.md')
const backupReadme = resolve(root, '.npm-readme-backup.md')

if (mode === 'prepack') {
  if (!existsSync(npmReadme)) {
    throw new Error(`npm README not found: ${npmReadme}`)
  }
  if (!existsSync(backupReadme)) {
    copyFileSync(githubReadme, backupReadme)
  }
  copyFileSync(npmReadme, githubReadme)
} else if (mode === 'postpack') {
  if (existsSync(backupReadme)) {
    copyFileSync(backupReadme, githubReadme)
    rmSync(backupReadme, { force: true })
  }
} else {
  throw new Error('Usage: node packaging/npm/use-npm-readme.mjs prepack|postpack')
}
